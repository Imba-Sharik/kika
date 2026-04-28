'use client'

import Image from 'next/image'
import { UserNav } from '@/widgets/header/ui/UserNav'
import { LocalePicker } from '@/widgets/header/ui/LocalePicker'

// Stable download URL — filename is pinned via electron-builder artifactName,
// so this link always points to the latest release without any updates to the landing.
const DOWNLOAD_URL = 'https://github.com/Imba-Sharik/kika/releases/latest/download/Yukai-Setup-x64.exe'
// Telegram group — main feedback channel for beta users.
const TELEGRAM_URL = 'https://t.me/+O_SNPGI-CGI0ZjUy'

export default function LandingPageEn() {
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
          <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">Yukai</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="#pricing" className="hidden md:inline text-sm text-white/70 hover:text-white transition">Pricing</a>
          <a href="#faq" className="hidden md:inline text-sm text-white/70 hover:text-white transition">FAQ</a>
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="hidden md:inline text-sm text-white/70 hover:text-white transition">
            Chat with dev
          </a>
          <a href="/privacy" className="hidden md:inline text-sm text-white/70 hover:text-white transition">Privacy</a>
          <a href="/terms" className="hidden md:inline text-sm text-white/70 hover:text-white transition">Terms</a>
          <LocalePicker />
          <UserNav />
          <a
            href={DOWNLOAD_URL}
            className="rounded-lg bg-linear-to-r from-pink-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:shadow-pink-500/50"
          >
            Download
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
          Beta is open — join our Telegram to chat with the dev →
        </a>
        <h1 className="mb-6 text-5xl md:text-7xl font-bold tracking-tight">
          Your AI companion,<br />
          <span className="bg-gradient-to-r from-pink-400 via-pink-500 to-violet-500 bg-clip-text text-transparent">
            who lives on your screen
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-white/70">
          Yukai talks back, dictates your messages, Shazams music from any app,
          and is always right there. Not just an assistant — a partner with personality.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={DOWNLOAD_URL}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-8 py-4 text-base font-semibold shadow-lg shadow-pink-500/30 transition hover:shadow-pink-500/50"
          >
            <span className="relative z-10">Download for Windows</span>
          </a>
          <a
            href="#how"
            className="rounded-xl border border-white/15 px-8 py-4 text-base font-medium hover:bg-white/5 transition"
          >
            How it works
          </a>
        </div>
        <p className="mt-4 text-xs text-white/50">Free during beta · macOS and Linux coming soon</p>

        {/* Hero illustration */}
        <div className="relative mt-16 mx-auto max-w-3xl">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-pink-500/20 to-violet-500/20 blur-3xl" />
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
              <div className="mb-2 text-xs font-medium text-pink-400">Yukai · happy</div>
              <div className="text-sm text-white/80">
                &ldquo;Hey! Ready to help you today. What should we do first — check your email or listen to music?&rdquo;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="mb-4 text-center text-4xl font-bold">What she can do</h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-white/60">
          Three core features — each one replaces a separate app. All inside one Yukai.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              emoji: '🎭',
              title: 'Living companion',
              desc: 'Speaks with real voice, reacts with emotions. Remembers what you talked about. Work and life become less dull.',
              color: 'from-pink-500/20 to-pink-600/5',
            },
            {
              emoji: '⌨️',
              title: 'Voice dictation',
              desc: 'Hold Right Alt, speak, release — text appears in any window. Like Wispr Flow, but with personality.',
              color: 'from-violet-500/20 to-violet-600/5',
            },
            {
              emoji: '🎵',
              title: 'Shazam in your headphones',
              desc: 'Song playing in YouTube or a game? Alt+` — Yukai listens through system audio and tells you the title.',
              color: 'from-pink-500/20 to-violet-500/10',
            },
          ].map((f) => (
            <div
              key={f.title}
              className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b ${f.color} p-8 backdrop-blur transition hover:border-white/20`}
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
        <h2 className="mb-4 text-center text-4xl font-bold">How it looks</h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-white/60">
          Yukai is a transparent window on top of all your apps. Visible, but never in the way.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { n: '01', title: 'Install and launch', desc: 'Download the .exe and run it — Yukai appears in the corner of your screen.' },
            { n: '02', title: 'Tune her personality', desc: 'Pick a voice, emotions. Soon — custom characters from creators.' },
            { n: '03', title: 'Live as usual', desc: 'Work, game, watch YouTube. Yukai is right there, responds when needed.' },
          ].map((s) => (
            <div key={s.n} className="relative">
              <div className="mb-4 text-6xl font-bold bg-gradient-to-br from-pink-400 to-violet-400 bg-clip-text text-transparent">
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
        <h2 className="mb-4 text-center text-4xl font-bold">One plan. Everything included.</h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-white/60">
          No hidden limits. No throttling. Cancel anytime.
        </p>
        <div className="relative mx-auto max-w-md">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 opacity-60 blur-lg" />
          <div className="relative rounded-2xl border border-white/10 bg-[#0F0E15] p-8">
            <div className="mb-2 inline-flex rounded-full bg-pink-500/20 px-3 py-1 text-xs font-medium text-pink-300">
              Popular
            </div>
            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-5xl font-bold">$19</span>
              <span className="text-white/60">/mo</span>
            </div>
            <ul className="mb-8 space-y-3 text-sm">
              {[
                'Unlimited voice chat',
                'Voice dictation into any window',
                'Music recognition through system audio',
                'All emotions and Yukai personality',
                'Access to upcoming marketplace characters',
                'Priority support',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white/80">{item}</span>
                </li>
              ))}
            </ul>
            <a
              href={DOWNLOAD_URL}
              className="block w-full rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-6 py-4 text-center font-semibold shadow-lg shadow-pink-500/30 transition hover:shadow-pink-500/50"
            >
              Download for Windows
            </a>
            <p className="mt-3 text-center text-xs text-white/50">
              Free during beta. Subscription starts with v1.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="mb-12 text-center text-4xl font-bold">FAQ</h2>
        <div className="space-y-4">
          {[
            {
              q: 'Which systems are supported?',
              a: 'Windows 10/11 — right now. macOS and Linux are in progress. Minimum: 4 GB RAM, a microphone.',
            },
            {
              q: 'Do I need internet?',
              a: 'Yes, Yukai\'s voice and brain work through the cloud (Claude AI + Fish Audio). Normal home internet is enough.',
            },
            {
              q: 'How many languages does she speak?',
              a: 'English and Russian — fully. Other languages — she understands, but voice is currently English/Russian only.',
            },
            {
              q: 'Can I change her voice or look?',
              a: 'Basic ones — free. Soon a marketplace with voices and characters from creators (including anime artists and voice actors).',
            },
            {
              q: 'What happens to my data?',
              a: 'Conversations are not stored on servers beyond processing. Local memory stays only on your machine.',
            },
            {
              q: 'What if I cancel the subscription?',
              a: 'Access stays until the end of your paid period. Local memory and settings stay with you.',
            },
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
          Install in a minute.<br />
          The rest feels like meeting an old friend.
        </h2>
        <p className="mb-8 text-white/60">
          Beta is free. No credit card, no spam.
        </p>
        <a
          href={DOWNLOAD_URL}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-8 py-4 font-semibold shadow-lg shadow-pink-500/30 transition hover:shadow-pink-500/50"
        >
          Download for Windows →
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="text-sm text-white/50">
            <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text font-semibold text-transparent">Yukai</span>
            {' · '}
            © 2026
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Telegram</a>
            <a href="/privacy" className="hover:text-white transition">Privacy</a>
            <a href="/terms" className="hover:text-white transition">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
