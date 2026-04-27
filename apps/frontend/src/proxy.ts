// @/proxy.ts
// Next.js 16+ — защита роутов (замена middleware.ts)
// FSD: слой app (инфраструктура)

export { auth as proxy } from '@/auth';

export const config = {
  // Защищаем только /overlay — там идёт работа Yukai и тратятся AI-запросы.
  // Лендинг, login, register, api/* — публичные.
  matcher: ['/overlay/:path*'],
};
