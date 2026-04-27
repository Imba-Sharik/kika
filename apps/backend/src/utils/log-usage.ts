// Helper для записи AI-usage в БД. Вызывается fire-and-forget из контроллеров
// после того как юзер уже получил ответ (стрим закрыт / payload отправлен).
// Если запись упадёт — юзеру это никак не повлияет, только warning в логах.

type UsageType = 'chat' | 'stt' | 'tts' | 'vision'

export type UsageLogInput = {
  userId: string | number | null | undefined
  type: UsageType
  model?: string
  tokensIn?: number
  tokensOut?: number
  costUsd: number
  durationMs?: number
  turnId?: string
  sessionId?: string
  meta?: Record<string, unknown>
}

export function logUsage(input: UsageLogInput): void {
  // Аноним без auth — пропускаем (но в проде такого быть не должно
  // т.к. AI-роуты гейтятся auth: {} → 401/403 раньше попадания сюда).
  if (input.userId === null || input.userId === undefined) return

  // strapi глобально доступен в Strapi-runtime, не импортируем
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (globalThis as any).strapi
  if (!s) return

  // 1. Insert raw event в Usage (для дебага/audit, gc через 90 дней)
  // 2. Atomic increment counters на User (для quota и быстрых дашбордов)
  // Обе операции fire-and-forget — не блокируют response юзера.
  Promise.all([
    s.db.query('api::usage.usage').create({
      data: {
        user: input.userId,
        type: input.type,
        model: input.model,
        tokensIn: input.tokensIn ?? 0,
        tokensOut: input.tokensOut ?? 0,
        costUsd: input.costUsd,
        durationMs: input.durationMs,
        turnId: input.turnId,
        sessionId: input.sessionId,
        meta: input.meta,
        publishedAt: new Date(),
      },
    }),
    incrementUserCounters(s, input.userId, input.costUsd),
  ]).catch((err: Error) => {
    s.log.warn(`[usage] log failed (${input.type}): ${err.message}`)
  })
}

/**
 * Atomic increment counters на User. Использует knex raw SQL — это работает
 * и в SQLite (local), и в PostgreSQL (prod). Стандартный strapi.db.query().update
 * сначала читает, потом пишет — race condition на параллельных запросах.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function incrementUserCounters(strapi: any, userId: string | number, costUsd: number) {
  const meta = strapi.db.metadata.get('plugin::users-permissions.user')
  const tableName: string = meta.tableName // 'up_users'
  const knex = strapi.db.connection

  // COALESCE на случай если поле NULL (например для юзеров до миграции схемы).
  // last_usage_at — Strapi сам сконвертит camelCase → snake_case.
  await knex(tableName)
    .where('id', userId)
    .update({
      total_cost_usd: knex.raw('COALESCE(total_cost_usd, 0) + ?', [costUsd]),
      total_turns_count: knex.raw('COALESCE(total_turns_count, 0) + 1'),
      last_usage_at: new Date(),
    })
}

// ============================================================
// Cost calculators per provider — апдейтить при изменении тарифов.
// Цены актуальны на 2026-04-27.
// ============================================================

/** Anthropic Claude Haiku 4.5: $1/M input, $5/M output */
export function anthropicHaikuCost(tokensIn: number, tokensOut: number): number {
  return (tokensIn / 1_000_000) * 1 + (tokensOut / 1_000_000) * 5
}

/** Groq Whisper Large V3 Turbo: $0.04 за час аудио */
export function groqWhisperCost(durationSec: number): number {
  return (durationSec / 3600) * 0.04
}

/** Groq Llama 3.1 8B Instant (для STT cleanup): $0.05/M input + output */
export function groqLlamaCost(tokensIn: number, tokensOut: number): number {
  return ((tokensIn + tokensOut) / 1_000_000) * 0.05
}

/** ElevenLabs Turbo v2.5: ~$0.18 за 1k символов */
export function elevenlabsTurboCost(chars: number): number {
  return (chars / 1000) * 0.18
}

/** Fish Audio: $15 за миллион символов */
export function fishCost(chars: number): number {
  return (chars / 1_000_000) * 15
}

// Грубая оценка длительности webm/opus аудио по байтам.
// Whisper/AI SDK не отдают duration напрямую, а decoding ради точности
// — оверкилл. Berkeley: webm/opus VBR ~24 kbps = 3000 bytes/sec.
export function estimateAudioDurationSec(bytes: number): number {
  return bytes / 3000
}
