'use client'

import { useEffect, useState } from 'react'
import { statusOf, type EnglishItem, type EnglishStatus } from './english-md'

const STATUS_META: Record<EnglishStatus, { color: string; bg: string }> = {
  new: { color: '#9ca3af', bg: 'rgba(156,163,175,0.2)' },
  learning: { color: '#fbbf24', bg: 'rgba(251,191,36,0.25)' },
  known: { color: '#22c55e', bg: 'rgba(34,197,94,0.25)' },
}

type CardProps = {
  item: EnglishItem
  // Локализованные label'ы статусов передаются от EnglishPanel
  statusLabels: Record<EnglishStatus, string>
}

export function EnglishCard({ item, statusLabels }: CardProps) {
  const { word, ts } = item
  const status = statusOf(item)
  const meta = STATUS_META[status]
  const label = statusLabels[status]
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/unsplash?q=${encodeURIComponent(word)}&per_page=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j?.photos?.[0]) setImgUrl(j.photos[0].url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [word])
  const date = new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  return (
    <div
      style={{
        borderRadius: 6,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
      }}
      title={`${item.correct}✓  ${item.wrong}✗  serie: ${item.streak}`}
    >
      <div
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          background: meta.bg,
          color: meta.color,
          padding: '2px 6px',
          borderRadius: 10,
          fontSize: 9,
          fontWeight: 600,
          zIndex: 2,
        }}
      >
        {label}
      </div>
      <div style={{ aspectRatio: '1 / 1', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {imgUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={imgUrl} alt={word} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        ) : (
          <span style={{ color: '#444', fontSize: 10 }}>…</span>
        )}
      </div>
      <div style={{ padding: '4px 6px' }}>
        <div style={{ color: '#f3f4f6', fontWeight: 600, fontSize: 11 }}>{word}</div>
        <div style={{ color: '#6b7280', fontSize: 9, display: 'flex', gap: 6 }}>
          <span>{date}</span>
          {(item.correct > 0 || item.wrong > 0) && (
            <span>
              <span style={{ color: '#22c55e' }}>{item.correct}✓</span>
              {' '}
              <span style={{ color: '#ef4444' }}>{item.wrong}✗</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function EnglishHistoryGrid({ items, statusLabels }: { items: EnglishItem[]; statusLabels: Record<EnglishStatus, string> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6 }}>
      {items.map((it) => (
        <EnglishCard key={it.word} item={it} statusLabels={statusLabels} />
      ))}
    </div>
  )
}
