import { readFile } from 'node:fs/promises'
import { experimental_transcribe as transcribe, generateText } from 'ai'
import { groq } from '@ai-sdk/groq'

const DEFAULT_PROMPT =
  'Юкай, Yukai, AI-компаньон, робот, аниме, персонаж, голос, эмоция, подписка, ElevenLabs, Fish Audio.'

// Whisper галлюцинирует знакомые фразы при тишине/шуме (обучен на YouTube-субтитрах).
const HALLUCINATION_PATTERNS: RegExp[] = [
  /dimatorzok/i,
  /субтитры\s+(сделал|подготовил|создал|корректор|редактор)/i,
  /корректор\s+субтитров/i,
  /продолжение\s+следует/i,
  /спасибо\s+за\s+(просмотр|внимание)/i,
  /(подписывайтесь|ставьте\s+лайк|колокольчик)/i,
  /^\s*(thanks?\s+for\s+watching|please\s+subscribe|\[music\]|\[applause\])\s*$/i,
  /^[\s.…,!?-]*$/,
]

function isHallucination(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  return HALLUCINATION_PATTERNS.some((re) => re.test(trimmed))
}

const CLEAN_SYSTEM_PROMPT = `Ты чистишь голосовую диктовку на русском языке для последующей вставки в текстовое поле.

Правила:
- Убирай слова-паразиты: "эм", "ну", "как бы", "типа", "вот", "это самое", "короче", "значит", "так сказать"
- Ставь правильные знаки препинания
- Исправляй падежи, согласования, грамматические ошибки
- Сохраняй смысл, стиль и интонацию
- НЕ добавляй пояснений, кавычек, префиксов
- Верни ТОЛЬКО очищенный текст
- Если текст уже чистый — верни как есть`

async function cleanText(raw: string): Promise<string> {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  try {
    const { text } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      system: CLEAN_SYSTEM_PROMPT,
      prompt: trimmed,
      temperature: 0.1,
    })
    return text.trim() || trimmed
  } catch (e) {
    strapi.log.error('[stt] cleanup failed', e)
    return trimmed
  }
}

export default {
  async transcribe(ctx) {
    try {
      // Strapi body parser кладёт файлы из multipart в ctx.request.files
      const files = (ctx.request.files || {}) as Record<
        string,
        { filepath?: string; path?: string; mimetype?: string; size?: number } | undefined
      >
      const audioFile = files.audio
      if (!audioFile) {
        return ctx.badRequest('audio file required')
      }

      const filepath = audioFile.filepath || audioFile.path
      if (!filepath) {
        return ctx.badRequest('audio filepath missing')
      }

      const body = (ctx.request.body || {}) as Record<string, string>
      const language = body.language || 'ru'
      const prompt = body.prompt || DEFAULT_PROMPT
      const clean = body.clean === 'true'

      const bytes = await readFile(filepath)

      const { text } = await transcribe({
        model: groq.transcription('whisper-large-v3-turbo'),
        audio: new Uint8Array(bytes),
        providerOptions: { groq: { language, prompt } },
      })

      if (isHallucination(text)) {
        strapi.log.info(`[stt] hallucination filtered: ${JSON.stringify(text)}`)
        return { text: '' }
      }

      return { text: clean ? await cleanText(text) : text }
    } catch (e) {
      strapi.log.error('[stt] failed', e)
      ctx.status = 500
      return { error: e instanceof Error ? e.message : String(e) }
    }
  },
}
