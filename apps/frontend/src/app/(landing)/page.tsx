import Image from 'next/image'

// Стабильная ссылка на последний .exe. Имя файла фиксировано через
// electron-builder build.artifactName = "Yukai-Setup-${arch}.${ext}" — поэтому
// эта ссылка работает для ВСЕХ будущих версий без правок лендинга.
const DOWNLOAD_URL = 'https://github.com/Imba-Sharik/kika/releases/latest/download/Yukai-Setup-x64.exe'
// Telegram-канал для beta-фидбека — пока основной канал связи с юзерами.
const TELEGRAM_URL = 'https://t.me/+O_SNPGI-CGI0ZjUy'

export default function LandingPage() {
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
          <a href="#pricing" className="text-sm text-white/70 hover:text-white transition">Цена</a>
          <a href="#faq" className="text-sm text-white/70 hover:text-white transition">FAQ</a>
          <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-white/70 hover:text-white transition">
            Чат с разработчиком
          </a>
          <a href="/en" className="text-sm text-white/50 hover:text-white transition" title="English">EN</a>
          <a href={DOWNLOAD_URL} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 transition">
            Скачать
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
          Beta открыта — присоединяйся к чату с разработчиком →
        </a>
        <h1 className="mb-6 text-5xl md:text-7xl font-bold tracking-tight">
          Твой AI-компаньон,<br />
          <span className="bg-gradient-to-r from-pink-400 via-pink-500 to-violet-500 bg-clip-text text-transparent">
            который живёт на экране
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-white/70">
          Yukai разговаривает голосом, диктует твои письма, узнаёт музыку в наушниках
          и всегда рядом. Не просто ассистент — напарник с характером.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={DOWNLOAD_URL}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-8 py-4 text-base font-semibold shadow-lg shadow-pink-500/30 transition hover:shadow-pink-500/50"
          >
            <span className="relative z-10">Скачать для Windows</span>
          </a>
          <a
            href="#how"
            className="rounded-xl border border-white/15 px-8 py-4 text-base font-medium hover:bg-white/5 transition"
          >
            Как это работает
          </a>
        </div>
        <p className="mt-4 text-xs text-white/50">Бесплатно в beta · macOS и Linux скоро</p>

        {/* Hero illustration — персонаж */}
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
              <div className="mb-2 text-xs font-medium text-pink-400">Yukai · счастлива</div>
              <div className="text-sm text-white/80">
                &ldquo;Привет! Готова помочь тебе сегодня. Что сделаем первым — проверим почту или послушаем музыку?&rdquo;
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="mb-4 text-center text-4xl font-bold">Что она умеет</h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-white/60">
          Три главные фичи — каждая заменяет отдельное приложение. Всё в одной Yukai.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              emoji: '🎭',
              title: 'Живой компаньон',
              desc: 'Разговаривает голосом, реагирует эмоциями. Помнит что обсуждали. Не скучно работать и жить.',
              color: 'from-pink-500/20 to-pink-600/5',
            },
            {
              emoji: '⌨️',
              title: 'Голосовая диктовка',
              desc: 'Зажми правый Alt, говори, отпусти — текст появляется в любом окне. Как Wispr Flow, но с характером.',
              color: 'from-violet-500/20 to-violet-600/5',
            },
            {
              emoji: '🎵',
              title: 'Shazam в наушниках',
              desc: 'Играет песня в YouTube или игре? Alt+` — Yukai услышит через системный звук и скажет название.',
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
        <h2 className="mb-4 text-center text-4xl font-bold">Как это выглядит</h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-white/60">
          Yukai — прозрачное окно поверх всех программ. Видно её, но она не мешает.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { n: '01', title: 'Установи и запусти', desc: 'Скачай .exe, открой — Yukai появляется в углу экрана.' },
            { n: '02', title: 'Настрой характер', desc: 'Выбери голос, эмоции. Позже — кастомные персонажи от креаторов.' },
            { n: '03', title: 'Живи как обычно', desc: 'Работай, играй, смотри ютуб. Yukai всегда рядом, отвечает когда нужно.' },
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
        <h2 className="mb-4 text-center text-4xl font-bold">Один тариф. Всё включено.</h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-white/60">
          Без скрытых лимитов. Без тормозов. Отмена в любой момент.
        </p>
        <div className="relative mx-auto max-w-md">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 opacity-60 blur-lg" />
          <div className="relative rounded-2xl border border-white/10 bg-[#0F0E15] p-8">
            <div className="mb-2 inline-flex rounded-full bg-pink-500/20 px-3 py-1 text-xs font-medium text-pink-300">
              Популярный
            </div>
            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-5xl font-bold">$19</span>
              <span className="text-white/60">/мес</span>
            </div>
            <ul className="mb-8 space-y-3 text-sm">
              {[
                'Безлимитный чат с голосом',
                'Голосовая диктовка в любое окно',
                'Распознавание музыки через наушники',
                'Все эмоции и характер Yukai',
                'Доступ к будущим персонажам маркетплейса',
                'Приоритетная поддержка',
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
              Скачать для Windows
            </a>
            <p className="mt-3 text-center text-xs text-white/50">
              Сейчас бесплатно во время beta. Подписка — когда выйдет v1.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="mb-12 text-center text-4xl font-bold">Частые вопросы</h2>
        <div className="space-y-4">
          {[
            {
              q: 'На каких системах работает?',
              a: 'Windows 10/11 — сейчас. macOS и Linux — в разработке. Минимальные требования: 4 ГБ RAM, микрофон.',
            },
            {
              q: 'Нужен ли интернет?',
              a: 'Да, голос и мозг Yukai работают через облако (Claude AI + Fish Audio). Обычный домашний интернет справляется.',
            },
            {
              q: 'Сколько языков знает?',
              a: 'Русский и английский — полностью. Другие — понимает, но голос пока только русский/английский.',
            },
            {
              q: 'Могу ли я сменить голос или внешность?',
              a: 'Базовые — бесплатно. Скоро откроется маркетплейс с голосами и персонажами от креаторов (включая аниме-артистов и сэйю).',
            },
            {
              q: 'Что делает Yukai с моими данными?',
              a: 'Разговоры не сохраняются на серверах дольше обработки. Локальная память хранится только у тебя на компьютере.',
            },
            {
              q: 'Что если отменю подписку?',
              a: 'Доступ сохраняется до конца оплаченного периода. Локальная память и настройки остаются у тебя.',
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
          Установи за минуту.<br />
          Дальше — как со старым другом.
        </h2>
        <p className="mb-8 text-white/60">
          Beta сейчас бесплатна. Без карт, без спама.
        </p>
        <a
          href={DOWNLOAD_URL}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 px-8 py-4 font-semibold shadow-lg shadow-pink-500/30 transition hover:shadow-pink-500/50"
        >
          Скачать для Windows →
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
          <div className="flex items-center gap-6 text-sm text-white/50">
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Telegram</a>
            {/* <a href="https://discord.gg/kika" className="hover:text-white transition">Discord</a> */}
            {/* <a href="mailto:hello@kika.ai" className="hover:text-white transition">Support</a> */}
          </div>
        </div>
      </footer>
    </main>
  )
}
