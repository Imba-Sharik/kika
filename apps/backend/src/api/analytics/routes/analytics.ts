export default {
  routes: [
    {
      method: 'GET',
      path: '/analytics/summary',
      handler: 'analytics.summary',
      config: {
        // auth: false → Strapi не запускает свою permissions-цепочку.
        // Доступ контролирует policy is-manager (сам проверяет JWT + role).
        auth: false,
        policies: ['global::is-manager'],
      },
    },
  ],
}
