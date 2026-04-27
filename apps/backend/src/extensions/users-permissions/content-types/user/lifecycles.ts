/**
 * Lifecycle для users-permissions User. Вызывается на каждый CRUD User'а
 * (включая /auth/local/register). Тут проставляем trial-поля для новичков.
 */
export default {
  async beforeCreate(event: any) {
    const data = event.params?.data
    if (!data) return

    // Не перетираем если super-admin/manager создаёт юзера через админку
    // и явно ставит tier='paid' / другой dailyLimit.
    if (data.trialStartedAt === undefined) {
      data.trialStartedAt = new Date()
    }
    if (data.subscriptionTier === undefined) {
      data.subscriptionTier = 'trial'
    }
    if (data.dailyLimitUsd === undefined) {
      data.dailyLimitUsd = 0.5
    }
  },
}
