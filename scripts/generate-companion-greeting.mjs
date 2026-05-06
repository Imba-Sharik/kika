// Генерит статичные MP3 приветствий Коханы под все retail-домены.
// Запускать ОДИН РАЗ после изменения текста:
//   $env:FISH_AUDIO_API_KEY="..."; node scripts/generate-companion-greeting.mjs
// Голос — Mita (Fish), тот же что в публичном /api/vkusvill/say эндпоинте.
//
// Тексты ОБЯЗАНЫ совпадать с brand.companionGreeting.text в brands.ts:
//   - companion-greeting.mp3                 → grocery (vkusvill, perekrestok, magnit и т.д.)
//   - companion-greeting-ozon.mp3            → marketplace (ozon)
//   - companion-greeting-aviasales.mp3       → travel (aviasales)

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = resolve(__dirname, '../apps/frontend/public/yukai')

const MITA_VOICE_ID = '6dc11f3f67a543f6ad4537a4a347e224'

const TARGETS = [
  {
    file: 'companion-greeting.mp3',
    text:
      'Привет! Давай поговорим — я автоматически заполню твои предпочтения или подберу продукты для блюда. Скажи, что любишь, или что хочешь приготовить.',
  },
  {
    file: 'companion-greeting-ozon.mp3',
    text:
      'Привет! Давай поговорим — расскажи какие бренды любишь, какой размер носишь, что хочешь собрать. Я подберу товары и заполню профиль.',
  },
  {
    file: 'companion-greeting-aviasales.mp3',
    text:
      'Привет! Давай поговорим — расскажи куда хочешь, какой бюджет, есть ли виза. Я соберу trip и заполню профиль.',
  },
]

const apiKey = process.env.FISH_AUDIO_API_KEY
if (!apiKey) {
  console.error('FISH_AUDIO_API_KEY не задан в env')
  console.error('Запусти: $env:FISH_AUDIO_API_KEY="ключ"; node scripts/generate-companion-greeting.mjs')
  process.exit(1)
}

await mkdir(PUBLIC_DIR, { recursive: true })

for (const t of TARGETS) {
  console.log(`\n→ ${t.file}`)
  console.log(`  ${t.text}`)

  const res = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      model: 's2-pro',
    },
    body: JSON.stringify({
      text: t.text,
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
    console.error(`  ✗ Fish TTS вернул ${res.status}: ${await res.text()}`)
    process.exit(1)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  const out = resolve(PUBLIC_DIR, t.file)
  await writeFile(out, buffer)
  console.log(`  ✓ ${out} (${(buffer.length / 1024).toFixed(1)} KB)`)
}

console.log('\n✓ Готово. Синхронизируй тексты с brand.companionGreeting.text в brands.ts.')
