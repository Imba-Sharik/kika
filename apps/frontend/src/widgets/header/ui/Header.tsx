"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { UserNav } from "./UserNav"
import { LocalePicker } from "./LocalePicker"

const TELEGRAM_URL = 'https://t.me/+O_SNPGI-CGI0ZjUy'
const DISCORD_URL = 'https://discord.gg/RUqPNvBNV'
const DOWNLOAD_URL = 'https://github.com/Imba-Sharik/kika/releases/latest/download/Yukai-Setup-x64.exe'

function TelegramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
    </svg>
  )
}

function DiscordIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}

export function Header() {
  const t = useTranslations('nav')

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
              title={t('devchat')}
              aria-label="Telegram"
              className="hover:text-white transition"
            >
              <TelegramIcon />
            </a>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Discord"
              aria-label="Discord"
              className="hover:text-white transition"
            >
              <DiscordIcon />
            </a>
          </div>

          <span className="hidden md:inline-block h-5 w-px bg-white/10" aria-hidden />

          <div className="flex items-center gap-3">
            <LocalePicker />
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

