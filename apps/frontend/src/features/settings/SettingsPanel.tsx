'use client'

import { BUILTIN_VOICES } from '@/shared/kika/voices'
import { BUILTIN_PLUGINS } from '@/features/plugin-system/registry'
import { PluginsSettingsSection } from '@/features/plugin-system/PluginsSettingsSection'

const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

type Props = {
  micDeviceId: string
  mics: MediaDeviceInfo[]
  onSelectMic: (id: string) => void
  voiceId: string
  onSelectVoice: (id: string) => void
  micLevel: number
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
  micLevel,
  isPluginEnabled,
  setPluginEnabled,
  onClose,
}: Props) {
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
            Голос Kika
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
          <label style={{ display: 'block', color: '#9ca3af', marginBottom: 6, fontSize: 11 }}>
            Уровень сигнала
          </label>
          <div style={{ height: 10, background: '#1f2937', borderRadius: 5, overflow: 'hidden', border: '1px solid #374151' }}>
            <div
              style={{
                height: '100%',
                width: `${micLevel * 100}%`,
                background: micLevel > 0.05 ? '#22c55e' : '#4b5563',
                transition: 'width 60ms linear, background 200ms',
              }}
            />
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
            Скажи что-нибудь — полоска должна подниматься
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
      </div>
    </div>
  )
}
