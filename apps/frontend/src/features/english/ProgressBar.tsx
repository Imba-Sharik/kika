'use client'

import type { ProgressEntry } from './english-md'

type Props = {
  entries: ProgressEntry[]
}

// Компактный график-полоса последних сессий: высота столбика = total reviewed,
// цвет = accuracy (зелёный → красный). Hover показывает детали.
export function ProgressBar({ entries }: Props) {
  const last = entries.slice(-14) // последние 14 сессий
  const maxTotal = Math.max(1, ...last.map((e) => e.reviewed + e.newWords))

  // Агрегаты для бейджа сверху
  const totalReviewed = entries.reduce((s, e) => s + e.reviewed, 0)
  const totalCorrect = entries.reduce((s, e) => s + e.correct, 0)
  const totalWrong = entries.reduce((s, e) => s + e.wrong, 0)
  const overallAccuracy = totalReviewed > 0
    ? Math.round((totalCorrect / (totalCorrect + totalWrong || 1)) * 100)
    : 0

  return (
    <div
      style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '6px 10px 8px',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 9,
          color: '#9ca3af',
          marginBottom: 4,
        }}
      >
        <span style={{ color: '#fbbf24', fontWeight: 600 }}>📊 Прогресс</span>
        <span>{entries.length} сессий</span>
        <span>·</span>
        <span>{totalReviewed} повт.</span>
        <span>·</span>
        <span style={{ color: overallAccuracy >= 80 ? '#22c55e' : overallAccuracy >= 60 ? '#fbbf24' : '#ef4444' }}>
          {overallAccuracy}% точность
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32 }}>
        {last.map((e, i) => {
          const total = e.reviewed + e.newWords
          const heightPct = (total / maxTotal) * 100
          const accuracy = e.correct + e.wrong > 0
            ? e.correct / (e.correct + e.wrong)
            : 0
          // Цвет: green→yellow→red по точности
          const color = accuracy >= 0.8 ? '#22c55e' : accuracy >= 0.6 ? '#fbbf24' : e.correct + e.wrong === 0 ? '#6b7280' : '#ef4444'
          return (
            <div
              key={i}
              title={`${e.date}\n${e.newWords} новых · ${e.reviewed} повт. · ${e.correct}✓ / ${e.wrong}✗`}
              style={{
                flex: 1,
                height: `${Math.max(heightPct, 6)}%`,
                background: color,
                borderRadius: 2,
                cursor: 'help',
                opacity: 0.85,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
