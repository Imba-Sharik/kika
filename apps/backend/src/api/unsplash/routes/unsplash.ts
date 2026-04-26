export default {
  routes: [
    {
      method: 'GET',
      path: '/unsplash',
      handler: 'unsplash.search',
      config: { auth: false },
    },
  ],
}
