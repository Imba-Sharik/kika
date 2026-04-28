'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { ALL_LOCALES, type LocaleCode } from '@/shared/yukai/useLanguage'

/**
 * Dropdown переключатель локали. Использует useRouter из @/i18n/navigation
 * чтобы при смене locale сохранить текущий pathname.
 */
export function LocalePicker({ className }: { className?: string }) {
  const locale = useLocale() as LocaleCode
  const router = useRouter()
  const pathname = usePathname()

  function onChange(newLocale: LocaleCode) {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <select
      value={locale}
      onChange={(e) => onChange(e.target.value as LocaleCode)}
      className={
        className ??
        'rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-pink-400/50'
      }
      aria-label="Language"
    >
      {ALL_LOCALES.map((l) => (
        <option key={l.code} value={l.code} className="bg-[#0F0E15] text-white">
          {l.short} {l.label}
        </option>
      ))}
    </select>
  )
}
