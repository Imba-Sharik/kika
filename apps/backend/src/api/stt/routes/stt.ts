export default {
  routes: [
    {
      method: 'POST',
      path: '/stt',
      handler: 'stt.transcribe',
      config: {
        auth: {},
      },
    },
  ],
}
