// Демо-эндпоинты для лендинга /vkusvill (TPM-портфолио для ТехВилл).
// Открыты без auth: рекрутёры смотрят без логина. Защищены узкими system
// prompt'ами, тайтким maxOutputTokens и валидацией длины входа.
export default {
  routes: [
    {
      method: 'POST',
      path: '/vkusvill/parse-prefs',
      handler: 'vkusvill.parsePrefs',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/vkusvill/recipe-search',
      handler: 'vkusvill.recipeSearch',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/vkusvill/companion-chat',
      handler: 'vkusvill.companionChat',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/vkusvill/say',
      handler: 'vkusvill.say',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/vkusvill/banner',
      handler: 'vkusvill.banner',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/vkusvill/photo-cart',
      handler: 'vkusvill.photoCart',
      config: {
        auth: false,
      },
    },
  ],
}
