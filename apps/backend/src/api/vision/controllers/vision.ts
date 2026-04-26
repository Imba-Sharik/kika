import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

type Body = {
  image: string // data:image/...;base64,...
  prompt?: string
}

const DEFAULT_PROMPT =
  'Опиши коротко что на этом скриншоте (1-3 предложения). ' +
  'Если это аниме/игра/фильм — попробуй угадать название. ' +
  'Если это вопрос/тест — дай правильный ответ. ' +
  'Если код/ошибка — кратко объясни что не так. ' +
  'Пиши по-русски, живо, без воды.'

export default {
  async describe(ctx) {
    const { image, prompt }: Body = ctx.request.body || {}
    if (!image || !image.startsWith('data:image/')) {
      return ctx.badRequest('image (data URL) required')
    }

    try {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!match) {
        return ctx.badRequest('invalid image data URL')
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

      return { text }
    } catch (e) {
      strapi.log.error('[vision] failed', e)
      ctx.status = 500
      return { error: e instanceof Error ? e.message : String(e) }
    }
  },
}
