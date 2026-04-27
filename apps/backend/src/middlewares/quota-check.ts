import type { Core } from '@strapi/strapi'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Middleware проверки дневной квоты. Запускается ПЕРЕД AI-контроллерами.
 * Считает сумму cost_usd за сегодня (UTC) и сравнивает с user.dailyLimitUsd.
 *
 * Если лимит превышен — 429 с метаданными (spent, limit, resetsAt).
 * Если auth не пройден (нет ctx.state.user) — пропускаем, дальше отвалит
 * сам auth: {}.
 *
 * Использовать в route config:
 *   middlewares: ['global::quota-check']
 */
export default (_config: any, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    const user = ctx.state.user
    if (!user?.id) {
      // Нет JWT → пусть auth:{} обработает (вернёт 401/403)
      return next()
    }

    // Paid юзеру с активной подпиской квота не применяется (если tier=paid).
    // Сейчас все новые на 'trial', через 7 дней cron переключит на 'free'.
    // 'paid' — будущее (после интеграции NOWPayments/etc).
    const limit = Number(user.dailyLimitUsd ?? 0.5)
    if (limit <= 0) {
      ctx.status = 429
      ctx.body = quotaError(0, 0)
      return
    }

    const startOfToday = new Date()
    startOfToday.setUTCHours(0, 0, 0, 0)
    const resetsAt = new Date(startOfToday.getTime() + DAY_MS)

    const knex = strapi.db.connection
    const usageTable = strapi.db.metadata.get('api::usage.usage').tableName

    const row: any = await knex(usageTable)
      .where('user_id', user.id)
      .where('created_at', '>=', startOfToday)
      .sum({ total: 'cost_usd' })
      .first()

    const spent = Number(row?.total || 0)

    if (spent >= limit) {
      ctx.status = 429
      ctx.body = quotaError(spent, limit, resetsAt)
      return
    }

    // Прокидываем в state — контроллер может отрендерить остаток в response
    // headers если захочет. Сейчас не используем.
    ctx.state.quota = { spent, limit, resetsAt }

    await next()
  }
}

function quotaError(spent: number, limit: number, resetsAt?: Date) {
  return {
    error: {
      status: 429,
      name: 'QuotaExceeded',
      message: `Дневной лимит $${limit.toFixed(2)} исчерпан. Сбросится в 00:00 UTC.`,
      details: {
        spent: Number(spent.toFixed(4)),
        limit,
        resetsAt: resetsAt?.toISOString(),
      },
    },
  }
}
