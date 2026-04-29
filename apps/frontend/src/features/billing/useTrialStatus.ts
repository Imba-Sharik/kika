'use client'

import { useCallback, useEffect, useState } from 'react'
import { aiFetch } from '@/shared/api/aiFetch'

export type QuotaResponse = {
  spent: number
  limit: number
  remaining: number
  percentage: number
  resetsAt: string
  tier: 'trial' | 'free' | 'paid'
  trialDaysLeft: number | null
  subscriptionUntil: string | null
}

/**
 * Стейт subscription/trial для UI:
 *   - 'ok'         — подписка активна или trial >= 3 дней (ничего не показываем)
 *   - 'warning'    — trial: 1-2 дня осталось (жёлтая баббл, dismissable)
 *   - 'last-day'   — trial: < 1 дня (та же, но настойчивее)
 *   - 'expired'    — trial закончился (красная блокирующая)
 *   - 'paid-expired' — подписка истекла (красная блокирующая)
 */
export type TrialStatus = 'ok' | 'warning' | 'last-day' | 'expired' | 'paid-expired'

function computeStatus(q: QuotaResponse | null, hadExpired402: boolean): TrialStatus {
  if (!q) return 'ok'
  if (hadExpired402 && q.tier === 'trial') return 'expired'
  if (hadExpired402 && q.tier === 'paid') return 'paid-expired'

  if (q.tier === 'paid') {
    if (q.subscriptionUntil && new Date(q.subscriptionUntil).getTime() < Date.now()) {
      return 'paid-expired'
    }
    return 'ok'
  }
  if (q.tier === 'free') return 'ok'

  // tier === 'trial'
  if (q.trialDaysLeft === null) return 'ok'
  if (q.trialDaysLeft <= 0) return 'expired'
  if (q.trialDaysLeft <= 1) return 'last-day'
  if (q.trialDaysLeft <= 2) return 'warning'
  return 'ok'
}

export function useTrialStatus() {
  const [data, setData] = useState<QuotaResponse | null>(null)
  const [hadExpired402, setHadExpired402] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await aiFetch('/me/quota')
      if (res.ok) {
        const json = (await res.json()) as QuotaResponse
        setData(json)
        // Если бэк подтвердил что подписка активна — сбрасываем 402-флаг
        // (юзер только что оплатил)
        if (json.tier === 'paid' && json.subscriptionUntil &&
            new Date(json.subscriptionUntil).getTime() > Date.now()) {
          setHadExpired402(false)
        }
        if (json.tier === 'trial' && (json.trialDaysLeft ?? 0) > 0) {
          setHadExpired402(false)
        }
      }
    } catch {
      // Сеть отвалилась — не дёргаем UI
    }
  }, [])

  useEffect(() => {
    refresh()
    // Раз в минуту обновляем — для случаев когда trial истёк за сессию
    const interval = setInterval(refresh, 60_000)
    // 402 от любого AI-эндпоинта → принудительно ставим expired + рефреш
    const onExpire = () => {
      setHadExpired402(true)
      refresh()
    }
    window.addEventListener('billing:expired', onExpire)
    return () => {
      clearInterval(interval)
      window.removeEventListener('billing:expired', onExpire)
    }
  }, [refresh])

  const status = computeStatus(data, hadExpired402)

  return {
    quota: data,
    status,
    refresh,
    isBlocked: status === 'expired' || status === 'paid-expired',
  }
}
