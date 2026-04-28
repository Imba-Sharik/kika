import { readFile, stat } from 'node:fs/promises'
import { experimental_transcribe as transcribe, generateText } from 'ai'
import { groq } from '@ai-sdk/groq'
import {
  logUsage,
  groqWhisperCost,
  groqLlamaCost,
  estimateAudioDurationSec,
} from '../../../utils/log-usage'

// Whisper использует prompt как контекстный hint (стиль, имена собственные).
// Per-language prompts: brand keywords + characteristic слова на нужном языке —
// помогают распознать "Yukai" / "Юкай" / "愉快" правильно. Default RU оставлен для
// backward-совместимости когда language не передан.
const PROMPTS: Record<string, string> = {
  ru: 'Юкай, Yukai, AI-компаньон, робот, аниме, персонаж, голос, эмоция, подписка.',
  en: 'Yukai, AI companion, robot, anime, character, voice, emotion, subscription.',
  ja: '愉快、Yukai、AIコンパニオン、ロボット、アニメ、キャラクター、声、感情。',
  ko: 'Yukai, AI 컴패니언, 로봇, 애니메이션, 캐릭터, 목소리, 감정.',
  zh: '愉快, Yukai, AI伴侣, 机器人, 动漫, 角色, 声音, 情感。',
  de: 'Yukai, KI-Begleiter, Roboter, Anime, Charakter, Stimme, Emotion.',
  fr: 'Yukai, compagnon IA, robot, anime, personnage, voix, émotion.',
  pt: 'Yukai, companheira IA, robô, anime, personagem, voz, emoção.',
  es: 'Yukai, compañera IA, robot, anime, personaje, voz, emoción.',
}
const DEFAULT_PROMPT = PROMPTS.ru

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

// Универсальный prompt — Llama чистит на любом языке. Слова-паразиты
// перечисляем generically ("filler words" на английском, конкретные примеры
// для топ-локалей), но основное правило — сохранить язык input'а.
const CLEAN_SYSTEM_PROMPT = `You clean voice dictation for pasting into a text field.

Rules:
- Keep the original language of the input — do NOT translate
- Remove filler words ("эм", "ну", "типа" / "um", "uh", "like" / "えっと", "あの" / etc.)
- Add proper punctuation and capitalization
- Fix grammar, agreement, conjugation
- Preserve meaning, style, tone
- NO explanations, quotes, prefixes — return ONLY the cleaned text
- If text is already clean, return as-is`

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
    const startedAt = Date.now()
    const userId = ctx.state.user?.id
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
      // Per-language prompt — клиент может override через body.prompt, иначе
      // берётся из карты по language. Без этого Whisper bias'ил к русскому.
      const prompt = body.prompt || PROMPTS[language] || DEFAULT_PROMPT
      const clean = body.clean === 'true'

      const bytes = await readFile(filepath)
      const audioBytes = audioFile.size ?? (await stat(filepath)).size
      const durationSec = estimateAudioDurationSec(audioBytes)

      const { text } = await transcribe({
        model: groq.transcription('whisper-large-v3-turbo'),
        audio: new Uint8Array(bytes),
        providerOptions: { groq: { language, prompt } },
      })

      const hallucinated = isHallucination(text)
      if (hallucinated) {
        strapi.log.info(`[stt] hallucination filtered: ${JSON.stringify(text)}`)
      }
      const finalText = hallucinated
        ? ''
        : clean
          ? await cleanText(text)
          : text

      // Логируем после получения результата, перед return — но fire-and-forget
      // через queueMicrotask чтоб не блокировать ответ юзеру.
      queueMicrotask(() => {
        logUsage({
          userId,
          type: 'stt',
          model: 'whisper-large-v3-turbo',
          tokensIn: 0,
          tokensOut: finalText.length,
          costUsd: groqWhisperCost(durationSec) + (clean ? groqLlamaCost(text.length, finalText.length) : 0),
          durationMs: Date.now() - startedAt,
          meta: { audioBytes, language, clean, hallucinated },
        })
      })

      return { text: finalText }
    } catch (e) {
      strapi.log.error('[stt] failed', e)
      ctx.status = 500
      return { error: e instanceof Error ? e.message : String(e) }
    }
  },
}
