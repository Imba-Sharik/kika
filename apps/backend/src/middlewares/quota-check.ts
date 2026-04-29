import type { Core } from '@strapi/strapi'

const DAY_MS = 24 * 60 * 60 * 1000
const TRIAL_DAYS = 7

/**
 * Middleware проверки доступа к AI-эндпоинтам. Запускается ПЕРЕД AI-контроллерами.
 *
 * Цепочка проверок:
 *   1. Аутентификация (если нет — пропускаем, auth:{} вернёт 401/403)
 *   2. Subscription gate — блокирует если trial закончился или paid просрочен (402)
 *   3. Дневной квота-лимит (429 если превышен)
 *
 * Tier semantics:
 *   - 'trial' — 7 дней с trialStartedAt. После — 402 TrialExpired.
 *   - 'paid'  — доступ пока subscriptionUntil > now. Иначе 402 SubscriptionExpired.
 *   - 'free'  — admin-выданный free-доступ без срока (промо/staff). Только daily-limit.
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

    // === Subscription gate ===
    const tier = user.subscriptionTier ?? 'trial'
    const now = Date.now()

    if (tier === 'trial') {
      if (!user.trialStartedAt) {
        // На случай старых юзеров без trialStartedAt — считаем что только что начали
        ctx.status = 402
        ctx.body = subscriptionError('TrialNotStarted', 'Trial не активирован — обратись в поддержку')
        return
      }
      const trialEndsAt = new Date(user.trialStartedAt).getTime() + TRIAL_DAYS * DAY_MS
      if (now > trialEndsAt) {
        ctx.status = 402
        ctx.body = subscriptionError(
          'TrialExpired',
          'Trial закончился — оформи подписку чтобы продолжить',
          { trialEndedAt: new Date(trialEndsAt).toISOString() },
        )
        return
      }
    } else if (tier === 'paid') {
      if (!user.subscriptionUntil || new Date(user.subscriptionUntil).getTime() < now) {
        ctx.status = 402
        ctx.body = subscriptionError(
          'SubscriptionExpired',
          'Подписка истекла — продли чтобы продолжить',
          { expiredAt: user.subscriptionUntil ?? null },
        )
        return
      }
    }
    // tier === 'free' — без проверок subscription, только daily-limit ниже

    // === Daily quota ===
    const limit = Number(user.dailyLimitUsd ?? 0.5)
    if (limit <= 0) {
      ctx.status = 429
      ctx.body = quotaError(0, 0)
      return
    }

    const startOfToday = new Date()
    startOfToday.setUTCHours(0, 0, 0, 0)
    const resetsAt = new Date(startOfToday.getTime() + DAY_MS)

    // Используем Strapi query API — он сам разруливает связи через join-table.
    // Raw knex по `usages.user_id` не работает: в Strapi 5 связи живут
    // в отдельной таблице usages_user_links.
    const usages = await strapi.db.query('api::usage.usage').findMany({
      where: {
        user: user.id,
        createdAt: { $gte: startOfToday },
      },
      select: ['costUsd'],
    })
    const spent = usages.reduce((s: number, u: any) => s + Number(u.costUsd || 0), 0)

    if (spent >= limit) {
      ctx.status = 429
      ctx.body = quotaError(spent, limit, resetsAt)
      return
    }

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

function subscriptionError(name: string, message: string, details: Record<string, unknown> = {}) {
  return {
    error: {
      status: 402,
      name,
      message,
      details,
    },
  }
}
