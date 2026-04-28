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
 * из public/language/. При смене локали сохраняем текущий pathname.
 */
export function LocalePicker({ className }: { className?: string }) {
  const locale = useLocale() as LocaleCode
  const router = useRouter()
  const pathname = usePathname()

  function onChange(newLocale: string) {
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
      <SelectContent className="border-white/10 bg-[#0F0E15] text-white">
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
    return (
      <Image
        src={flagPng}
        alt={code}
        width={20}
        height={20}
        className="h-5 w-5 shrink-0 rounded-full object-cover"
        unoptimized
      />
    )
  }
  // Fallback emoji для en (нет PNG-файла в public/language/)
  return <span className="text-base leading-none">{flag}</span>
}
