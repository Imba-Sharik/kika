// Генерит статичный MP3 приветствия для VkusVill-демо компаньона.
// Запускать ОДИН РАЗ после изменения текста: `node scripts/generate-companion-greeting.mjs`
// Голос — Mita (Fish), тот же что в публичном /api/vkusvill/say эндпоинте.

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, '../apps/frontend/public/yukai/companion-greeting.mp3')

const MITA_VOICE_ID = '6dc11f3f67a543f6ad4537a4a347e224'

const GREETING_TEXT =
  "Привет! Давай поговорим — я автоматически заполню твои предпочтения или подберу продукты для блюда. Скажи, что любишь, или что хочешь приготовить."

const apiKey = process.env.FISH_AUDIO_API_KEY
if (!apiKey) {
  console.error('FISH_AUDIO_API_KEY не задан в env')
  console.error('Запусти: $env:FISH_AUDIO_API_KEY="ключ"; node scripts/generate-companion-greeting.mjs')
  process.exit(1)
}

console.log('Генерю приветствие через Fish TTS (голос Mita)…')
console.log('Текст:', GREETING_TEXT)

const res = await fetch('https://api.fish.audio/v1/tts', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    model: 's2-pro',
  },
  body: JSON.stringify({
    text: GREETING_TEXT,
    reference_id: MITA_VOICE_ID,
    format: 'mp3',
    latency: 'normal',
    temperature: 0.7,
    top_p: 0.7,
    chunk_length: 300,
    condition_on_previous_chunks: true,
    normalize: false,
  }),
})

if (!res.ok) {
  console.error(`Fish TTS вернул ${res.status}`)
  console.error(await res.text())
  process.exit(1)
}

const buffer = Buffer.from(await res.arrayBuffer())
await mkdir(dirname(OUTPUT_PATH), { recursive: true })
await writeFile(OUTPUT_PATH, buffer)

const sizeKb = (buffer.length / 1024).toFixed(1)
console.log(`✓ Сохранено: ${OUTPUT_PATH} (${sizeKb} KB)`)
console.log('Текст для повторной генерации синхронизировать с GREETING.content в YukaiCompanion.tsx')
