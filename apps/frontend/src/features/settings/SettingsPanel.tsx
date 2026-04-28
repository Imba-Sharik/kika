'use client'

import { useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { BUILTIN_VOICES } from '@/shared/yukai/voices'
import { BUILTIN_PLUGINS } from '@/features/plugin-system/registry'
import { PluginsSettingsSection } from '@/features/plugin-system/PluginsSettingsSection'
import type { Language } from '@/shared/yukai/persona'
import { t } from '@/shared/yukai/i18n'
import { aiFetch } from '@/shared/api/aiFetch'
import { ALL_LOCALES, useLocaleSwitcher, type LocaleCode } from '@/shared/yukai/useLanguage'

type OriginPref = 'auto' | 'direct' | 'ru'

const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

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
        <span style={{ color: '#e5e7eb', fontWeight: 600, flex: 1 }}>{t(language, 'settings.title')}</span>
        <button
          onClick={onClose}
          title={t(language, 'settings.close')}
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
            {t(language, 'settings.mic')}
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
            <option value="">{t(language, 'settings.mic.default')}</option>
            {mics.map((m) => (
              <option key={m.deviceId} value={m.deviceId}>
                {m.label || `device ${m.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
            {t(language, 'settings.voice')}
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
                {v.label}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
            {t(language, 'settings.voice.hint')}
          </div>
        </div>

        <div>
          <label style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
            <span>{t(language, 'settings.sensitivity')}</span>
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
            {t(language, 'settings.sensitivity.hint')}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
            {t(language, 'settings.language')}
          </label>
          <LanguageSelect
            language={language}
            onSelectLanguage={onSelectLanguage}
          />
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, lineHeight: 1.4 }}>
            {t(language, 'settings.language.hint')}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
            {t(language, 'settings.connection')}
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
            <option value="auto">{t(language, 'settings.connection.auto')}</option>
            <option value="direct">{t(language, 'settings.connection.direct')}</option>
            <option value="ru">{t(language, 'settings.connection.ru')}</option>
          </select>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, lineHeight: 1.4 }}>
            {t(language, 'settings.connection.hint')}
          </div>
        </div>

        <PluginsSettingsSection
          plugins={BUILTIN_PLUGINS}
          isEnabled={isPluginEnabled}
          setEnabled={setPluginEnabled}
          language={language}
        />

        <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
          <div style={{ marginBottom: 4 }}>{t(language, 'settings.hotkeys')}</div>
          <div>• <b>Ctrl+Z</b> — {t(language, 'settings.hotkey.handsfree')}</div>
          <div>• <b>Right Alt</b> — {t(language, 'settings.hotkey.dictation')}</div>
          <div>• <b>Left Alt + `</b> — {t(language, 'settings.hotkey.shazam')}</div>
        </div>

        <a
          href="https://t.me/+O_SNPGI-CGI0ZjUy"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            // В Electron открываем внешнюю ссылку через shell (не внутри overlay окна).
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const api = (window as any).electronAPI
            if (api?.openExternal) {
              e.preventDefault()
              api.openExternal('https://t.me/+O_SNPGI-CGI0ZjUy')
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 6,
            background: 'rgba(96, 165, 250, 0.1)',
            border: '1px solid rgba(96, 165, 250, 0.25)',
            color: '#93c5fd',
            textDecoration: 'none',
            fontSize: 11,
            lineHeight: 1.4,
          }}
        >
          <span style={{ fontSize: 16 }}>💬</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{t(language, 'settings.devchat.title')}</div>
            <div style={{ color: '#9ca3af', fontSize: 10 }}>
              {t(language, 'settings.devchat.hint')}
            </div>
          </div>
          <span style={{ color: '#6b7280' }}>→</span>
        </a>

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
          {t(language, 'settings.show-onboarding')}
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
  const { current, switchTo } = useLocaleSwitcher()

  function onChange(newLocale: LocaleCode) {
    // 1) URL change → next-intl reloads all messages
    switchTo(newLocale)
    // 2) Backwards-compat: overlay меняет voice (RU→Fish, EN→ElevenLabs)
    if (newLocale === 'ru' || newLocale === 'en') {
      onSelectLanguage(newLocale as Language)
    }
    void language
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value as LocaleCode)}
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
      {ALL_LOCALES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  )
}

function AccountSection({ language }: { language: Language }) {
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
        {t(language, 'settings.account')}
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
              {t(language, 'settings.account.signedIn')}
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
            onClick={() => signOut({ callbackUrl: '/' })}
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
            {t(language, 'settings.account.signout')}
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
          {t(language, 'settings.account.notSignedIn')}
        </div>
      )}
    </div>
  )
}

function QuotaWidget({ quota, language }: { quota: Quota; language: Language }) {
  const tierLabel = {
    trial: t(language, 'quota.tier.trial'),
    free: t(language, 'quota.tier.free'),
    paid: t(language, 'quota.tier.paid'),
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
          {t(language, 'quota.today')}{' '}
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
            ? t(language, 'quota.trialLeft').replace('{days}', String(quota.trialDaysLeft))
            : t(language, 'quota.trialExpired')}
        </div>
      )}
    </div>
  )
}
