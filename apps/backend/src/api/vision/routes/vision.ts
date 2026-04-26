export default {
  routes: [
    {
      method: 'POST',
      path: '/vision',
      handler: 'vision.describe',
      config: {
        auth: false,
      },
    },
  ],
}
