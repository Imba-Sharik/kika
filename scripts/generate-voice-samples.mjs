// Pre-generate MP3-сэмплы голосов для Settings preview.
// Парсит BUILTIN_VOICES из voices.ts, для каждого делает TTS-запрос и сохраняет
// в apps/frontend/public/voice-samples/{voiceId}.mp3.
//
// Usage: node scripts/generate-voice-samples.mjs
// Idempotent: уже существующие файлы пропускаются. Передай --force чтобы перегенерить.
//
// Env: FISH_AUDIO_API_KEY и ELEVENLABS_API_KEY из apps/backend/.env

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Чтение env из apps/backend/.env
function loadEnv() {
  const envPath = join(ROOT, 'apps/backend/.env')
  if (!existsSync(envPath)) {
    console.error('Missing apps/backend/.env')
    process.exit(1)
  }
  const raw = readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}

// Парсим voices.ts — собираем массив { id, provider, voiceId, primaryLang }
function parseVoices() {
  const voicesPath = join(ROOT, 'apps/frontend/src/shared/yukai/voices.ts')
  const raw = readFileSync(voicesPath, 'utf8')
  const re = /\{\s*id:\s*'([^']+)',\s*label:\s*[^,]+,\s*provider:\s*'([^']+)',\s*voiceId:\s*'([^']+)',\s*(?:\/\/[^\n]*\n\s*)?langs:\s*\[([^\]]+)\]/g
  const voices = []
  let m
  while ((m = re.exec(raw))) {
    const langsRaw = m[4]
    const langs = [...langsRaw.matchAll(/'([a-z]{2})'/g)].map((x) => x[1])
    voices.push({ id: m[1], provider: m[2], voiceId: m[3], primaryLang: langs[0] || 'en' })
  }
  return voices
}

// Карта sample-текстов (зеркало VOICE_SAMPLES в voices.ts)
const SAMPLES = {
  ja: 'こんにちは！愉快です、よろしくね。',
  en: "Hi! I'm Yukai, nice to meet you.",
  ko: '안녕하세요! 저는 유카이예요, 만나서 반가워요.',
  zh: '你好！我是愉快，很高兴认识你。',
  ru: 'Привет! Я Yukai, рада знакомству.',
  de: 'Hallo! Ich bin Yukai, freut mich, dich kennenzulernen.',
  fr: 'Salut ! Je suis Yukai, ravie de te rencontrer.',
  pt: 'Oi! Eu sou Yukai, prazer em te conhecer.',
  es: '¡Hola! Soy Yukai, encantada de conocerte.',
}

async function ttsFish(text, voiceId, apiKey) {
  const res = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      model: 's2-pro',
    },
    body: JSON.stringify({
      text,
      reference_id: voiceId,
      format: 'mp3',
      latency: 'normal',
      temperature: 0.7,
      top_p: 0.7,
      // Параметры зеркалят backend tts.ts — иначе сэмпл и реальный чат звучат
      // по-разному (preview писклявее/глуше, чем то, что юзер слышит в чате).
      chunk_length: 300,
      condition_on_previous_chunks: true,
    }),
  })
  if (!res.ok) throw new Error(`Fish ${res.status}: ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

async function ttsElevenLabs(text, voiceId, apiKey) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
      }),
    }
  )
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

async function main() {
  const force = process.argv.includes('--force')
  const env = loadEnv()
  const fishKey = env.FISH_AUDIO_API_KEY
  const elevenKey = env.ELEVENLABS_API_KEY
  if (!fishKey) { console.error('FISH_AUDIO_API_KEY missing'); process.exit(1) }
  if (!elevenKey) { console.error('ELEVENLABS_API_KEY missing'); process.exit(1) }

  const outDir = join(ROOT, 'apps/frontend/public/voice-samples')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  const voices = parseVoices()
  console.log(`parsed ${voices.length} voices`)

  let generated = 0
  let skipped = 0
  let failed = 0
  for (const v of voices) {
    const outPath = join(outDir, `${v.voiceId}.mp3`)
    if (!force && existsSync(outPath)) {
      skipped++
      continue
    }
    const text = SAMPLES[v.primaryLang] || SAMPLES.en
    try {
      process.stdout.write(`[${v.provider}] ${v.id} (${v.primaryLang}) ... `)
      const audio = v.provider === 'fish'
        ? await ttsFish(text, v.voiceId, fishKey)
        : await ttsElevenLabs(text, v.voiceId, elevenKey)
      writeFileSync(outPath, audio)
      generated++
      console.log(`${(audio.length / 1024).toFixed(1)} KB`)
      // Throttle — Fish/ElevenLabs не любят rapid-fire
      await new Promise((r) => setTimeout(r, 250))
    } catch (e) {
      failed++
      console.log(`FAIL: ${e.message}`)
    }
  }

  console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${failed} failed`)
}

main().catch((e) => { console.error(e); process.exit(1) })
