export default {
  routes: [
    {
      method: 'POST',
      path: '/tts',
      handler: 'tts.speak',
      config: {
        auth: false,
      },
    },
  ],
}
