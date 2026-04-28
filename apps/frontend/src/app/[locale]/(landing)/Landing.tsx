'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { UserNav } from '@/widgets/header/ui/UserNav'
import { LocalePicker } from '@/widgets/header/ui/LocalePicker'

const DOWNLOAD_URL = 'https://github.com/Imba-Sharik/kika/releases/latest/download/Yukai-Setup-x64.exe'
const TELEGRAM_URL = 'https://t.me/+O_SNPGI-CGI0ZjUy'

export default function Landing() {
  const t = useTranslations('landing')
  const tNav = useTranslations('nav')

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
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="hidden md:inline text-sm text-white/70 hover:text-white transition">
            {tNav('devchat')}
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
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
            <div className="flex items-center justify-center">
              <Image
                src="/yukai/emotions/happy.png"
                alt="Yukai"
                width={928}
                height={1232}
                className="h-auto w-64 md:w-80"
                priority
                unoptimized
              />
            </div>
            <div className="mt-6 rounded-2xl bg-black/40 p-4 text-left">
              <div className="mb-2 text-xs font-medium text-pink-400">{t('yukaiBubbleLabel')}</div>
              <div className="text-sm text-white/80">&ldquo;{t('yukaiBubbleText')}&rdquo;</div>
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
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Telegram</a>
            <a href="/privacy" className="hover:text-white transition">{tNav('privacy')}</a>
            <a href="/terms" className="hover:text-white transition">{tNav('terms')}</a>
          </div>
        </div>
        {/* Flaticon атрибуция — обязательна по лицензии free-pack'а */}
        <div className="mt-6 px-6 text-center text-xs text-white/30">
          <a
            href="https://www.flaticon.com/ru/free-icons/"
            target="_blank"
            rel="noopener noreferrer"
            title="флаги иконки"
            className="hover:text-white/50 transition"
          >
            Флаги иконки от iconset.co — Flaticon
          </a>
        </div>
      </footer>
    </main>
  )
}
