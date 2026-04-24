import { experimental_transcribe as transcribe, generateText } from 'ai'
import { groq } from '@ai-sdk/groq'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const DEFAULT_PROMPT =
  'Юкай, Yukai, AI-компаньон, робот, аниме, персонаж, голос, эмоция, подписка, ElevenLabs, Fish Audio.'

// Whisper обучен на YouTube-субтитрах и при тишине/шуме галлюцинирует
// знакомые фразы. Режем их, возвращаем пустую строку (юзер ничего не сказал).
const HALLUCINATION_PATTERNS: RegExp[] = [
  /dimatorzok/i,                           // "Субтитры сделал DimaTorzok"
  /субтитры\s+(сделал|подготовил|создал|корректор|редактор)/i,
  /корректор\s+субтитров/i,
  /продолжение\s+следует/i,
  /спасибо\s+за\s+(просмотр|внимание)/i,
  /(подписывайтесь|ставьте\s+лайк|колокольчик)/i,
  /^\s*(thanks?\s+for\s+watching|please\s+subscribe|\[music\]|\[applause\])\s*$/i,
  /^[\s.…,!?-]*$/,                         // только знаки препинания
]

function isHallucination(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false // пустая строка — не галлюцинация, просто тишина
  return HALLUCINATION_PATTERNS.some((re) => re.test(trimmed))
}

const CLEAN_SYSTEM_PROMPT = `Ты чистишь голосовую диктовку на русском языке для последующей вставки в текстовое поле.

Правила:
- Убирай слова-паразиты: "эм", "ну", "как бы", "типа", "вот", "это самое", "короче", "значит", "так сказать"
- Ставь правильные знаки препинания: запятые, точки, вопросительные и восклицательные знаки
- Исправляй падежи, согласования, грамматические ошибки
- Сохраняй смысл, стиль и интонацию говорящего
- НЕ добавляй пояснений, кавычек, префиксов типа "Вот:" или "Очищенный текст:"
- Верни ТОЛЬКО очищенный текст, одной строкой если это короткое предложение, или с абзацами если диктовка длинная
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
    console.error('[stt] cleanup failed:', e)
    return trimmed
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio')
    const language = (formData.get('language') as string) || 'ru'
    const prompt = (formData.get('prompt') as string) || DEFAULT_PROMPT
    const clean = formData.get('clean') === 'true'

    if (!(audioFile instanceof File)) {
      return Response.json({ error: 'audio file required' }, { status: 400 })
    }

    const bytes = new Uint8Array(await audioFile.arrayBuffer())

    const { text } = await transcribe({
      model: groq.transcription('whisper-large-v3-turbo'),
      audio: bytes,
      providerOptions: {
        groq: { language, prompt },
      },
    })

    if (isHallucination(text)) {
      console.log('[stt] hallucination filtered:', JSON.stringify(text))
      return Response.json({ text: '' })
    }

    const finalText = clean ? await cleanText(text) : text
    return Response.json({ text: finalText })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
