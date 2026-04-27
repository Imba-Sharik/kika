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

  s.db
    .query('api::usage.usage')
    .create({
      data: {
        user: input.userId,
        type: input.type,
        model: input.model,
        tokensIn: input.tokensIn ?? 0,
        tokensOut: input.tokensOut ?? 0,
        costUsd: input.costUsd,
        durationMs: input.durationMs,
        meta: input.meta,
        publishedAt: new Date(),
      },
    })
    .catch((err: Error) => {
      s.log.warn(`[usage] log failed (${input.type}): ${err.message}`)
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
