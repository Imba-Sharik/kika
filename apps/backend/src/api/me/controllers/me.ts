import type { Core } from '@strapi/strapi'

const DAY_MS = 24 * 60 * 60 * 1000
const TRIAL_DAYS = 7

export default {
  /**
   * Текущая квота юзера: сколько потратил сегодня (UTC), лимит, остаток,
   * trial-статус и до сколько он. Используется виджетом в overlay/Settings.
   */
  async quota(ctx: any) {
    const strapi = (globalThis as any).strapi as Core.Strapi
    const user = ctx.state.user
    if (!user?.id) return ctx.unauthorized('not authenticated')

    const startOfToday = new Date()
    startOfToday.setUTCHours(0, 0, 0, 0)
    const resetsAt = new Date(startOfToday.getTime() + DAY_MS)

    // Strapi query API через relation — раздулирует через join-table
    const usages = await strapi.db.query('api::usage.usage').findMany({
      where: {
        user: user.id,
        createdAt: { $gte: startOfToday },
      },
      select: ['costUsd'],
    })
    const spent = usages.reduce((s: number, u: any) => s + Number(u.costUsd || 0), 0)

    const limit = Number(user.dailyLimitUsd ?? 0.5)
    const remaining = Math.max(0, limit - spent)
    const percentage = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 100

    let trialDaysLeft: number | null = null
    if (user.trialStartedAt && user.subscriptionTier === 'trial') {
      const trialEndsAt = new Date(new Date(user.trialStartedAt).getTime() + TRIAL_DAYS * DAY_MS)
      const msLeft = trialEndsAt.getTime() - Date.now()
      trialDaysLeft = Math.max(0, Math.ceil(msLeft / DAY_MS))
    }

    return {
      spent: Number(spent.toFixed(4)),
      limit,
      remaining: Number(remaining.toFixed(4)),
      percentage,
      resetsAt: resetsAt.toISOString(),
      tier: user.subscriptionTier ?? 'trial',
      trialDaysLeft,
      subscriptionUntil: user.subscriptionUntil ?? null,
    }
  },
}
