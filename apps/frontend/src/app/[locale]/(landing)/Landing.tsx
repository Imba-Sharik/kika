'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { UserNav } from '@/widgets/header/ui/UserNav'
import { LocalePicker } from '@/widgets/header/ui/LocalePicker'

// Эмоции персонажа в hero-блоке. Цикл по 5 секунд — длинно достаточно
// прочесть баббл, коротко чтобы не дать заскучать. 5 эмоций × 5с = 25с круг.
const HERO_EMOTIONS = ['happy', 'excited', 'thinking', 'love', 'wink'] as const

const DOWNLOAD_URL = 'https://github.com/Imba-Sharik/kika/releases/latest/download/Yukai-Setup-x64.exe'
const TELEGRAM_URL = 'https://t.me/+O_SNPGI-CGI0ZjUy'
const DISCORD_URL = 'https://discord.gg/RUqPNvBNV'
const REDDIT_URL = 'https://www.reddit.com/r/YukaiCompanions/'

function TelegramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  )
}

function DiscordIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

function RedditIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  )
}

export default function Landing() {
  const t = useTranslations('landing')
  const tNav = useTranslations('nav')

  // Cross-fade между эмоциями: индекс активной картинки. Все 5 рендерим стопкой,
  // меняем opacity — Next.js Image кэширует уже загруженные, мерцания нет.
  const [emotionIdx, setEmotionIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      setEmotionIdx((i) => (i + 1) % HERO_EMOTIONS.length)
    }, 5000)
    return () => clearInterval(id)
  }, [])
  const bubbleNum = emotionIdx + 1

  return (
    <main className="relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-pink-500/20 blur-[120px]" />
        <div className="absolute right-0 top-[400px] h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[100px]" />
        <div className="absolute left-0 top-[800px] h-[400px] w-[400px] rounded-full bg-pink-500/10 blur-[90px]" />
      </div>

      {/* Navbar */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="bg-linear-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">Yukai</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="#pricing" className="hidden md:inline text-sm text-white/70 hover:text-white transition">{tNav('pricing')}</a>
          <a href="#faq" className="hidden md:inline text-sm text-white/70 hover:text-white transition">{tNav('faq')}</a>
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Telegram"
            title="Telegram"
            className="hidden md:inline text-white/70 hover:text-white transition"
          >
            <TelegramIcon />
          </a>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Discord"
            title="Discord"
            className="hidden md:inline text-white/70 hover:text-white transition"
          >
            <DiscordIcon />
          </a>
          <a
            href={REDDIT_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Reddit"
            title="Reddit"
            className="hidden md:inline text-white/70 hover:text-white transition"
          >
            <RedditIcon />
          </a>
          <LocalePicker />
          <UserNav />
          <a
            href={DOWNLOAD_URL}
            className="rounded-lg bg-linear-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:shadow-pink-500/50"
          >
            {tNav('download')}
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 text-center">
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 transition"
        >
          <span className="h-2 w-2 rounded-full bg-pink-400 animate-pulse" />
          {t('betaBanner')}
        </a>
        <h1 className="mb-6 text-5xl md:text-7xl font-bold tracking-tight">
          {t('heroTitle1')}<br />
          <span className="bg-linear-to-r from-pink-400 via-pink-500 to-violet-500 bg-clip-text text-transparent">
            {t('heroTitle2')}
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-white/70">{t('heroSubtitle')}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={DOWNLOAD_URL}
            className="group relative overflow-hidden rounded-xl bg-linear-to-r from-pink-500 to-violet-500 px-8 py-4 text-base font-semibold shadow-lg shadow-pink-500/30 transition hover:shadow-pink-500/50"
          >
            <span className="relative z-10">{t('ctaDownload')}</span>
          </a>
          <a
            href="#how"
            className="rounded-xl border border-white/15 px-8 py-4 text-base font-medium hover:bg-white/5 transition"
          >
            {t('ctaHow')}
          </a>
        </div>
        <p className="mt-4 text-xs text-white/50">{t('betaNote')}</p>

        {/* Hero illustration */}
        <div className="relative mt-16 mx-auto max-w-3xl">
          <div className="absolute inset-0 -z-10 bg-linear-to-b from-pink-500/20 to-violet-500/20 blur-3xl" />
          <div
            className="relative overflow-hidden rounded-3xl border border-white/10 p-8 backdrop-blur"
            style={{
              backgroundImage: "url('/table.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="flex items-center justify-center">
              {/* Все 5 эмоций — стопка с opacity-fade. Активная видна, остальные
                  прозрачные. Next.js кэширует, после первого цикла переключения мгновенные. */}
              <div className="relative h-auto w-64 md:w-80" style={{ aspectRatio: '928 / 1232' }}>
                {HERO_EMOTIONS.map((emotion, i) => (
                  <Image
                    key={emotion}
                    src={`/yukai/emotions/${emotion}.png`}
                    alt={`Yukai ${emotion}`}
                    fill
                    sizes="(min-width: 768px) 320px, 256px"
                    className="object-contain transition-opacity duration-700"
                    style={{ opacity: i === emotionIdx ? 1 : 0 }}
                    priority={i === 0}
                    unoptimized
                  />
                ))}
              </div>
            </div>
            <div className="mt-6 rounded-2xl bg-black/40 p-4 text-left">
              <div className="mb-2 text-xs font-medium text-pink-400 transition-opacity duration-500">
                {t(`yukaiBubble${bubbleNum}Label`)}
              </div>
              <div className="text-sm text-white/80 transition-opacity duration-500">
                &ldquo;{t(`yukaiBubble${bubbleNum}Text`)}&rdquo;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="mb-4 text-center text-4xl font-bold">{t('featuresTitle')}</h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-white/60">{t('featuresSubtitle')}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { emoji: '🎭', title: t('feature1Title'), desc: t('feature1Desc'), color: 'from-pink-500/20 to-pink-600/5' },
            { emoji: '⌨️', title: t('feature2Title'), desc: t('feature2Desc'), color: 'from-violet-500/20 to-violet-600/5' },
            { emoji: '🎵', title: t('feature3Title'), desc: t('feature3Desc'), color: 'from-pink-500/20 to-violet-500/10' },
          ].map((f) => (
            <div
              key={f.title}
              className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-b ${f.color} p-8 backdrop-blur transition hover:border-white/20`}
            >
              <div className="mb-4 text-4xl">{f.emoji}</div>
              <h3 className="mb-3 text-xl font-semibold">{f.title}</h3>
              <p className="text-sm text-white/70 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="mb-4 text-center text-4xl font-bold">{t('howTitle')}</h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-white/60">{t('howSubtitle')}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { n: '01', title: t('step1Title'), desc: t('step1Desc') },
            { n: '02', title: t('step2Title'), desc: t('step2Desc') },
            { n: '03', title: t('step3Title'), desc: t('step3Desc') },
          ].map((s) => (
            <div key={s.n} className="relative">
              <div className="mb-4 text-6xl font-bold bg-linear-to-br from-pink-400 to-violet-400 bg-clip-text text-transparent">
                {s.n}
              </div>
              <h3 className="mb-2 text-xl font-semibold">{s.title}</h3>
              <p className="text-sm text-white/60">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-4xl px-6 py-24">
        <h2 className="mb-4 text-center text-4xl font-bold">{t('pricingTitle')}</h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-white/60">{t('pricingSubtitle')}</p>
        <div className="relative mx-auto max-w-md">
          <div className="absolute -inset-1 rounded-2xl bg-linear-to-r from-pink-500 to-violet-500 opacity-60 blur-lg" />
          <div className="relative rounded-2xl border border-white/10 bg-[#0F0E15] p-8">
            <div className="mb-2 inline-flex rounded-full bg-pink-500/20 px-3 py-1 text-xs font-medium text-pink-300">
              {t('pricingPopular')}
            </div>
            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-5xl font-bold">$19</span>
              <span className="text-white/60">{t('pricingPerMonth')}</span>
            </div>
            <ul className="mb-8 space-y-3 text-sm">
              {[
                t('pricingFeature1'),
                t('pricingFeature2'),
                t('pricingFeature3'),
                t('pricingFeature4'),
                t('pricingFeature5'),
                t('pricingFeature6'),
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white/80">{item}</span>
                </li>
              ))}
            </ul>
            <a
              href={DOWNLOAD_URL}
              className="block w-full rounded-xl bg-linear-to-r from-pink-500 to-violet-500 px-6 py-4 text-center font-semibold shadow-lg shadow-pink-500/30 transition hover:shadow-pink-500/50"
            >
              {t('ctaDownload')}
            </a>
            <p className="mt-3 text-center text-xs text-white/50">{t('pricingNote')}</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="mb-12 text-center text-4xl font-bold">{t('faqTitle')}</h2>
        <div className="space-y-4">
          {[
            { q: t('faq1q'), a: t('faq1a') },
            { q: t('faq2q'), a: t('faq2a') },
            { q: t('faq3q'), a: t('faq3a') },
            { q: t('faq4q'), a: t('faq4a') },
            { q: t('faq5q'), a: t('faq5a') },
            { q: t('faq6q'), a: t('faq6a') },
          ].map((item) => (
            <details key={item.q} className="group rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <summary className="flex cursor-pointer items-center justify-between font-medium list-none">
                <span>{item.q}</span>
                <span className="text-pink-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 text-sm text-white/70 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="mx-auto mb-8 w-32">
          <Image
            src="/yukai/emotions/wink.png"
            alt="Yukai winking"
            width={928}
            height={1232}
            className="h-auto w-full"
            unoptimized
          />
        </div>
        <h2 className="mb-4 text-4xl font-bold">
          {t('finalTitle1')}<br />
          {t('finalTitle2')}
        </h2>
        <p className="mb-8 text-white/60">{t('finalSubtitle')}</p>
        <a
          href={DOWNLOAD_URL}
          className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-pink-500 to-violet-500 px-8 py-4 font-semibold shadow-lg shadow-pink-500/30 transition hover:shadow-pink-500/50"
        >
          {t('finalCta')}
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="text-sm text-white/50">
            <span className="bg-linear-to-r from-pink-400 to-violet-400 bg-clip-text font-semibold text-transparent">Yukai</span>
            {' · '}
            © 2026
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              title="Telegram"
              className="hover:text-white transition"
            >
              <TelegramIcon />
            </a>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
              title="Discord"
              className="hover:text-white transition"
            >
              <DiscordIcon />
            </a>
            <a
              href={REDDIT_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Reddit"
              title="Reddit"
              className="hover:text-white transition"
            >
              <RedditIcon />
            </a>
            <a href="/privacy" className="hover:text-white transition">{tNav('privacy')}</a>
            <a href="/terms" className="hover:text-white transition">{tNav('terms')}</a>
          </div>
        </div>
        {/* Flaticon атрибуция — обязательна по лицензии free-pack'а */}
        <div className="mt-4 px-6 text-center text-[10px] text-white/20">
          Flag icons by{' '}
          <a
            href="https://www.flaticon.com/authors/iconset"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/40 transition"
          >
            iconset
          </a>
          {' '}—{' '}
          <a
            href="https://www.flaticon.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/40 transition"
          >
            Flaticon
          </a>
        </div>
      </footer>
    </main>
  )
}
