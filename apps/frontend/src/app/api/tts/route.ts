import { experimental_generateSpeech as generateSpeech } from 'ai'
import { elevenlabs } from '@ai-sdk/elevenlabs'
import { NextRequest } from 'next/server'
import type { Emotion } from '@/shared/yukai/persona'

export const runtime = 'nodejs'

type Provider = 'elevenlabs' | 'fish'

type Body = {
  text: string
  emotion?: Emotion
  voiceId?: string
  provider?: Provider
  model?: 'eleven_v3' | 'eleven_multilingual_v2' | 'eleven_turbo_v2_5' | 'eleven_flash_v2_5'
}

async function ttsElevenLabs(text: string, voiceId: string, model: string) {
  const { audio } = await generateSpeech({
    model: elevenlabs.speech(model),
    text,
    voice: voiceId,
  })
  return new Response(
    audio.uint8Array.buffer.slice(
      audio.uint8Array.byteOffset,
      audio.uint8Array.byteOffset + audio.uint8Array.byteLength,
    ) as ArrayBuffer,
    {
      headers: {
        'Content-Type': audio.mediaType || 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    },
  )
}

async function ttsFishStream(text: string, voiceId: string): Promise<Response> {
  const apiKey = process.env.FISH_AUDIO_API_KEY
  if (!apiKey) throw new Error('FISH_AUDIO_API_KEY not set')

  const body = JSON.stringify({
    text,
    reference_id: voiceId,
    format: 'mp3',
    latency: 'normal',
    temperature: 0.7,
    top_p: 0.7,
    chunk_length: 200, // меньшие чанки → быстрее first byte
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

    // Проксируем поток напрямую — без буферизации
    return new Response(res.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  }

  throw new Error('Fish TTS failed: rate limit after retries')
}

export async function POST(req: NextRequest) {
  const {
    text,
    emotion = 'neutral',
    voiceId,
    provider = 'elevenlabs',
    model = 'eleven_turbo_v2_5',
  }: Body = await req.json()

  if (!text?.trim()) {
    return Response.json({ error: 'text required' }, { status: 400 })
  }

  const voice =
    voiceId ||
    (provider === 'fish'
      ? process.env.FISH_VOICE_KIKA
      : process.env.ELEVENLABS_VOICE_KIKA)
  if (!voice) {
    return Response.json({ error: 'voiceId not provided' }, { status: 400 })
  }

  void emotion
  try {
    return provider === 'fish'
      ? await ttsFishStream(text, voice)
      : await ttsElevenLabs(text, voice, model)
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
