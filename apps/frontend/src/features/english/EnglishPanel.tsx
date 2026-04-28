'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { EnglishHistoryGrid } from './EnglishCard'
import { statusOf, type EnglishItem, type EnglishStatus } from './english-md'

type Props = {
  items: EnglishItem[]
  onClose: () => void
}

const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

export function EnglishPanel({ items, onClose }: Props) {
  const t = useTranslations()
  const [filter, setFilter] = useState<'all' | EnglishStatus>('all')
  const known = items.filter((it) => statusOf(it) === 'known').length
  const learning = items.filter((it) => statusOf(it) === 'learning').length
  const newish = items.filter((it) => statusOf(it) === 'new').length
  const filtered = filter === 'all' ? items : items.filter((it) => statusOf(it) === filter)

  const STATUS_LABEL: Record<EnglishStatus, string> = {
    new: t('english.tab.new'),
    learning: t('english.tab.learning'),
    known: t('english.tab.known'),
  }

  // ICU MessageFormat: t() поддерживает {var} плейсхолдеры через 2-й аргумент
  const stats = t('english.stats', { known, learning, newish })

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
        <span style={{ fontSize: 14 }}>🔤</span>
        <span style={{ color: '#fbbf24', fontWeight: 600 }}>English</span>
        <span style={{ color: '#9ca3af', flex: 1, fontSize: 10 }}>
          · {items.length} {stats}
        </span>
        <button
          onClick={onClose}
          title={t('common.close')}
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

      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 4, padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {(['all', 'new', 'learning', 'known'] as const).map((tab) => {
            const isActive = filter === tab
            const label = tab === 'all' ? t('english.tab.all') : STATUS_LABEL[tab]
            const count = tab === 'all'
              ? items.length
              : items.filter((it) => statusOf(it) === tab).length
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                style={{
                  background: isActive ? 'rgba(236,72,153,0.2)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: isActive ? '#fbbf24' : '#9ca3af',
                  padding: '3px 10px',
                  borderRadius: 12,
                  fontSize: 10,
                  cursor: 'pointer',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {label} <span style={{ opacity: 0.6 }}>{count}</span>
              </button>
            )
          })}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {items.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic', padding: 12, textAlign: 'center' }}>
            {t('common.empty')}
            <br />
            <span style={{ color: '#666', fontSize: 10 }}>
              {t('english.empty.hint')}
            </span>
          </div>
        ) : (
          <EnglishHistoryGrid items={filtered} statusLabels={STATUS_LABEL} />
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
        {t('english.bottom.hint')}
      </div>
    </div>
  )
}
