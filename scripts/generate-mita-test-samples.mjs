// Генерит 3 MP3 фразы голосом Mita (Fish Audio) для тестовой страницы /test-mouth.
// Outputs: apps/frontend/public/test-mouth/mita-1.mp3, mita-2.mp3, mita-3.mp3
//
// Usage: node scripts/generate-mita-test-samples.mjs [--force]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const MITA_VOICE_ID = '6dc11f3f67a543f6ad4537a4a347e224'

const SENTENCES = [
  'Привет! Я Мита, рада знакомству. Как у тебя дела сегодня?',
  'Знаешь, я очень люблю когда ты со мной разговариваешь. Расскажи мне что-нибудь интересное!',
  'Хорошо, я тебя поняла. Давай попробуем сделать это вместе, шаг за шагом.',
]

function loadEnv() {
  const envPath = join(ROOT, 'apps/backend/.env')
  const raw = readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
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
      chunk_length: 300,
      condition_on_previous_chunks: true,
    }),
  })
  if (!res.ok) throw new Error(`Fish ${res.status}: ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

async function main() {
  const force = process.argv.includes('--force')
  const env = loadEnv()
  const fishKey = env.FISH_AUDIO_API_KEY
  if (!fishKey) { console.error('FISH_AUDIO_API_KEY missing'); process.exit(1) }

  const outDir = join(ROOT, 'apps/frontend/public/test-mouth')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  for (let i = 0; i < SENTENCES.length; i++) {
    const fileName = `mita-${i + 1}.mp3`
    const outPath = join(outDir, fileName)
    if (!force && existsSync(outPath)) {
      console.log(`skip ${fileName} (exists)`)
      continue
    }
    process.stdout.write(`generating ${fileName} ... `)
    const audio = await ttsFish(SENTENCES[i], MITA_VOICE_ID, fishKey)
    writeFileSync(outPath, audio)
    console.log(`${(audio.length / 1024).toFixed(1)} KB`)
    await new Promise((r) => setTimeout(r, 250))
  }

  console.log('Done')
}

main().catch((e) => { console.error(e); process.exit(1) })
