import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { logUsage, anthropicHaikuCost } from '../../../utils/log-usage'

type Body = {
  image: string // data:image/...;base64,...
  prompt?: string
  language?: string // ISO 639-1: ru, en, ja, ... — для адаптации языка ответа
}

// Универсальный prompt на английском — фронт может override через body.prompt
// (там уже инжектится UI-локаль). Раньше был жёстко "Пиши по-русски" — ломало
// все локали кроме ru.
const DEFAULT_PROMPT =
  'Describe briefly what is on this screenshot (1-3 sentences). ' +
  'If it is anime/game/movie — try to guess the title. ' +
  'If it is a question/test — give the correct answer. ' +
  'If code/error — briefly explain. ' +
  'Be lively, no fluff.'

const LANG_NAME: Record<string, string> = {
  en: 'English', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  de: 'German', fr: 'French', pt: 'Portuguese', es: 'Spanish',
}

export default {
  async describe(ctx) {
    const { image, prompt, language }: Body = ctx.request.body || {}
    if (!image || !image.startsWith('data:image/')) {
      return ctx.badRequest('image (data URL) required')
    }
    // Адаптируем язык ответа под UI-локаль (если фронт передал). Без этого
    // Claude видел английский prompt и отвечал на английском даже когда юзер ru.
    const langSuffix = language && LANG_NAME[language]
      ? ` Reply in ${LANG_NAME[language]}.`
      : ''
    const finalPrompt = (prompt ?? DEFAULT_PROMPT) + langSuffix

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
              { type: 'text', text: finalPrompt },
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
