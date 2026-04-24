import type { RequestConfig } from '@kubb/plugin-client/clients/axios'

const STRAPI_URL =
  process.env.STRAPI_URL ??
  process.env.NEXT_PUBLIC_STRAPI_URL ??
  'http://localhost:1337'

/**
 * Единственное место с URL бэкенда.
 * При миграции на NestJS — менять только здесь.
 */
export const STRAPI_API_URL = `${STRAPI_URL}/api`

/** Для Kubb-клиентов (axios) в application-коде */
export function strapiConfig(token?: string): Partial<RequestConfig> {
  return {
    baseURL: STRAPI_API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }
}
