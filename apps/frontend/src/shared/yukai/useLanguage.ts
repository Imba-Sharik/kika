'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { Language } from './persona'

// Должен совпадать с ключом в [apps/frontend/src/app/overlay/page.tsx]
// чтобы выбор юзера в Settings → overlay прокидывался на лендинг и обратно.
const LANGUAGE_KEY = 'kika:overlay:language'

/**
 * Явно сохранить выбор языка. Используется в language toggle в Header,
 * чтобы клик по "RU"/"EN" сразу записал предпочтение перед навигацией.
 * Без этого юзер на /en, кликая "RU", пойдёт на / — но useLanguage прочитает
 * localStorage 'en' и оставит английский.
 */
export function setLanguagePreference(lang: Language) {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang)
  } catch {}
}

/**
 * Определение языка на client-side.
 *
 * Приоритет:
 * 1. Pathname `/en` — явный сигнал "юзер хочет английский здесь и сейчас".
 *    Перебивает localStorage чтобы не оставаться в RU когда юзер кликнул EN-ссылку.
 * 2. localStorage — если юзер явно выбрал в Settings overlay'я
 * 3. По хосту: ru.yukai.app → ru, yukai.app → en
 * 4. Fallback на navigator.language (для localhost / preview-доменов)
 */
export function useLanguage(): Language {
  const pathname = usePathname()
  const [language, setLanguage] = useState<Language>('ru')

  useEffect(() => {
    // Path-based override — явный сигнал, юзер сам тапнул "EN".
    // Сохраняем в localStorage чтобы /login после /en тоже остался EN.
    if (pathname?.startsWith('/en')) {
      setLanguage('en')
      try {
        localStorage.setItem(LANGUAGE_KEY, 'en')
      } catch {}
      return
    }

    // Дальше — read-only детект, БЕЗ автозаписи в localStorage.
    // Запись только при явном выборе юзера (setLanguagePreference из тоггла,
    // Settings overlay'я). Иначе host-default цементируется в localStorage
    // и потом перебивает host-логику если юзер ходит между хостами в одном
    // браузере (например dev → prod).
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY)
      if (saved === 'en' || saved === 'ru') {
        setLanguage(saved)
        return
      }
    } catch {}

    // Host-based default
    if (typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase()
      if (host.startsWith('ru.')) {
        setLanguage('ru')
        return
      }
      if (host === 'yukai.app' || host.endsWith('.vercel.app')) {
        setLanguage('en')
        return
      }
      // localhost / preview — fallback на системную локаль
      const sys = (navigator.language || 'en').toLowerCase()
      setLanguage(sys.startsWith('ru') ? 'ru' : 'en')
    }
  }, [pathname])

  return language
}
