import { defineRouting } from 'next-intl/routing'

/**
 * Список локалей и стратегия URL.
 *
 * localePrefix: 'as-needed' — дефолтная локаль (en) идёт без префикса,
 * остальные — с префиксом /ja, /ru, /de и т.д.
 *
 * Примеры:
 *   yukai.app/        → en (без префикса)
 *   yukai.app/ja      → японский
 *   yukai.app/ru      → русский
 *   ru.yukai.app/     → редирект на /ru через middleware (host-detect)
 */
export const routing = defineRouting({
  locales: ['en', 'ru', 'ja', 'ko', 'zh', 'de', 'fr', 'pt', 'es'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  // URL — единственный source of truth для локали. Без этого middleware
  // читает Accept-Language header / NEXT_LOCALE cookie и может редиректить
  // обратно на старую локаль, ломая router.replace при ручной смене.
  localeDetection: false,
})

export type Locale = (typeof routing.locales)[number]
