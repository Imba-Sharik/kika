'use client'

import Image from 'next/image'
import { useLocale } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { usePathname, useRouter } from '@/i18n/navigation'
import { ALL_LOCALES, type LocaleCode } from '@/shared/yukai/useLanguage'

/**
 * Dropdown переключатель локали через shadcn Select. Флаги — PNG-кружки
 * из public/language/.
 *
 * По умолчанию меняет URL через next-intl router (для лендинга — нужно для SEO).
 * Если передан `onLocaleChange` — вызывает только его, без navigation. Это для
 * overlay/Settings где локаль живёт в client-state (мгновенная смена без
 * перезагрузки React-tree).
 */
export function LocalePicker({
  className,
  onLocaleChange,
}: {
  className?: string
  onLocaleChange?: (locale: string) => void
}) {
  const locale = useLocale() as LocaleCode
  const router = useRouter()
  const pathname = usePathname()

  function onChange(newLocale: string) {
    if (onLocaleChange) {
      onLocaleChange(newLocale)
      return
    }
    router.replace(pathname, { locale: newLocale as LocaleCode })
  }

  return (
    <Select value={locale} onValueChange={onChange}>
      <SelectTrigger
        size="sm"
        className={
          className ??
          'h-8 gap-2 rounded-md border-white/10 bg-white/5 px-2 text-xs text-white/70 hover:text-white hover:bg-white/10 focus-visible:ring-pink-400/30'
        }
        aria-label="Language"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        align="end"
        className="border-white/10 bg-[#0F0E15] text-white"
      >
        {ALL_LOCALES.map((l) => (
          <SelectItem
            key={l.code}
            value={l.code}
            className="text-white focus:bg-white/10 focus:text-white"
          >
            <FlagIcon code={l.code} flag={l.flag} flagPng={l.flagPng} />
            <span>{l.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function FlagIcon({
  code,
  flag,
  flagPng,
}: {
  code: string
  flag: string
  flagPng: string | null
}) {
  if (flagPng) {
    // object-cover + размер обёртки 5x5 нормализует флаги с разным внутренним
    // padding'ом — даже если в исходном PNG флаг занимает 70% bbox, обёртка
    // обрежет лишние края и масштабирует под одинаковый круг.
    return (
      <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full">
        <Image
          src={flagPng}
          alt={code}
          fill
          sizes="20px"
          className="object-cover"
          unoptimized
        />
      </span>
    )
  }
  return <span className="text-base leading-none">{flag}</span>
}
