'use client'

import { type CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import type { QuotaResponse, TrialStatus } from './useTrialStatus'

const BILLING_URL = 'https://yukai.app/billing'

const noDragStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties

type Props = {
  status: TrialStatus
  quota: QuotaResponse | null
  onDismiss?: () => void  // только для warning/last-day; expired — не закрывается
}

/**
 * Билинг-баббл рядом с Yukai. Тот же визуальный паттерн что AuthGateBubble:
 * градиент + стрелка к персонажу. Цвет градиента зависит от status —
 * жёлтый для warning, красный для expired.
 *
 * 'ok' — компонент не рендерится (вызывающий должен фильтровать).
 */
export function TrialStatusBubble({ status, quota, onDismiss }: Props) {
  const t = useTranslations('billing')

  if (status === 'ok') return null

  const blocking = status === 'expired' || status === 'paid-expired'
  const gradient = blocking
    ? 'linear-gradient(135deg, rgba(239,68,68,0.96), rgba(220,38,38,0.96))'
    : 'linear-gradient(135deg, rgba(245,158,11,0.96), rgba(217,119,6,0.96))'
  const shadow = blocking
    ? '0 6px 20px rgba(239,68,68,0.4)'
    : '0 6px 20px rgba(245,158,11,0.4)'

  function openBilling() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI
    if (api?.openExternal) {
      api.openExternal(BILLING_URL)
    } else {
      window.open(BILLING_URL, '_blank', 'noopener,noreferrer')
    }
  }

  // Подбираем тексты по статусу
  let title: string
  let body: string
  if (status === 'expired') {
    title = `💔 ${t('trialExpiredTitle')}`
    body = t('trialExpiredBody')
  } else if (status === 'paid-expired') {
    title = `⚠️ ${t('subExpiredTitle')}`
    body = t('subExpiredBody')
  } else if (status === 'last-day') {
    title = `🥺 ${t('lastDayTitle')}`
    body = t('lastDayBody')
  } else {
    // warning
    const days = quota?.trialDaysLeft ?? 0
    title = `⏰ ${t('warningTitle', { days })}`
    body = t('warningBody')
  }

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        ...noDragStyle,
        position: 'absolute',
        bottom: 30,
        left: 200,
        width: 250,
        padding: '14px 16px',
        background: gradient,
        color: 'white',
        borderRadius: 10,
        fontSize: 12,
        lineHeight: 1.4,
        boxShadow: shadow,
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
        {!blocking && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="dismiss"
            style={{
              flexShrink: 0,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.25)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: 1,
              padding: 0,
              marginTop: -2,
            }}
          >
            ×
          </button>
        )}
      </div>

      <div style={{ marginBottom: 12, opacity: 0.95 }}>{body}</div>

      <button
        type="button"
        onClick={openBilling}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.22)',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: 6,
          color: 'white',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        ⚡ {t('subscribeCta')}
      </button>
      <div style={{ marginTop: 6, fontSize: 10, opacity: 0.75, textAlign: 'center' }}>
        {t('paymentMethods')}
      </div>

      {/* Стрелочка к персонажу */}
      <div
        style={{
          position: 'absolute',
          left: -8,
          bottom: 22,
          width: 0,
          height: 0,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderRight: `8px solid ${blocking ? 'rgba(239,68,68,0.96)' : 'rgba(245,158,11,0.96)'}`,
        }}
      />
    </div>
  )
}
