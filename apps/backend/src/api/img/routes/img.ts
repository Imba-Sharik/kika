export default {
  routes: [
    {
      method: 'GET',
      path: '/img',
      handler: 'img.proxy',
      config: { auth: false },
    },
  ],
}
