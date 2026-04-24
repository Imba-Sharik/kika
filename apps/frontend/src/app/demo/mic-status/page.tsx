'use client'

import { useEffect, useRef, useState } from 'react'

// Демо трёх вариантов статуса микрофона у персонажа Кики.
// Каждый вариант показан в 3 состояниях: off / listening / error.

type MicState = 'off' | 'listening' | 'error'

const STATES: MicState[] = ['off', 'listening', 'error']
const STATE_LABEL: Record<MicState, string> = {
  off: 'Выкл',
  listening: 'Слушает',
  error: 'Ошибка',
}

function CharacterPlaceholder({ size = 180 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #ffe5f0, #ffb8d1 60%, #ff85a8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.45,
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        userSelect: 'none',
      }}
    >
      🐱
    </div>
  )
}

// --- Вариант 1: точка-индикатор под персонажем ---
function Variant1Dot({ state, size = 180 }: { state: MicState; size?: number }) {
  const color = state === 'listening' ? '#22c55e' : state === 'error' ? '#ef4444' : '#9ca3af'
  const pulse = state === 'listening'
  return (
    <div style={{ position: 'relative', width: size, height: size + 24 }}>
      <CharacterPlaceholder size={size} />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: color,
          boxShadow: pulse ? `0 0 0 0 ${color}` : 'none',
          animation: pulse ? 'mic-pulse 1.4s ease-out infinite' : 'none',
          transition: 'background 200ms',
        }}
      />
      <style jsx>{`
        @keyframes mic-pulse {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); }
          70% { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
      `}</style>
    </div>
  )
}

// --- Вариант 2: тонкое кольцо вокруг персонажа ---
function Variant2Ring({ state, size = 180 }: { state: MicState; size?: number }) {
  const color =
    state === 'listening'
      ? 'rgba(34,197,94,0.7)'
      : state === 'error'
      ? 'rgba(239,68,68,0.7)'
      : 'rgba(156,163,175,0.35)'
  const pulse = state === 'listening'
  const ringSize = size + 16
  return (
    <div style={{ position: 'relative', width: ringSize, height: ringSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `2px solid ${color}`,
          animation: pulse ? 'mic-ring 1.8s ease-out infinite' : 'none',
          transition: 'border-color 300ms',
        }}
      />
      {pulse && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `2px solid rgba(34,197,94,0.5)`,
            animation: 'mic-ring-out 1.8s ease-out infinite',
          }}
        />
      )}
      <CharacterPlaceholder size={size} />
      <style jsx>{`
        @keyframes mic-ring {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.02); opacity: 0.85; }
        }
        @keyframes mic-ring-out {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.15); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// --- Вариант 3: волна-визуализатор снизу ---
function Variant3Bars({ state, size = 180 }: { state: MicState; size?: number }) {
  // Анимированные уровни — обновляются только когда listening.
  // Флат-значения для других состояний вычисляются в render, не в state.
  const IDLE_LEVELS = [0.15, 0.15, 0.15, 0.15, 0.15]
  const [animated, setAnimated] = useState<number[]>([0.2, 0.4, 0.3, 0.5, 0.3])
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (state !== 'listening') return
    const tick = () => {
      setAnimated((prev) => prev.map(() => 0.2 + Math.random() * 0.8))
      rafRef.current = window.setTimeout(tick, 120) as unknown as number
    }
    tick()
    return () => {
      if (rafRef.current) clearTimeout(rafRef.current)
    }
  }, [state])

  const levels = state === 'listening' ? animated : IDLE_LEVELS

  const barColor = state === 'listening' ? '#22c55e' : state === 'error' ? '#ef4444' : '#9ca3af'

  return (
    <div style={{ position: 'relative', width: size, height: size + 32, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <CharacterPlaceholder size={size} />
      <div style={{ display: 'flex', gap: 4, marginTop: 8, height: 20, alignItems: 'center' }}>
        {levels.map((lv, i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: `${lv * 20}px`,
              minHeight: 4,
              borderRadius: 2,
              background: barColor,
              transition: 'height 80ms ease-out, background 200ms',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function VariantColumn({
  title,
  description,
  render,
  state,
  onStateChange,
}: {
  title: string
  description: string
  render: (state: MicState) => React.ReactNode
  state: MicState
  onStateChange: (s: MicState) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 20, background: '#f8f9fb', borderRadius: 16, minWidth: 260 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h3>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7280', textAlign: 'center' }}>{description}</p>
      </div>
      <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {render(state)}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {STATES.map((s) => (
          <button
            key={s}
            onClick={() => onStateChange(s)}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              borderRadius: 8,
              border: state === s ? '2px solid #3b82f6' : '1px solid #d1d5db',
              background: state === s ? '#eff6ff' : 'white',
              cursor: 'pointer',
              fontWeight: state === s ? 600 : 400,
            }}
          >
            {STATE_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function MicStatusDemoPage() {
  const [s1, setS1] = useState<MicState>('listening')
  const [s2, setS2] = useState<MicState>('listening')
  const [s3, setS3] = useState<MicState>('listening')

  return (
    <div style={{ minHeight: '100vh', background: '#fff', padding: 40, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700 }}>Статус микрофона — выбор варианта</h1>
        <p style={{ margin: '0 0 32px', color: '#6b7280' }}>
          Переключай состояния кнопками под каждым вариантом. Персонаж — плейсхолдер, в реальности будет KikaFace.
        </p>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          <VariantColumn
            title="1. Точка-индикатор"
            description="Маленький кружок под персонажем. Минимально, не отвлекает."
            render={(s) => <Variant1Dot state={s} />}
            state={s1}
            onStateChange={setS1}
          />
          <VariantColumn
            title="2. Кольцо вокруг"
            description="Тонкая обводка 2px. Пульсирует когда слушает (как Siri)."
            render={(s) => <Variant2Ring state={s} />}
            state={s2}
            onStateChange={setS2}
          />
          <VariantColumn
            title="3. Волна-визуализатор"
            description="5 полосок снизу. Прыгают по уровню голоса. Самое живое."
            render={(s) => <Variant3Bars state={s} />}
            state={s3}
            onStateChange={setS3}
          />
        </div>
      </div>
    </div>
  )
}
