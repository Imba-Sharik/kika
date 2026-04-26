import type { RequestConfig } from '@kubb/plugin-client/clients/axios'

const STRAPI_URL =
  process.env.STRAPI_URL ??
  process.env.NEXT_PUBLIC_STRAPI_URL ??
  'http://localhost:1337'

/**
 * Единственное место с URL бэкенда.
 * Используется для server-side вызовов (auth, CRUD) и SSR.
 */
export const STRAPI_API_URL = `${STRAPI_URL}/api`

/** Для Kubb-клиентов (axios) в application-коде */
export function strapiConfig(token?: string): Partial<RequestConfig> {
  return {
    baseURL: STRAPI_API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }
}

/**
 * AI base URL для клиентских запросов (chat/stt/tts/vision).
 * Выбирается по hostname:
 * - ru.yukai.app → https://relay.yukai.app/api (Timeweb-прокси, минует AI-блокировки РФ)
 * - всё остальное → STRAPI_API_URL
 *
 * Зачем отдельно от STRAPI_API_URL: CRUD/auth идут напрямую в Railway даже для РФ
 * (Strapi REST не блокируется), а AI-провайдеры (Anthropic/ElevenLabs/Groq) могут
 * быть недоступны → роутим через relay.
 */
export function getAiBaseUrl(): string {
  if (typeof window === 'undefined') return STRAPI_API_URL
  const host = window.location.hostname
  if (host === 'ru.yukai.app') {
    return process.env.NEXT_PUBLIC_AI_RELAY_URL ?? 'https://relay.yukai.app/api'
  }
  return STRAPI_API_URL
}
