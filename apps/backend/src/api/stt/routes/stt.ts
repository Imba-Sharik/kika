export default {
  routes: [
    {
      method: 'POST',
      path: '/stt',
      handler: 'stt.transcribe',
      config: {
        auth: {},
        middlewares: ['global::quota-check'],
      },
    },
  ],
}
