import type { Core } from '@strapi/strapi'

const DAY_MS = 24 * 60 * 60 * 1000

export default {
  /**
   * Сводка для менеджера: всего юзеров, всего потрачено, разбивка по типам,
   * топ юзеров по стоимости. Используется для дашборда `/analytics`.
   */
  async summary(ctx: any) {
    const strapi = (globalThis as any).strapi as Core.Strapi
    const knex = strapi.db.connection
    const now = Date.now()
    const day7 = new Date(now - 7 * DAY_MS)
    const day30 = new Date(now - 30 * DAY_MS)

    const userTable = strapi.db.metadata.get('plugin::users-permissions.user').tableName
    const usageTable = strapi.db.metadata.get('api::usage.usage').tableName

    // Тотал по юзерам — считаем агрегатом из User counters (быстро).
    // Sum cost и turns за всё время + total users.
    const totalsRow: any = await knex(userTable)
      .select(
        knex.raw('COUNT(*) as users_count'),
        knex.raw('COALESCE(SUM(total_cost_usd), 0) as total_cost'),
        knex.raw('COALESCE(SUM(total_turns_count), 0) as total_turns'),
      )
      .first()

    // Recent — за последние 7/30 дней (берём из raw Usage).
    const recent7Row: any = await knex(usageTable)
      .select(
        knex.raw('COALESCE(SUM(cost_usd), 0) as cost'),
        knex.raw('COUNT(*) as count'),
      )
      .where('created_at', '>=', day7)
      .first()

    const recent30Row: any = await knex(usageTable)
      .select(
        knex.raw('COALESCE(SUM(cost_usd), 0) as cost'),
        knex.raw('COUNT(*) as count'),
      )
      .where('created_at', '>=', day30)
      .first()

    // Разбивка по типу (chat/stt/tts/vision) — за всё время.
    const byTypeRows: any[] = await knex(usageTable)
      .select('type')
      .count('* as count')
      .sum({ totalCost: 'cost_usd' })
      .groupBy('type')
      .orderBy('totalCost', 'desc')

    // Топ-20 юзеров по тратам — из User counters (без сканов Usage).
    const topUsersRows: any[] = await knex(userTable)
      .select('id', 'username', 'email', 'total_cost_usd', 'total_turns_count', 'last_usage_at')
      .orderBy('total_cost_usd', 'desc')
      .limit(20)

    return {
      totals: {
        users: Number(totalsRow.users_count || 0),
        totalCostUsd: Number(totalsRow.total_cost || 0),
        totalTurns: Number(totalsRow.total_turns || 0),
      },
      recent: {
        last7Days: {
          costUsd: Number(recent7Row.cost || 0),
          count: Number(recent7Row.count || 0),
        },
        last30Days: {
          costUsd: Number(recent30Row.cost || 0),
          count: Number(recent30Row.count || 0),
        },
      },
      byType: byTypeRows.map((r) => ({
        type: r.type,
        count: Number(r.count),
        costUsd: Number(r.totalCost ?? r.total_cost ?? 0),
      })),
      topUsers: topUsersRows.map((r) => ({
        id: r.id,
        username: r.username,
        email: r.email,
        totalCostUsd: Number(r.total_cost_usd || 0),
        totalTurnsCount: Number(r.total_turns_count || 0),
        lastUsageAt: r.last_usage_at,
      })),
    }
  },
}
