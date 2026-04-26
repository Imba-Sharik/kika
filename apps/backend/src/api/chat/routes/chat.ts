export default {
  routes: [
    {
      method: 'POST',
      path: '/chat',
      handler: 'chat.stream',
      config: {
        auth: false, // TODO: включить is-authenticated после миграции клиента
      },
    },
  ],
}
