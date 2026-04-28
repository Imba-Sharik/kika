'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import type { Language } from './persona'

/**
 * BRIDGE: старые компоненты используют `useLanguage()` + `t(lang, key)` из
 * shared/yukai/i18n.ts с типом Language = 'ru' | 'en'. Новые компоненты
 * используют `useTranslations()` из next-intl.
 *
 * Этот хук маппит next-intl locale → старый Language. Для /ru возвращает 'ru',
 * для всего остального ('en' | 'ja' | 'ko' | 'de' | 'fr' | 'pt') — 'en'.
 *
 * После полной миграции на next-intl этот файл будет удалён.
 */
export function useLanguage(): Language {
  const locale = useLocale()
  return locale === 'ru' ? 'ru' : 'en'
}

/**
 * Программный switch языка. Переход на /ru или /en и т.д. — middleware next-intl
 * переключит локаль. localStorage больше не нужен — URL это source of truth.
 */
export function setLanguagePreference(_lang: Language) {
  // No-op в bridge-режиме. Реальное переключение происходит через
  // <Link href={pathname} locale="ru" /> или router.replace(pathname, { locale: 'ru' }).
  // Оставляем функцию для backward-compat — старые вызовы из Header не падают.
}

/**
 * Полный список локалей с label'ами для UI language picker.
 * Используется в Header и Settings.
 */
// flag — путь к PNG в public/language/.
// Порядок: en первый (default), потом азиатские языки + европейские, ru
// 3-й с конца (бренд позиционируется как international, ru — один из языков
// а не приоритет).
export const ALL_LOCALES = [
  { code: 'en', label: 'English', short: 'EN', flag: '🇺🇸', flagPng: '/language/EN.png' },
  { code: 'ja', label: '日本語', short: 'JA', flag: '🇯🇵', flagPng: '/language/JP.png' },
  { code: 'ko', label: '한국어', short: 'KO', flag: '🇰🇷', flagPng: '/language/KR.png' },
  { code: 'zh', label: '中文', short: 'ZH', flag: '🇨🇳', flagPng: '/language/CN.png' },
  { code: 'de', label: 'Deutsch', short: 'DE', flag: '🇩🇪', flagPng: '/language/DE.png' },
  { code: 'ru', label: 'Русский', short: 'RU', flag: '🇷🇺', flagPng: '/language/RU.png' },
  { code: 'fr', label: 'Français', short: 'FR', flag: '🇫🇷', flagPng: '/language/FR.png' },
  { code: 'pt', label: 'Português', short: 'PT', flag: '🇧🇷', flagPng: '/language/BR.png' },
] as const

export type LocaleCode = (typeof ALL_LOCALES)[number]['code']

/**
 * Хук для language picker — текущая локаль + функция переключения через router.
 * Использует @/i18n/navigation router'а который умеет менять locale.
 */
export function useLocaleSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const current = useLocale() as LocaleCode

  function switchTo(newLocale: LocaleCode) {
    router.replace(pathname, { locale: newLocale })
  }

  return { current, switchTo }
}
