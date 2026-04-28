'use client'

import { useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { BUILTIN_VOICES } from '@/shared/yukai/voices'
import { BUILTIN_PLUGINS } from '@/features/plugin-system/registry'
import { PluginsSettingsSection } from '@/features/plugin-system/PluginsSettingsSection'
import type { Language } from '@/shared/yukai/persona'
import { aiFetch } from '@/shared/api/aiFetch'
import { LocalePicker } from '@/widgets/header/ui/LocalePicker'

type OriginPref = 'auto' | 'direct' | 'ru'

const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

function TelegramIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  )
}

function DiscordIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

type ChatLinkProps = {
  url: string
  icon: React.ReactNode
  color: string
  borderColor: string
  textColor: string
  title: string
  hint: string
}

function ChatLink({ url, icon, color, borderColor, textColor, title, hint }: ChatLinkProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window as any).electronAPI
        if (api?.openExternal) {
          e.preventDefault()
          api.openExternal(url)
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 6,
        background: color,
        border: `1px solid ${borderColor}`,
        color: textColor,
        textDecoration: 'none',
        fontSize: 11,
        lineHeight: 1.4,
      }}
    >
      <span style={{ display: 'inline-flex' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{title}</div>
        <div style={{ color: '#9ca3af', fontSize: 10 }}>{hint}</div>
      </div>
      <span style={{ color: '#6b7280' }}>→</span>
    </a>
  )
}

type Props = {
  micDeviceId: string
  mics: MediaDeviceInfo[]
  onSelectMic: (id: string) => void
  voiceId: string
  onSelectVoice: (id: string) => void
  vadProbability: number
  vadThreshold: number
  onSelectVadThreshold: (v: number) => void
  onShowOnboardingAgain: () => void
  language: Language
  onSelectLanguage: (l: Language) => void
  isPluginEnabled: (id: string) => boolean
  setPluginEnabled: (id: string, enabled: boolean) => void
  onClose: () => void
}

export function SettingsPanel({
  micDeviceId,
  mics,
  onSelectMic,
  voiceId,
  onSelectVoice,
  vadProbability,
  vadThreshold,
  onSelectVadThreshold,
  onShowOnboardingAgain,
  language,
  onSelectLanguage,
  isPluginEnabled,
  setPluginEnabled,
  onClose,
}: Props) {
  const t = useTranslations()
  // Origin preference — где грузится фронт. Auto / прямое / РФ-зеркало.
  // Для пользователей с заблокированным Vercel в РФ или со своим VPN.
  const [originPref, setOriginPref] = useState<OriginPref>('auto')
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI
    api?.getOriginPref?.().then((p: OriginPref) => setOriginPref(p)).catch(() => {})
  }, [])
  function changeOriginPref(p: OriginPref) {
    setOriginPref(p)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI
    api?.setOriginPref?.(p)
    // Electron сам перезагрузит окно с новым URL — рендер закроется.
  }

  return (
    <div
      style={{
        ...noDragStyle,
        position: 'absolute',
        top: 4,
        right: 4,
        bottom: 4,
        left: 204,
        background: 'rgba(0,0,0,0.88)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 12,
        borderRadius: 8,
        overflow: 'hidden',
        zIndex: 3,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          fontSize: 11,
        }}
      >
        <span style={{ fontSize: 14 }}>⚙</span>
        <span style={{ color: '#e5e7eb', fontWeight: 600, flex: 1 }}>{t('settings.title')}</span>
        <button
          onClick={onClose}
          title={t('settings.close')}
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: 12,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
        <AccountSection language={language} />
        <div>
          <label style={{ display: 'block', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
            {t('settings.mic')}
          </label>
          <select
            value={micDeviceId}
            onChange={(e) => onSelectMic(e.target.value)}
            style={{
              width: '100%',
              background: '#1f2937',
              color: 'white',
              border: '1px solid #374151',
              padding: '6px 8px',
              fontSize: 12,
              borderRadius: 4,
            }}
          >
            <option value="">{t('settings.micDefault')}</option>
            {mics.map((m) => (
              <option key={m.deviceId} value={m.deviceId}>
                {m.label || `device ${m.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
            {t('settings.voice')}
          </label>
          <select
            value={voiceId}
            onChange={(e) => onSelectVoice(e.target.value)}
            style={{
              width: '100%',
              background: '#1f2937',
              color: 'white',
              border: '1px solid #374151',
              padding: '6px 8px',
              fontSize: 12,
              borderRadius: 4,
            }}
          >
            {BUILTIN_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label.replace(/^(Fish|ElevenLabs)\s—\s/, '')}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
            {t('settings.voiceHint')}
          </div>
        </div>

        <div>
          <label style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
            <span>{t('settings.sensitivity')}</span>
            <span style={{ color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
              {vadThreshold.toFixed(2)}
            </span>
          </label>
          {/* Discord-style полоска: уровень мика + драггабельный порог в одном ряду.
              Тащи оранжевый ползунок чтобы настроить — где он, там и начинается «речь». */}
          <div
            style={{
              position: 'relative',
              height: 22,
              background: '#1f2937',
              borderRadius: 4,
              overflow: 'hidden',
              border: '1px solid #374151',
              cursor: 'ew-resize',
              userSelect: 'none',
            }}
            onMouseDown={(e) => {
              const bar = e.currentTarget
              const update = (clientX: number) => {
                const rect = bar.getBoundingClientRect()
                const raw = (clientX - rect.left) / rect.width
                // Минимум 0.05 — при 0.00 VAD считает любой шум речью и залипает,
                // максимум 0.95 — при 1.00 Silero никогда не триггерится.
                const clamped = Math.max(0.05, Math.min(0.95, raw))
                onSelectVadThreshold(Math.round(clamped * 100) / 100)
              }
              update(e.clientX)
              const onMove = (ev: MouseEvent) => update(ev.clientX)
              const onUp = () => {
                window.removeEventListener('mousemove', onMove)
                window.removeEventListener('mouseup', onUp)
              }
              window.addEventListener('mousemove', onMove)
              window.addEventListener('mouseup', onUp)
            }}
          >
            {/* Fill: реальная Silero-вероятность в реальном времени.
                Зелёный когда нейросеть считает что это речь (выше порога). */}
            <div
              style={{
                height: '100%',
                width: `${vadProbability * 100}%`,
                background: vadProbability > vadThreshold ? '#22c55e' : '#4b5563',
                transition: 'width 60ms linear, background 150ms',
              }}
            />
            {/* Ползунок-порог на той же шкале (0-1) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${vadThreshold * 100}%`,
                width: 3,
                background: '#f59e0b',
                boxShadow: '0 0 6px rgba(245,158,11,0.8)',
                transform: 'translateX(-1.5px)',
                pointerEvents: 'none',
              }}
            />
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, lineHeight: 1.4 }}>
            {t('settings.sensitivityHint')}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
            {t('settings.language')}
          </label>
          <LanguageSelect
            language={language}
            onSelectLanguage={onSelectLanguage}
          />
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, lineHeight: 1.4 }}>
            {t('settings.languageHint')}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
            {t('settings.connection')}
          </label>
          <select
            value={originPref}
            onChange={(e) => changeOriginPref(e.target.value as OriginPref)}
            style={{
              width: '100%',
              background: '#1f2937',
              color: 'white',
              border: '1px solid #374151',
              padding: '6px 8px',
              fontSize: 12,
              borderRadius: 4,
            }}
          >
            <option value="auto">{t('settings.connectionAuto')}</option>
            <option value="direct">{t('settings.connectionDirect')}</option>
            <option value="ru">{t('settings.connectionRu')}</option>
          </select>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, lineHeight: 1.4 }}>
            {t('settings.connectionHint')}
          </div>
        </div>

        <PluginsSettingsSection
          plugins={BUILTIN_PLUGINS}
          isEnabled={isPluginEnabled}
          setEnabled={setPluginEnabled}
        />

        <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
          <div style={{ marginBottom: 4 }}>{t('settings.hotkeys')}</div>
          <div>• <b>Ctrl+Z</b> — {t('settings.hotkeyHandsfree')}</div>
          <div>• <b>Right Alt</b> — {t('settings.hotkeyDictation')}</div>
          <div>• <b>Left Alt + `</b> — {t('settings.hotkeyShazam')}</div>
        </div>

        <ChatLink
          url="https://t.me/+O_SNPGI-CGI0ZjUy"
          icon={<TelegramIcon />}
          color="rgba(96, 165, 250, 0.1)"
          borderColor="rgba(96, 165, 250, 0.25)"
          textColor="#93c5fd"
          title={t('settings.devchatTitle')}
          hint={t('settings.devchatHint')}
        />

        <ChatLink
          url="https://discord.gg/RUqPNvBNV"
          icon={<DiscordIcon />}
          color="rgba(139, 92, 246, 0.12)"
          borderColor="rgba(139, 92, 246, 0.3)"
          textColor="#c4b5fd"
          title="Discord"
          hint="discord.gg/RUqPNvBNV"
        />

        <button
          type="button"
          onClick={onShowOnboardingAgain}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            fontSize: 10,
            textAlign: 'left',
            cursor: 'pointer',
            padding: '4px 0',
            textDecoration: 'underline',
          }}
        >
          {t('settings.showOnboarding')}
        </button>
      </div>
    </div>
  )
}

/**
 * Секция аккаунта — статус сессии, имя юзера, кнопка выхода.
 * Если не залогинен — подсказка что без auth Yukai не может отвечать
 * (AI-эндпоинты на бэке требуют JWT).
 */
type Quota = {
  spent: number
  limit: number
  remaining: number
  percentage: number
  resetsAt: string
  tier: 'trial' | 'free' | 'paid'
  trialDaysLeft: number | null
}

/**
 * Селект языка — все 8 локалей через next-intl router.
 * Дополнительно зовём onSelectLanguage для обратной совместимости с overlay
 * (он меняет voice по выбранному языку).
 */
function LanguageSelect({
  language,
  onSelectLanguage,
}: {
  language: Language
  onSelectLanguage: (l: Language) => void
}) {
  void language
  void onSelectLanguage
  // Используем общий LocalePicker (shadcn Select с PNG-флагами) — то же что
  // в Header. switchTo меняет URL → next-intl router, overlay через useEffect
  // подхватит и переключит voice по локали.
  return <LocalePicker className="h-9 w-full justify-between gap-2 rounded border border-[#374151] bg-[#1f2937] px-2 text-xs text-white hover:bg-[#374151]" />
}

function AccountSection({ language }: { language: Language }) {
  const t = useTranslations()
  void language
  const { data: session, status } = useSession()
  const [quota, setQuota] = useState<Quota | null>(null)

  // Подгружаем квоту когда юзер залогинен. Без polling — обновится на следующем
  // открытии Settings. Этого достаточно: юзер видит свежие цифры на каждом
  // открытии панели.
  useEffect(() => {
    if (status !== 'authenticated') return
    aiFetch('/me/quota')
      .then((r) => (r.ok ? r.json() : null))
      .then((q: Quota | null) => setQuota(q))
      .catch(() => setQuota(null))
  }, [status])

  // Loading — невидимый placeholder, чтобы не дёргать layout
  if (status === 'loading') {
    return <div style={{ minHeight: 48 }} aria-hidden />
  }

  return (
    <div>
      <label style={{ display: 'block', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
        {t('settings.account')}
      </label>
      {session ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: 'white',
              flexShrink: 0,
            }}
          >
            {(session.user?.name ?? session.user?.email ?? '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              {t('settings.accountSignedIn')}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#e5e7eb',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={session.user?.email ?? undefined}
            >
              {session.user?.name ?? session.user?.email ?? 'User'}
            </div>
          </div>
          <button
            type="button"
            // redirect: false — остаёмся в overlay'е, SessionProvider апдейтит
            // session → AuthGateBubble автоматически появится поверх Yukai.
            // Юзер видит "первый запуск"-UX, не выкидывается на лендинг.
            onClick={() => signOut({ redirect: false })}
            style={{
              padding: '4px 10px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 4,
              color: '#e5e7eb',
              fontSize: 11,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {t('settings.accountSignout')}
          </button>
          </div>
          {quota && <QuotaWidget quota={quota} language={language} />}
        </div>
      ) : (
        <div
          style={{
            padding: '8px 10px',
            background: 'rgba(236,72,153,0.1)',
            border: '1px solid rgba(236,72,153,0.3)',
            borderRadius: 6,
            fontSize: 11,
            color: '#fda4af',
          }}
        >
          {t('settings.accountNotSignedIn')}
        </div>
      )}
    </div>
  )
}

function QuotaWidget({ quota, language }: { quota: Quota; language: Language }) {
  const t = useTranslations()
  void language
  const tierLabel = {
    trial: t('quota.tier.trial'),
    free: t('quota.tier.free'),
    paid: t('quota.tier.paid'),
  }[quota.tier]

  const barColor =
    quota.percentage >= 90
      ? 'linear-gradient(90deg, #ef4444, #dc2626)'
      : quota.percentage >= 70
        ? 'linear-gradient(90deg, #f59e0b, #ec4899)'
        : 'linear-gradient(90deg, #ec4899, #8b5cf6)'

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
          fontSize: 11,
        }}
      >
        <span style={{ color: '#9ca3af' }}>
          {t('quota.today')}{' '}
          <span style={{ color: '#e5e7eb', fontWeight: 600 }}>
            ${quota.spent.toFixed(quota.spent < 0.01 ? 4 : 2)} / ${quota.limit.toFixed(2)}
          </span>
        </span>
        <span
          style={{
            fontSize: 9,
            padding: '1px 6px',
            borderRadius: 8,
            background: quota.tier === 'trial' ? 'rgba(236,72,153,0.2)' : 'rgba(255,255,255,0.08)',
            color: quota.tier === 'trial' ? '#fbcfe8' : '#9ca3af',
            fontWeight: 600,
          }}
        >
          {tierLabel}
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${quota.percentage}%`,
            height: '100%',
            background: barColor,
            transition: 'width 200ms',
          }}
        />
      </div>
      {quota.tier === 'trial' && quota.trialDaysLeft !== null && (
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>
          {quota.trialDaysLeft > 0
            ? t('quota.trialLeft').replace('{days}', String(quota.trialDaysLeft))
            : t('quota.trialExpired')}
        </div>
      )}
    </div>
  )
}
