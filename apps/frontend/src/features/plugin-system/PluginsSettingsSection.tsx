'use client'

import type { YukaiPlugin } from './types'
import type { Language } from '@/shared/yukai/persona'
import { t, translatePluginName, translatePluginDescription } from '@/shared/yukai/i18n'

type Props = {
  plugins: YukaiPlugin[]
  isEnabled: (id: string) => boolean
  setEnabled: (id: string, enabled: boolean) => void
  language: Language
}

// Секция "Плагины" в настройках — список всех зарегистрированных плагинов
// с чекбоксами и списком разрешений.
export function PluginsSettingsSection({ plugins, isEnabled, setEnabled, language }: Props) {
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
      <label style={{ display: 'block', color: '#9ca3af', marginBottom: 8, fontSize: 11 }}>
        {t(language, 'plugins.section')}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plugins.map((p) => {
          const enabled = isEnabled(p.id)
          return (
            <label
              key={p.id}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                padding: '6px 8px',
                background: enabled ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${enabled ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(p.id, e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#e5e7eb', fontSize: 12, fontWeight: 600 }}>
                  {p.icon} {translatePluginName(language, p.id, p.name)}
                </div>
                {p.description && (
                  <div style={{ color: '#9ca3af', fontSize: 10, marginTop: 2 }}>
                    {translatePluginDescription(language, p.id, p.description)}
                  </div>
                )}
                {p.permissions.length > 0 && (
                  <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {p.permissions.map((perm) => (
                      <span
                        key={perm}
                        style={{
                          fontSize: 9,
                          padding: '1px 6px',
                          background: 'rgba(59,130,246,0.15)',
                          color: '#93c5fd',
                          borderRadius: 8,
                        }}
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
