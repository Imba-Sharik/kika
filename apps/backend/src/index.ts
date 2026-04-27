import type { Core } from '@strapi/strapi'

// Cleanup raw Usage записей старше N дней. User counters остаются вечно —
// они нужны для quota/billing. Запускаем при старте + каждые 24 часа.
const USAGE_RETENTION_DAYS = 90
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000

async function cleanupOldUsage(strapi: Core.Strapi) {
  const cutoff = new Date(Date.now() - USAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  try {
    const deleted = await strapi.db.query('api::usage.usage').deleteMany({
      where: { createdAt: { $lt: cutoff } },
    })
    if (deleted.count > 0) {
      strapi.log.info(`[usage-cleanup] удалено ${deleted.count} записей старше ${USAGE_RETENTION_DAYS} дней`)
    }
  } catch (err) {
    strapi.log.warn(`[usage-cleanup] ошибка: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * Bootstrap — после старта запускаем периодический cleanup старых Usage-логов.
   * setInterval а не Strapi cron — проще и без зависимостей.
   */
  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    // Первый прогон через 5 минут после старта (даём БД миграциям отработать),
    // дальше — раз в сутки.
    setTimeout(() => cleanupOldUsage(strapi), 5 * 60 * 1000)
    setInterval(() => cleanupOldUsage(strapi), CLEANUP_INTERVAL_MS)
  },
}
