import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

type Body = {
  // base64 data URL: "data:image/png;base64,..."
  image: string
  // Что именно спросить у Claude. Дефолт — "опиши коротко".
  prompt?: string
}

const DEFAULT_PROMPT =
  'Опиши коротко что на этом скриншоте (1-3 предложения). ' +
  'Если это аниме/игра/фильм — попробуй угадать название. ' +
  'Если это вопрос/тест — дай правильный ответ. ' +
  'Если код/ошибка — кратко объясни что не так. ' +
  'Пиши по-русски, живо, без воды.'

export async function POST(req: NextRequest) {
  const { image, prompt }: Body = await req.json()
  if (!image || !image.startsWith('data:image/')) {
    return Response.json({ error: 'image (data URL) required' }, { status: 400 })
  }

  try {
    // Парсим data URL → { mediaType, base64 }
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!match) {
      return Response.json({ error: 'invalid image data URL' }, { status: 400 })
    }
    const [, mediaType, base64] = match

    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt ?? DEFAULT_PROMPT },
            { type: 'image', image: base64, mediaType },
          ],
        },
      ],
    })

    return Response.json({ text })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
