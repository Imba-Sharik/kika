export default {
  routes: [
    {
      method: 'GET',
      path: '/img',
      handler: 'img.proxy',
      // Public — используется в <img src=...>, браузер не шлёт JWT-заголовки
       // на img-тег. Защита: только для известных image-URL Unsplash через
      // unsplash-эндпоинт, который сам уже за auth.
      config: { auth: false },
    },
  ],
}
