export default {
  routes: [
    {
      method: 'POST',
      path: '/trace-moe',
      handler: 'trace-moe.identify',
      config: { auth: false },
    },
  ],
}
