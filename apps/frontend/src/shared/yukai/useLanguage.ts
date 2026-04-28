'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'

/**
 * Утилиты для UI-локализации. Реальный хук получения локали — useLocale()
 * из next-intl напрямую. Здесь только helpers вокруг.
 */

const LANGUAGE_KEY = 'kika:overlay:language'

/**
 * Сохранить выбор языка явно в localStorage. URL остаётся source-of-truth,
 * но localStorage помогает overlay выбирать voice/protocol при первом
 * запуске когда ещё нет URL-локали.
 */
export function setLanguagePreference(lang: string) {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang)
  } catch {}
}

/**
 * Полный список локалей с label'ами и флагами для UI language picker.
 */
export const ALL_LOCALES = [
  { code: 'en', label: 'English', short: 'EN', flag: '🇺🇸', flagPng: '/language/EN1.png' },
  { code: 'ja', label: '日本語', short: 'JA', flag: '🇯🇵', flagPng: '/language/JP.png' },
  { code: 'ko', label: '한국어', short: 'KO', flag: '🇰🇷', flagPng: '/language/KR.png' },
  { code: 'zh', label: '中文', short: 'ZH', flag: '🇨🇳', flagPng: '/language/CN.png' },
  { code: 'de', label: 'Deutsch', short: 'DE', flag: '🇩🇪', flagPng: '/language/DE.png' },
  { code: 'ru', label: 'Русский', short: 'RU', flag: '🇷🇺', flagPng: '/language/RU.png' },
  { code: 'fr', label: 'Français', short: 'FR', flag: '🇫🇷', flagPng: '/language/FR.png' },
  { code: 'pt', label: 'Português', short: 'PT', flag: '🇧🇷', flagPng: '/language/BR.png' },
  { code: 'es', label: 'Español', short: 'ES', flag: '🇪🇸', flagPng: '/language/ES.png' },
] as const

export type LocaleCode = (typeof ALL_LOCALES)[number]['code']

/**
 * Хук для language picker — текущая локаль + функция переключения через router.
 * router.replace меняет URL и реактивно обновляет NextIntlClientProvider.
 */
export function useLocaleSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const current = useLocale() as LocaleCode

  function switchTo(newLocale: LocaleCode) {
    setLanguagePreference(newLocale)
    router.replace(pathname, { locale: newLocale })
  }

  return { current, switchTo }
}
