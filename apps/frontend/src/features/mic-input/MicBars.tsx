'use client'

import { useEffect, useState } from 'react'
import type { VadState } from './useMicListener'

type Props = {
  state: VadState
  micLevel: number // 0..1 от аудио-анализатора
  onClick: () => void
  error?: string | null
}

// Волна-визуализатор под персонажем.
// - off: ровные точки, серый
// - listening: полоски прыгают по micLevel, зелёный
// - speech: ярче и выше (юзер говорит)
// - transcribing: плавная "дыхательная" анимация
// - error: красный, flat
export function MicBars({ state, micLevel, onClick, error }: Props) {
  const bars = 5
  const isOn = state !== 'off' && state !== 'error'

  // Для состояний без сигнала (transcribing, loading) — свой тик для анимации
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (state !== 'transcribing' && state !== 'loading') return
    const id = setInterval(() => setTick((t) => t + 1), 120)
    return () => clearInterval(id)
  }, [state])
  const color =
    state === 'error'
      ? '#ef4444'
      : state === 'speech'
      ? '#22c55e'
      : state === 'transcribing'
      ? '#3b82f6'
      : state === 'listening'
      ? '#22c55e'
      : '#6b7280'

  // Детерминированный узор высот из уровня — бары разной динамики
  function barHeight(i: number): number {
    if (state === 'off') return 3
    if (state === 'error') return 5
    if (state === 'loading' || state === 'transcribing') {
      // "Дыхание" — волна по индексу
      const phase = (tick + i) % bars
      return 4 + Math.abs(phase - (bars - 1) / 2) * 3
    }
    // listening / speech: следуем за реальным уровнем micLevel.
    // base — минимум чтобы при идеальной тишине бары не схлопывались в точки.
    const base = state === 'speech' ? 0.15 : 0.05
    const amp = state === 'speech' ? 22 : 14
    const centerBoost = 1 - Math.abs(i - (bars - 1) / 2) / bars
    const level = Math.max(base, micLevel)
    return 4 + level * amp * (0.6 + centerBoost * 0.4)
  }

  const title =
    state === 'off'
      ? 'Включить hands-free (Ctrl+Z)'
      : state === 'error'
      ? `Ошибка: ${error ?? ''}`
      : state === 'transcribing'
      ? 'Распознаю...'
      : state === 'speech'
      ? 'Говоришь...'
      : state === 'loading'
      ? 'Загрузка...'
      : 'Слушаю (клик — выключить)'

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        justifyContent: 'center',
        height: 24,
        padding: '4px 10px',
        background: 'rgba(0,0,0,0.35)',
        border: 'none',
        borderRadius: 12,
        cursor: 'pointer',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        transition: 'background 200ms',
      }}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: `${barHeight(i)}px`,
            minHeight: 3,
            borderRadius: 2,
            background: color,
            transition: 'height 80ms ease-out, background 200ms',
            opacity: isOn ? 1 : 0.6,
          }}
        />
      ))}
    </button>
  )
}
