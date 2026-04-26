export default {
  routes: [
    {
      method: 'POST',
      path: '/recognize-music',
      handler: 'recognize-music.recognize',
      config: { auth: false },
    },
  ],
}
