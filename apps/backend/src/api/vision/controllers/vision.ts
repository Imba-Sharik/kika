import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { logUsage, anthropicHaikuCost } from '../../../utils/log-usage'

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

    const startedAt = Date.now()
    const userId = ctx.state.user?.id
    const usedModel = 'claude-haiku-4-5-20251001'

    try {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/)
      if (!match) {
        return ctx.badRequest('invalid image data URL')
      }
      const [, mediaType, base64] = match

      const { text, usage } = await generateText({
        model: anthropic(usedModel),
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

      queueMicrotask(() => {
        const tokensIn = usage?.inputTokens ?? 0
        const tokensOut = usage?.outputTokens ?? 0
        logUsage({
          userId,
          type: 'vision',
          model: usedModel,
          tokensIn,
          tokensOut,
          costUsd: anthropicHaikuCost(tokensIn, tokensOut),
          durationMs: Date.now() - startedAt,
        })
      })

      return { text }
    } catch (e) {
      strapi.log.error('[vision] failed', e)
      ctx.status = 500
      return { error: e instanceof Error ? e.message : String(e) }
    }
  },
}
