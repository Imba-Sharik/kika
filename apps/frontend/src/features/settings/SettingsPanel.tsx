'use client'

import { useEffect, useState } from 'react'
import { BUILTIN_VOICES } from '@/shared/yukai/voices'
import { BUILTIN_PLUGINS } from '@/features/plugin-system/registry'
import { PluginsSettingsSection } from '@/features/plugin-system/PluginsSettingsSection'
import type { Language } from '@/shared/yukai/persona'

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
        <span style={{ color: '#e5e7eb', fontWeight: 600, flex: 1 }}>Настройки</span>
        <button
          onClick={onClose}
          title="Закрыть"
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
        <div>
          <label style={{ display: 'block', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
            Микрофон
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
            <option value="">По умолчанию</option>
            {mics.map((m) => (
              <option key={m.deviceId} value={m.deviceId}>
                {m.label || `device ${m.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
            Голос Yukai
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
            ElevenLabs — лучшее произношение английского. Fish — живой русский.
          </div>
        </div>

        <div>
          <label style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
            <span>Чувствительность мика</span>
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
            Заливка = вероятность речи от VAD. Тащи оранжевый порог —
            где он, там и начинается «речь». Применяется сразу.
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
            Язык / Language
          </label>
          <select
            value={language}
            onChange={(e) => onSelectLanguage(e.target.value as Language)}
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
            <option value="ru">🇷🇺 Русский</option>
            <option value="en">🇬🇧 English</option>
          </select>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, lineHeight: 1.4 }}>
            Меняет язык, на котором отвечает Yukai по умолчанию. Голос автоматически переключается на подходящий.
          </div>
        </div>

        <div>
          <label style={{ display: 'block', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
            Подключение
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
            <option value="auto">Авто (рекомендуется)</option>
            <option value="direct">Прямое — yukai.app</option>
            <option value="ru">РФ-зеркало — ru.yukai.app</option>
          </select>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4, lineHeight: 1.4 }}>
            Если приложение не подключается — выбери РФ-зеркало.
            При смене окно перезагружается.
          </div>
        </div>

        <PluginsSettingsSection
          plugins={BUILTIN_PLUGINS}
          isEnabled={isPluginEnabled}
          setEnabled={setPluginEnabled}
        />

        <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
          <div style={{ marginBottom: 4 }}>Хоткеи:</div>
          <div>• <b>Ctrl+Z</b> — hands-free вкл/выкл</div>
          <div>• <b>Right Alt</b> — диктовка (hold)</div>
          <div>• <b>Left Alt + `</b> — распознать песню</div>
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
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Чат с разработчиком</div>
            <div style={{ color: '#9ca3af', fontSize: 10 }}>
              Напиши что сломалось, чего не хватает, что понравилось
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
          Показать подсказку для новичков ещё раз
        </button>
      </div>
    </div>
  )
}
