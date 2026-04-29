// Импорт voice-данных из Fish Audio JSON: аватарки + Default Sample text для MP3.
//
// Usage: node scripts/import-voice-data.mjs <path-to-json>
//
// Что делает:
//   1. Читает JSON {id, title, cover_image_url, samples: [{title, text}]}
//   2. Скачивает cover_image_url → apps/frontend/public/voice-avatars/{id}.{ext}
//   3. Генерит TTS из samples[].text где title === "Default Sample"
//      (fallback на samples[0] если "Default Sample" нет) → apps/frontend/public/voice-samples/{id}.mp3
//   4. Печатает список voiceId которым нужно добавить avatar в voices.ts
//
// Если у голоса нет cover_image_url или samples — пропускает (оставляет как было).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function loadEnv() {
  const p = join(ROOT, 'apps/backend/.env')
  const raw = readFileSync(p, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}

async function downloadAvatar(url, outDir, voiceId) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`avatar fetch ${res.status}`)
  const ct = res.headers.get('content-type') || ''
  let ext = 'jpg'
  if (ct.includes('webp')) ext = 'webp'
  else if (ct.includes('png')) ext = 'png'
  else if (ct.includes('jpeg')) ext = 'jpg'
  const outPath = join(outDir, `${voiceId}.${ext}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(outPath, buf)
  return { path: `/voice-avatars/${voiceId}.${ext}`, size: buf.length }
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
      // Зеркалит backend tts.ts — иначе preview звучит иначе, чем чат.
      chunk_length: 300,
      condition_on_previous_chunks: true,
    }),
  })
  if (!res.ok) throw new Error(`Fish ${res.status}: ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

async function main() {
  const jsonPath = process.argv[2]
  if (!jsonPath) {
    console.error('Usage: node scripts/import-voice-data.mjs <path-to-json>')
    process.exit(1)
  }
  const env = loadEnv()
  const fishKey = env.FISH_AUDIO_API_KEY
  if (!fishKey) { console.error('FISH_AUDIO_API_KEY missing'); process.exit(1) }

  const data = JSON.parse(readFileSync(jsonPath, 'utf8'))
  const avatarDir = join(ROOT, 'apps/frontend/public/voice-avatars')
  const sampleDir = join(ROOT, 'apps/frontend/public/voice-samples')
  if (!existsSync(avatarDir)) mkdirSync(avatarDir, { recursive: true })
  if (!existsSync(sampleDir)) mkdirSync(sampleDir, { recursive: true })

  const updates = []
  for (const v of data) {
    const id = v.id
    const title = v.title?.trim() || id
    const avatarUrl = v.cover_image_url || v.avatar_url
    // Предпочитаем sample с title === "Default Sample" — Fish сам помечает его
    // как канонический для голоса. Если такого нет, fallback на первый sample.
    const samples = Array.isArray(v.samples) ? v.samples : []
    const defaultSample = samples.find((s) => s?.title?.trim() === 'Default Sample')
    const sample = defaultSample ?? samples[0]
    const sampleText = sample?.text?.trim()

    let avatarPath = null
    if (avatarUrl) {
      try {
        process.stdout.write(`[avatar] ${title} ... `)
        const r = await downloadAvatar(avatarUrl, avatarDir, id)
        avatarPath = r.path
        console.log(`${(r.size / 1024).toFixed(1)} KB → ${r.path}`)
      } catch (e) {
        console.log(`FAIL: ${e.message}`)
      }
    } else {
      console.log(`[avatar] ${title} — skipped (no cover_image_url)`)
    }

    if (sampleText) {
      try {
        process.stdout.write(`[sample] ${title} ... `)
        const audio = await ttsFish(sampleText, id, fishKey)
        writeFileSync(join(sampleDir, `${id}.mp3`), audio)
        console.log(`${(audio.length / 1024).toFixed(1)} KB`)
        await new Promise((r) => setTimeout(r, 250))
      } catch (e) {
        console.log(`FAIL: ${e.message}`)
      }
    } else {
      console.log(`[sample] ${title} — skipped (no samples)`)
    }

    if (avatarPath) updates.push({ id, title, avatar: avatarPath })
  }

  console.log('\n=== Add to voices.ts entries (avatar field) ===')
  for (const u of updates) {
    console.log(`  voiceId '${u.id}' → avatar: '${u.avatar}'  // ${u.title}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
