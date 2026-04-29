'use client'

import { getSession } from 'next-auth/react'
import { getAiBaseUrl } from './strapi'

/**
 * Обёртка над fetch для AI-эндпоинтов на Strapi:
 * - префиксит путь через getAiBaseUrl() (host-based: api.yukai.app или relay.yukai.app)
 * - подкладывает Authorization: Bearer <strapiJwt> из NextAuth-сессии
 *
 * Юзер без сессии получит 401 от Strapi (после Phase 5a — auth: {} на роутах).
 *
 * Использовать вместо `fetch('/api/chat', ...)` или `fetch(`${getAiBaseUrl()}/chat`, ...)`
 * во всех call-sites: useChat, fetchTts, useDictation, useMicListener,
 * ListenButton, MicButton.
 *
 * `path` — относительный путь без префикса /api (например `/chat`, `/stt`, `/tts`).
 */
export async function aiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const session = await getSession()
  const jwt = session?.strapiJwt

  const headers = new Headers(init.headers)
  if (jwt && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${jwt}`)
  }

  const res = await fetch(`${getAiBaseUrl()}${path}`, { ...init, headers })

  // 402 Payment Required — trial закончился или подписка истекла. Сигналим
  // глобально, чтобы useTrialStatus мог обновиться и показать blocking-bubble.
  if (res.status === 402 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('billing:expired'))
  }

  return res
}
