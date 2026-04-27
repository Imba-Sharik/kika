"use client"

import Link from "next/link"
import { UserNav } from "./UserNav"
import { setLanguagePreference, useLanguage } from "@/shared/yukai/useLanguage"
import { t } from "@/shared/yukai/i18n"

const TELEGRAM_URL = 'https://t.me/+O_SNPGI-CGI0ZjUy'
const DOWNLOAD_URL = 'https://github.com/Imba-Sharik/kika/releases/latest/download/Yukai-Setup-x64.exe'

export function Header() {
  const lang = useLanguage()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0A0A0F]/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          <span className="bg-linear-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
            Yukai
          </span>
        </Link>

        <div className="flex items-center gap-6">
          {/* Группа 1: навигация */}
          <div className="hidden md:flex items-center gap-5 text-sm text-white/70">
            <Link href="/#pricing" className="hover:text-white transition">
              {t(lang, 'nav.pricing')}
            </Link>
            <Link href="/#faq" className="hover:text-white transition">
              {t(lang, 'nav.faq')}
            </Link>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition"
            >
              {t(lang, 'nav.devchat')}
            </a>
            <Link href="/privacy" className="hover:text-white transition">
              {t(lang, 'nav.privacy')}
            </Link>
            <Link href="/terms" className="hover:text-white transition">
              {t(lang, 'nav.terms')}
            </Link>
          </div>

          {/* Разделитель */}
          <span className="hidden md:inline-block h-5 w-px bg-white/10" aria-hidden />

          {/* Группа 2: язык + auth + CTA */}
          <div className="flex items-center gap-3">
            <Link
              href={lang === 'en' ? '/' : '/en'}
              onClick={() => setLanguagePreference(lang === 'en' ? 'ru' : 'en')}
              className="text-sm text-white/50 hover:text-white transition"
              title={lang === 'en' ? 'Русский' : 'English'}
            >
              {lang === 'en' ? 'RU' : 'EN'}
            </Link>
            <UserNav />
            <a
              href={DOWNLOAD_URL}
              className="rounded-lg bg-linear-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:shadow-pink-500/50"
            >
              {t(lang, 'nav.download')}
            </a>
          </div>
        </div>
      </nav>
    </header>
  )
}
