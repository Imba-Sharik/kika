// @/proxy.ts
// Next.js 16+ — защита роутов (замена middleware.ts)
// FSD: слой app (инфраструктура)

export { auth as proxy } from '@/auth';

export const config = {
  // /overlay сознательно публичный — Electron-юзер должен сразу видеть Юкай,
  // а внутри overlay есть inline AuthGateBubble (паттерн онбординг-tooltip'а),
  // которая просит логин/регистрацию рядом с персонажем. AI-вызовы и так
  // защищены на бэке (Strapi 403 без JWT). Server-side redirect ломает UX
  // только что установленного приложения.
  // Сейчас гейтить нечего — все public-страницы доступны анонимам.
  matcher: [],
};
