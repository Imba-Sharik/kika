import type { Core } from '@strapi/strapi'
import crypto from 'node:crypto'

/**
 * Billing через NOWPayments (USDT TRC-20 + другие крипто-валюты).
 *
 * Env vars (Railway):
 *   NOWPAYMENTS_API_KEY        — server-side ключ для создания invoice
 *   NOWPAYMENTS_IPN_SECRET     — HMAC-секрет для верификации webhook'ов
 *   NOWPAYMENTS_PUBLIC_KEY     — клиентский id (на сервере не используется,
 *                                сохранён для возможных future client-flows)
 *   NOWPAYMENTS_PAYOUT_ADDRESS — адрес USDT TRC-20 кошелька
 *   BILLING_PRICE_USD          — цена подписки (default: 9.99)
 *   BILLING_PERIOD_DAYS        — длина периода (default: 30)
 *   URL                        — публичный URL backend (default: api.yukai.app)
 *   FRONTEND_URL               — публичный URL frontend (default: yukai.app)
 *
 * Endpoints:
 *   POST /api/billing/checkout (auth) → создаёт invoice, возвращает {url}
 *   POST /api/billing/webhook (public, HMAC-verified) → активирует подписку
 *   GET  /api/billing/pricing (public) → конфиг для UI
 */

const NP_API = 'https://api.nowpayments.io/v1'

function priceUsd(): number {
  return Number(process.env.BILLING_PRICE_USD ?? 19)
}

function periodDays(): number {
  return Number(process.env.BILLING_PERIOD_DAYS ?? 30)
}

function backendUrl(): string {
  return process.env.URL ?? 'https://api.yukai.app'
}

function frontendUrl(): string {
  return process.env.FRONTEND_URL ?? 'https://yukai.app'
}

/**
 * NOWPayments проверяет HMAC по JSON.stringify(body) с **алфавитно
 * отсортированными** ключами (рекурсивно). Если порядок другой — sig не сойдётся.
 */
function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys)
  if (obj === null || typeof obj !== 'object') return obj
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key])
  }
  return sorted
}

export default {
  /**
   * Создаём NOWPayments invoice для текущего юзера.
   * order_id формата `user_<id>_<ts>` — webhook парсит чтобы найти юзера.
   */
  async checkout(ctx: any) {
    const user = ctx.state.user
    if (!user?.id) return ctx.unauthorized('not authenticated')

    const apiKey = process.env.NOWPAYMENTS_API_KEY
    if (!apiKey) {
      return ctx.internalServerError('billing not configured (NOWPAYMENTS_API_KEY missing)')
    }

    const orderId = `user_${user.id}_${Date.now()}`

    try {
      const res = await fetch(`${NP_API}/invoice`, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_amount: priceUsd(),
          price_currency: 'usd',
          order_id: orderId,
          order_description: `Yukai subscription · ${periodDays()} days`,
          ipn_callback_url: `${backendUrl()}/api/billing/webhook`,
          success_url: `${frontendUrl()}/billing/success`,
          cancel_url: `${frontendUrl()}/billing/cancel`,
          // Юзер сам выберет монету на странице NOWPayments. По умолчанию TRC-20
          // отображается первой (низкая комиссия).
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        return ctx.internalServerError(`nowpayments invoice failed: ${res.status} ${text}`)
      }

      const data = (await res.json()) as { invoice_url?: string; id?: string }
      const invoiceUrl = data.invoice_url
      const invoiceId = data.id
      if (!invoiceUrl) return ctx.internalServerError('nowpayments returned no invoice_url')

      return {
        url: invoiceUrl,
        invoiceId,
        amount: priceUsd(),
        currency: 'USD',
        orderId,
      }
    } catch (e) {
      return ctx.internalServerError(
        `nowpayments error: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
  },

  /**
   * IPN webhook от NOWPayments при изменении статуса оплаты.
   *
   * Header: `x-nowpayments-sig` — HMAC-SHA512 от sortKeys(body) с IPN_SECRET.
   * Body: { payment_id, payment_status, order_id, price_amount, ... }
   *
   * Только `payment_status === 'finished'` активирует подписку. confirming/sending/
   * partially_paid логируем но игнорим (юзер ещё досылает или транза подтверждается).
   */
  async webhook(ctx: any) {
    const strapi = (globalThis as any).strapi as Core.Strapi
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET
    if (!ipnSecret) return ctx.internalServerError('NOWPAYMENTS_IPN_SECRET not set')

    const sig = ctx.request.headers['x-nowpayments-sig']
    if (!sig || typeof sig !== 'string') {
      strapi.log.warn('[billing] webhook missing x-nowpayments-sig')
      return ctx.unauthorized('missing signature')
    }

    const body = ctx.request.body ?? {}
    const sorted = sortObjectKeys(body)
    const expected = crypto
      .createHmac('sha512', ipnSecret)
      .update(JSON.stringify(sorted))
      .digest('hex')

    if (expected !== sig) {
      strapi.log.warn(`[billing] webhook signature mismatch (order=${body.order_id})`)
      return ctx.unauthorized('invalid signature')
    }

    const status = String(body.payment_status ?? '')
    const orderId = String(body.order_id ?? '')

    // Активируем только на финальном confirmed статусе
    if (status !== 'finished') {
      strapi.log.info(`[billing] webhook status=${status} order=${orderId} (not activating)`)
      return { ok: true, ignored: true, status }
    }

    const m = /^user_(\d+)_/.exec(orderId)
    if (!m) {
      strapi.log.error(`[billing] webhook: bad order_id ${orderId}`)
      return ctx.badRequest('bad order_id')
    }
    const userId = Number(m[1])

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: userId },
      select: ['id', 'subscriptionUntil'],
    })
    if (!user) {
      strapi.log.error(`[billing] webhook: user ${userId} not found`)
      return ctx.notFound('user')
    }

    // Накапливаем срок: если подписка ещё активна — продлеваем от её конца
    const now = Date.now()
    const currentUntil = user.subscriptionUntil ? new Date(user.subscriptionUntil).getTime() : 0
    const baseTime = Math.max(now, currentUntil)
    const newUntil = new Date(baseTime + periodDays() * 24 * 60 * 60 * 1000)

    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: userId },
      data: {
        subscriptionTier: 'paid',
        subscriptionUntil: newUntil,
      },
    })

    strapi.log.info(
      `[billing] subscription activated user=${userId} until=${newUntil.toISOString()} order=${orderId}`,
    )
    return { ok: true, until: newUntil.toISOString() }
  },

  /**
   * Конфиг подписки для frontend — цена/период/доступность интеграции.
   */
  async pricing(_ctx: any) {
    return {
      priceUsd: priceUsd(),
      periodDays: periodDays(),
      currency: 'USD',
      configured: !!process.env.NOWPAYMENTS_API_KEY,
    }
  },
}
