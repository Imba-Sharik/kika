"use client"

import { useLocale, useTranslations } from "next-intl"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import { UserNav } from "./UserNav"
import { ALL_LOCALES, type LocaleCode } from "@/shared/yukai/useLanguage"

const TELEGRAM_URL = 'https://t.me/+O_SNPGI-CGI0ZjUy'
const DOWNLOAD_URL = 'https://github.com/Imba-Sharik/kika/releases/latest/download/Yukai-Setup-x64.exe'

export function Header() {
  const t = useTranslations('nav')
  const locale = useLocale() as LocaleCode
  const router = useRouter()
  const pathname = usePathname()

  function switchLocale(newLocale: LocaleCode) {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0A0A0F]/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          <span className="bg-linear-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
            Yukai
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-5 text-sm text-white/70">
            <Link href="/#pricing" className="hover:text-white transition">
              {t('pricing')}
            </Link>
            <Link href="/#faq" className="hover:text-white transition">
              {t('faq')}
            </Link>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition"
            >
              {t('devchat')}
            </a>
            <Link href="/privacy" className="hover:text-white transition">
              {t('privacy')}
            </Link>
            <Link href="/terms" className="hover:text-white transition">
              {t('terms')}
            </Link>
          </div>

          <span className="hidden md:inline-block h-5 w-px bg-white/10" aria-hidden />

          <div className="flex items-center gap-3">
            <LocalePicker current={locale} onChange={switchLocale} />
            <UserNav />
            <a
              href={DOWNLOAD_URL}
              className="rounded-lg bg-linear-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:shadow-pink-500/50"
            >
              {t('download')}
            </a>
          </div>
        </div>
      </nav>
    </header>
  )
}

function LocalePicker({
  current,
  onChange,
}: {
  current: LocaleCode
  onChange: (l: LocaleCode) => void
}) {
  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value as LocaleCode)}
      className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer focus:outline-none focus:ring-1 focus:ring-pink-400/50"
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
