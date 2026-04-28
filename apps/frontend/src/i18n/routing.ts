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
  locales: ['en', 'ru', 'ja', 'ko', 'de', 'fr', 'pt'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})

export type Locale = (typeof routing.locales)[number]
