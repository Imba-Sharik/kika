'use client'

import type { DictationItem } from './useDictation'

const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties
const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 5px',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 3,
  fontSize: 10,
  fontFamily: 'monospace',
  color: '#e5e7eb',
}

type Props = {
  history: DictationItem[]
  onClose: () => void
}

export function DictationPanel({ history, onClose }: Props) {
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
        <span style={{ fontSize: 14 }}>⌨️</span>
        <span style={{ color: '#fbbf24', fontWeight: 600 }}>Диктовка</span>
        <span style={{ color: '#9ca3af', flex: 1 }}>· {history.length}</span>
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
            fontSize: 14,
            lineHeight: 1,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {history.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic', padding: 12, textAlign: 'center' }}>
            Пока пусто.
            <br />
            <span style={{ color: '#666', fontSize: 10 }}>
              Зажми <kbd style={kbdStyle}>Right Alt</kbd> и говори — текст вставится и запишется сюда
            </span>
          </div>
        ) : (
          history.map((it, i) => {
            const when = new Date(it.ts)
            const timeStr = when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            const dateStr = when.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
            return (
              <div
                key={i}
                style={{
                  padding: '8px 10px',
                  marginBottom: 4,
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 6,
                  borderLeft: '2px solid rgba(168,85,247,0.5)',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const api = (window as any).electronAPI
                  api?.pasteText?.(it.text)
                }}
                title="Клик — вставить снова"
              >
                <div style={{ color: '#f3f4f6', whiteSpace: 'pre-wrap' }}>{it.text}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 10, color: '#6b7280' }}>
                  <span>{dateStr} {timeStr}</span>
                  <span style={{ color: '#a855f7' }}>↶ клик — вставить</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div
        style={{
          padding: '8px 10px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: 10,
          color: '#9ca3af',
          textAlign: 'center',
        }}
      >
        Зажми <kbd style={kbdStyle}>Right Alt</kbd> — надиктовать текст
      </div>
    </div>
  )
}
