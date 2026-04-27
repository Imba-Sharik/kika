export default {
  routes: [
    {
      method: 'POST',
      path: '/chat',
      handler: 'chat.stream',
      config: {
        // auth: {} = требует валидный JWT в Authorization: Bearer ...
        // Без него Strapi вернёт 401. Юзер должен быть зарегистрирован.
        auth: {},
      },
    },
  ],
}
