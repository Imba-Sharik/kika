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

/**
 * Перевод юзеров с trial на free тариф через 7 дней. Идемпотентный — обновляет
 * только тех у кого tier='trial' и trial истёк. Платные не трогает.
 * После этого dailyLimitUsd снижается до $0.05 (демо-режим).
 */
const TRIAL_DAYS = 7
const FREE_TIER_LIMIT_USD = 0.05
const DEFAULT_TRIAL_LIMIT_USD = 0.5

/**
 * Backfill для юзеров которые регистрировались ДО ввода quota-системы —
 * у них trial_started_at, subscription_tier, daily_limit_usd = NULL,
 * lifecycle на них не сработал. Без этих полей middleware применяет
 * default 0.5, но UI не показывает trial-countdown.
 *
 * Идемпотентно: апдейтим только тех у кого subscription_tier IS NULL.
 * Trial считаем от текущего момента (а не от createdAt) — даём всем
 * существующим юзерам честные 7 дней с момента введения системы.
 */
async function backfillExistingUsers(strapi: Core.Strapi) {
  try {
    const knex = strapi.db.connection
    const userTable = strapi.db.metadata.get('plugin::users-permissions.user').tableName

    const updated = await knex(userTable)
      .whereNull('subscription_tier')
      .update({
        trial_started_at: new Date(),
        subscription_tier: 'trial',
        daily_limit_usd: DEFAULT_TRIAL_LIMIT_USD,
      })

    if (updated > 0) {
      strapi.log.info(`[backfill] проставлены trial-поля для ${updated} существующих юзеров`)
    }
  } catch (err) {
    strapi.log.warn(`[backfill] ошибка: ${err instanceof Error ? err.message : String(err)}`)
  }
}

async function expireTrials(strapi: Core.Strapi) {
  try {
    const cutoff = new Date(Date.now() - TRIAL_DAYS * 24 * 60 * 60 * 1000)
    const knex = strapi.db.connection
    const userTable = strapi.db.metadata.get('plugin::users-permissions.user').tableName

    const updated = await knex(userTable)
      .where('subscription_tier', 'trial')
      .where('trial_started_at', '<', cutoff)
      .update({
        subscription_tier: 'free',
        daily_limit_usd: FREE_TIER_LIMIT_USD,
      })

    if (updated > 0) {
      strapi.log.info(`[trial-expiry] переведено ${updated} юзеров на free тариф ($${FREE_TIER_LIMIT_USD}/день)`)
    }
  } catch (err) {
    strapi.log.warn(`[trial-expiry] ошибка: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * Идемпотентно создаёт роль Manager (type='manager') если её ещё нет.
 * Менеджер видит /analytics — данные по юзерам и тратам.
 * Назначается super-admin'ом через Strapi admin (Content Manager → User → role).
 */
async function ensureManagerRole(strapi: Core.Strapi) {
  try {
    const existing = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'manager' } })
    if (existing) return

    await strapi.db.query('plugin::users-permissions.role').create({
      data: {
        name: 'Manager',
        description: 'Доступ к /analytics: usage по юзерам, токены, траты',
        type: 'manager',
      },
    })
    strapi.log.info('[bootstrap] создана роль Manager')
  } catch (err) {
    strapi.log.warn(`[bootstrap] ensureManagerRole failed: ${err instanceof Error ? err.message : String(err)}`)
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
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureManagerRole(strapi)
    await backfillExistingUsers(strapi)
    // Первый прогон через 5 минут после старта (даём БД миграциям отработать),
    // дальше — раз в сутки.
    setTimeout(() => cleanupOldUsage(strapi), 5 * 60 * 1000)
    setInterval(() => cleanupOldUsage(strapi), CLEANUP_INTERVAL_MS)
    // Trial-expiry — раз в 6 часов (быстрее реагируем на истёкшие триалы)
    setTimeout(() => expireTrials(strapi), 5 * 60 * 1000)
    setInterval(() => expireTrials(strapi), 6 * 60 * 60 * 1000)
  },
}
