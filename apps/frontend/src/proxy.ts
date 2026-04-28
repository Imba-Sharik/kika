// Next.js 16 — proxy.ts (бывший middleware.ts).
// Делегирует на next-intl middleware: разруливает /ja, /ko, /ru, /de, /fr, /pt
// URL-префиксы; для /en (default) префикса нет (localePrefix: 'as-needed').

import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Все роуты КРОМЕ api/, _next/, статики и файлов с расширением.
  // /api/auth/* и т.д. не должны проходить через i18n-middleware.
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
