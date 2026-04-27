import { Readable } from 'node:stream'
import { experimental_generateSpeech as generateSpeech } from 'ai'
import { elevenlabs } from '@ai-sdk/elevenlabs'
import { logUsage, elevenlabsTurboCost, fishCost } from '../../../utils/log-usage'

type Provider = 'elevenlabs' | 'fish'
type Model = 'eleven_v3' | 'eleven_multilingual_v2' | 'eleven_turbo_v2_5' | 'eleven_flash_v2_5'

type Body = {
  text: string
  emotion?: string
  voiceId?: string
  provider?: Provider
  model?: Model
}

async function ttsElevenLabs(ctx, text: string, voiceId: string, model: Model) {
  const { audio } = await generateSpeech({
    model: elevenlabs.speech(model),
    text,
    voice: voiceId,
  })
  ctx.set('Content-Type', audio.mediaType || 'audio/mpeg')
  ctx.set('Cache-Control', 'no-store')
  ctx.body = Buffer.from(audio.uint8Array)
}

async function ttsFishStream(ctx, text: string, voiceId: string) {
  const apiKey = process.env.FISH_AUDIO_API_KEY
  if (!apiKey) throw new Error('FISH_AUDIO_API_KEY not set')

  const body = JSON.stringify({
    text,
    reference_id: voiceId,
    format: 'mp3',
    latency: 'normal',
    temperature: 0.7,
    top_p: 0.7,
    chunk_length: 200, // меньше chunk → быстрее first byte
  })

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        model: 's2-pro',
      },
      body,
    })

    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
      continue
    }
    if (!res.ok) throw new Error(`Fish TTS failed: ${res.status} ${await res.text()}`)
    if (!res.body) throw new Error('Fish TTS: empty body')

    ctx.set('Content-Type', 'audio/mpeg')
    ctx.set('Cache-Control', 'no-store')
    // Прокидываем байтовый поток без буферизации
    ctx.body = Readable.fromWeb(res.body as never)
    return
  }

  throw new Error('Fish TTS failed: rate limit after retries')
}

export default {
  async speak(ctx) {
    const {
      text,
      voiceId,
      provider = 'elevenlabs',
      model = 'eleven_turbo_v2_5',
    }: Body = ctx.request.body || {}

    if (!text?.trim()) {
      return ctx.badRequest('text required')
    }

    const voice =
      voiceId ||
      (provider === 'fish'
        ? process.env.FISH_VOICE_KIKA
        : process.env.ELEVENLABS_VOICE_KIKA)
    if (!voice) {
      return ctx.badRequest('voiceId not provided')
    }

    const startedAt = Date.now()
    const userId = ctx.state.user?.id
    const chars = text.length

    try {
      if (provider === 'fish') {
        await ttsFishStream(ctx, text, voice)
      } else {
        await ttsElevenLabs(ctx, text, voice, model)
      }
      // Аудио уже в ctx.body (стримом или buffer'ом). Логируем в фоне.
      queueMicrotask(() => {
        logUsage({
          userId,
          type: 'tts',
          model: provider === 'fish' ? 'fish-s2-pro' : model,
          tokensIn: chars,
          tokensOut: 0,
          costUsd: provider === 'fish' ? fishCost(chars) : elevenlabsTurboCost(chars),
          durationMs: Date.now() - startedAt,
          meta: { provider, voice },
        })
      })
    } catch (e) {
      strapi.log.error('[tts] failed', e)
      ctx.status = 500
      ctx.body = { error: e instanceof Error ? e.message : String(e) }
    }
  },
}
