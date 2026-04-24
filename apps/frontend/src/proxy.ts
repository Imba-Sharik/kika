// @/proxy.ts
// Next.js 16+ — защита роутов (замена middleware.ts)
// FSD: слой app (инфраструктура)

export { auth as proxy } from '@/auth';

export const config = {
  matcher: [
    // Защищаем все роуты кроме публичных и системных
    '/((?!api|login|register|tts-test|chat-test|_next/static|_next/image|favicon.ico).*)',
  ],
};
