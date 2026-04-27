import type { Core } from '@strapi/strapi'

/**
 * Глобальная policy: пускает только юзеров с ролью type='manager'.
 *
 * Сами проверяем JWT и role чтобы не зависеть от Strapi-permissions
 * (route с auth:{} требует ещё и явных permissions в admin для роли).
 * Тут юзер с ролью manager идёт сразу.
 */
export default async (policyContext: any, _config: any, { strapi }: { strapi: Core.Strapi }) => {
  const ctx = policyContext
  const authHeader = ctx.request?.headers?.authorization as string | undefined
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.slice(7).trim()
  if (!token) return false

  try {
    const jwtService: any = strapi.plugin('users-permissions').service('jwt')
    const decoded: any = await jwtService.verify(token)
    if (!decoded?.id) return false

    const user = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: decoded.id }, populate: ['role'] })

    if (!user || user.blocked) return false
    if (user.role?.type !== 'manager') return false

    // Прокидываем юзера в ctx.state — controller сможет читать ctx.state.user
    ctx.state.user = user
    return true
  } catch {
    return false
  }
}
