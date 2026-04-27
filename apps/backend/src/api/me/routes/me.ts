export default {
  routes: [
    {
      method: 'GET',
      path: '/me/quota',
      handler: 'me.quota',
      config: {
        auth: {},
      },
    },
  ],
}
