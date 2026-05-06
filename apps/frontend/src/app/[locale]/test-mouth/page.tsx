'use client'

import { useEffect, useRef, useState } from 'react'

const SAMPLES = [
  { file: '/test-mouth/mita-1.mp3', text: 'Привет! Я Мита, рада знакомству.' },
  { file: '/test-mouth/mita-2.mp3', text: 'Знаешь, я очень люблю когда ты со мной разговариваешь.' },
  { file: '/test-mouth/mita-3.mp3', text: 'Хорошо, я тебя поняла. Давай попробуем вместе.' },
]

// Кол-во кадров рта (закрыт → шире).
const MOUTH_FRAMES = 5

// === Anime (валидированный, "получился супер") ===
const ANIME_LPF_ALPHA = 0.35
const ANIME_OPEN_THRESHOLDS  = [0.00, 0.10, 0.22, 0.38, 0.55]
const ANIME_CLOSE_THRESHOLDS = [0.00, 0.06, 0.16, 0.30, 0.45]

// === Anime+ (третий вариант: asymmetric α + lookahead + min-hold + 3/5 frame toggle) ===
// Открывается быстро (атака согласной → гласная), закрывается плавно (расслабление мышц)
const APLUS_ALPHA_OPEN  = 0.45
const APLUS_ALPHA_CLOSE = 0.20
// Anticipation: рот опережает звук — мозг видит как "хороший дубляж"
const APLUS_LOOKAHEAD_MS = 60

// 3-frame режим: closed / half / open — правило MAPPA для обычного диалога
const APLUS_OPEN_3  = [0.00, 0.15, 0.40]
const APLUS_CLOSE_3 = [0.00, 0.10, 0.30]
const APLUS_OPEN_5  = ANIME_OPEN_THRESHOLDS
const APLUS_CLOSE_5 = ANIME_CLOSE_THRESHOLDS
// В 3-режиме показываем PNG 0/2/4 из 5 (чтобы юзер мог загрузить общий набор)
const APLUS_FRAME_MAP_3 = [0, 2, 4]

// Silence gate: при тишине дольше HOLD_MS — жёсткий snap в frame 0,
// иначе LPF медленно ползёт и рот зависает в half-open на длинных паузах
const APLUS_SILENCE_AMP = 0.04
const APLUS_SILENCE_HOLD_MS = 120

// Огибающая считается с шагом 10мс — для lookahead
const ENV_HOP_MS = 10

// SVG-плейсхолдеры — заменяются upload'ом
function defaultMouthSvg(idx: number): string {
  const h = idx === 0 ? 4 : 6 + idx * 8
  const w = 30 + idx * 6
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 60'>
    <ellipse cx='40' cy='30' rx='${w / 2}' ry='${h / 2}' fill='#7a1d3a' stroke='#3b0a1c' stroke-width='2'/>
    ${idx >= 2 ? `<rect x='${40 - w / 3}' y='${30 - h / 4}' width='${(w * 2) / 3}' height='3' fill='#fff'/>` : ''}
  </svg>`
  return 'data:image/svg+xml;base64,' + btoa(svg)
}

// Декодит mp3 один раз и считает RMS-огибающую — нужно чтобы Anime+ мог смотреть в будущее
async function buildEnvelope(audioCtx: AudioContext, url: string): Promise<Float32Array> {
  const buf = await fetch(url).then((r) => r.arrayBuffer())
  const audioBuf = await audioCtx.decodeAudioData(buf)
  const data = audioBuf.getChannelData(0)
  const sr = audioBuf.sampleRate
  const hop = Math.floor(sr * (ENV_HOP_MS / 1000))
  const win = Math.floor(sr * 0.020) // 20мс окно RMS
  const len = Math.floor(data.length / hop)
  const env = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    let sum = 0
    const start = i * hop
    const end = Math.min(data.length, start + win)
    for (let j = start; j < end; j++) sum += data[j] * data[j]
    env[i] = Math.min(1, Math.sqrt(sum / (end - start)) * 4)
  }
  return env
}

function envAt(env: Float32Array | null, timeSec: number): number {
  if (!env || env.length === 0) return 0
  const idx = Math.floor((timeSec * 1000) / ENV_HOP_MS)
  if (idx < 0 || idx >= env.length) return 0
  return env[idx]
}

export default function TestMouthPage() {
  const [playingIdx, setPlayingIdx] = useState<number | null>(null)
  const [amplitude, setAmplitude] = useState(0)
  const [animeFrame, setAnimeFrame] = useState(0)
  const [animePlusFrame, setAnimePlusFrame] = useState(0)
  const [aplusFrameMode, setAplusFrameMode] = useState<3 | 5>(5)
  // Toggle отдельных фишек Anime+ для диагностики (можно выключить и понять кто ломает)
  const [aplusLookahead, setAplusLookahead] = useState(true)
  const [aplusAsymAlpha, setAplusAsymAlpha] = useState(true)
  const [aplusSilenceGate, setAplusSilenceGate] = useState(true)
  const [mouthImages, setMouthImages] = useState<string[]>(
    Array.from({ length: MOUTH_FRAMES }, (_, i) => defaultMouthSvg(i))
  )

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)

  const envCacheRef = useRef<Map<string, Float32Array>>(new Map())
  const currentEnvRef = useRef<Float32Array | null>(null)
  const aplusFrameModeRef = useRef<3 | 5>(5)
  const aplusLookaheadRef = useRef(true)
  const aplusAsymAlphaRef = useRef(true)
  const aplusSilenceGateRef = useRef(true)

  const animeStateRef = useRef({ smoothedAmp: 0, currentFrame: 0 })
  const animePlusStateRef = useRef({
    smoothedAmp: 0,
    currentFrame: 0,
    silenceStartedAt: null as number | null,
  })

  useEffect(() => { aplusFrameModeRef.current = aplusFrameMode }, [aplusFrameMode])
  useEffect(() => { aplusLookaheadRef.current = aplusLookahead }, [aplusLookahead])
  useEffect(() => { aplusAsymAlphaRef.current = aplusAsymAlpha }, [aplusAsymAlpha])
  useEffect(() => { aplusSilenceGateRef.current = aplusSilenceGate }, [aplusSilenceGate])

  function ensureCtx(audio: HTMLAudioElement) {
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    if (!sourceRef.current) {
      sourceRef.current = ctxRef.current.createMediaElementSource(audio)
      analyserRef.current = ctxRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      sourceRef.current.connect(analyserRef.current)
      analyserRef.current.connect(ctxRef.current.destination)
    }
  }

  function tick() {
    const analyser = analyserRef.current
    const audio = audioRef.current
    if (!analyser || !audio) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    const amp = Math.min(1, Math.sqrt(sum / data.length) * 4)
    setAmplitude(amp)

    // === Anime: LPF + hysteresis (5 кадров) ===
    const an = animeStateRef.current
    an.smoothedAmp += (amp - an.smoothedAmp) * ANIME_LPF_ALPHA
    let aFrame = an.currentFrame
    while (aFrame < MOUTH_FRAMES - 1 && an.smoothedAmp >= ANIME_OPEN_THRESHOLDS[aFrame + 1]) aFrame++
    while (aFrame > 0 && an.smoothedAmp < ANIME_CLOSE_THRESHOLDS[aFrame]) aFrame--
    if (aFrame !== an.currentFrame) {
      an.currentFrame = aFrame
      setAnimeFrame(aFrame)
    }

    // === Anime+: каждая фишка под toggle (для диагностики) ===
    const ap = animePlusStateRef.current
    // 1. amplitude — из будущего если lookahead включен, иначе текущая (как Anime)
    const aheadAmp = aplusLookaheadRef.current
      ? envAt(currentEnvRef.current, audio.currentTime + APLUS_LOOKAHEAD_MS / 1000)
      : amp

    // 2. Silence gate (если включен)
    const now = performance.now()
    if (aplusSilenceGateRef.current) {
      if (aheadAmp < APLUS_SILENCE_AMP) {
        if (ap.silenceStartedAt === null) ap.silenceStartedAt = now
      } else {
        ap.silenceStartedAt = null
      }
    } else {
      ap.silenceStartedAt = null
    }
    const silenceLocked = ap.silenceStartedAt !== null && (now - ap.silenceStartedAt) >= APLUS_SILENCE_HOLD_MS

    if (silenceLocked) {
      ap.smoothedAmp = 0
      if (ap.currentFrame !== 0) {
        ap.currentFrame = 0
        setAnimePlusFrame(0)
      }
    } else {
      // 3. LPF (асимметричный или симметричный = как Anime α=0.35)
      const alpha = aplusAsymAlphaRef.current
        ? (aheadAmp > ap.smoothedAmp ? APLUS_ALPHA_OPEN : APLUS_ALPHA_CLOSE)
        : ANIME_LPF_ALPHA
      ap.smoothedAmp += (aheadAmp - ap.smoothedAmp) * alpha

      const mode = aplusFrameModeRef.current
      const opens  = mode === 3 ? APLUS_OPEN_3  : APLUS_OPEN_5
      const closes = mode === 3 ? APLUS_CLOSE_3 : APLUS_CLOSE_5
      const maxIdx = opens.length - 1

      // 4. Hysteresis
      let target = Math.min(ap.currentFrame, maxIdx)
      while (target < maxIdx && ap.smoothedAmp >= opens[target + 1]) target++
      while (target > 0 && ap.smoothedAmp < closes[target]) target--

      if (target !== ap.currentFrame) {
        ap.currentFrame = target
        const imgIdx = mode === 3 ? APLUS_FRAME_MAP_3[target] : target
        setAnimePlusFrame(imgIdx)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  async function play(idx: number) {
    const audio = audioRef.current
    if (!audio) return
    if (playingIdx === idx) {
      audio.pause()
      setPlayingIdx(null)
      return
    }
    ensureCtx(audio)
    await ctxRef.current?.resume()

    const sample = SAMPLES[idx]
    if (!envCacheRef.current.has(sample.file)) {
      try {
        const env = await buildEnvelope(ctxRef.current!, sample.file)
        envCacheRef.current.set(sample.file, env)
      } catch (e) {
        console.warn('envelope decode failed:', e)
      }
    }
    currentEnvRef.current = envCacheRef.current.get(sample.file) ?? null

    audio.src = sample.file
    audio.play()
    setPlayingIdx(idx)
    // Сброс состояния алгоритмов при новом сэмпле
    animeStateRef.current = { smoothedAmp: 0, currentFrame: 0 }
    animePlusStateRef.current = { smoothedAmp: 0, currentFrame: 0, silenceStartedAt: null }
    if (!rafRef.current) tick()
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    files.sort((a, b) => a.name.localeCompare(b.name))
    const urls = files.slice(0, MOUTH_FRAMES).map((f) => URL.createObjectURL(f))
    while (urls.length < MOUTH_FRAMES) urls.push(urls[urls.length - 1])
    setMouthImages(urls)
  }

  // Замена одного конкретного кадра — для микширования из разных AIUEO-наборов
  function handleSingleUpload(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setMouthImages((prev) => {
      const next = [...prev]
      next[idx] = url
      return next
    })
    e.target.value = '' // позволяем загружать тот же файл повторно
  }

  function resetSingle(idx: number) {
    setMouthImages((prev) => {
      const next = [...prev]
      next[idx] = defaultMouthSvg(idx)
      return next
    })
  }

  function resetImages() {
    setMouthImages(Array.from({ length: MOUTH_FRAMES }, (_, i) => defaultMouthSvg(i)))
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f0f1a',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif',
      padding: 32,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 24,
    }}>
      <h1 style={{ fontSize: 22, margin: 0 }}>Mouth Animation: Anime vs Anime+</h1>

      <audio
        ref={audioRef}
        onEnded={() => { setPlayingIdx(null); setAmplitude(0); setAnimeFrame(0); setAnimePlusFrame(0) }}
        onPause={() => setPlayingIdx(null)}
        style={{ display: 'none' }}
      />

      {/* Сравнение: Anime vs Anime+ */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Anime */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#ec4899', textTransform: 'uppercase', letterSpacing: 1 }}>
            Anime
          </div>
          <div style={{ fontSize: 10, color: '#6b7280' }}>LPF · hysteresis · 5fr</div>
          <div style={{
            width: 200, height: 200, background: 'rgba(236,72,153,0.06)',
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(236,72,153,0.2)',
          }}>
            <img src={mouthImages[animeFrame]} alt="" width={140} height={140}
              style={{ objectFit: 'contain' }} />
          </div>
          <div style={{ fontSize: 10, color: '#555' }}>frame {animeFrame}</div>
        </div>

        {/* Anime+ */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: 1 }}>
            Anime+
          </div>
          <div style={{ fontSize: 10, color: '#6b7280' }}>
            asym α · +{APLUS_LOOKAHEAD_MS}ms lookahead · silence-gate · {aplusFrameMode}fr
          </div>
          <div style={{
            width: 200, height: 200, background: 'rgba(34,211,238,0.06)',
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(34,211,238,0.25)',
          }}>
            <img src={mouthImages[animePlusFrame]} alt="" width={140} height={140}
              style={{ objectFit: 'contain' }} />
          </div>
          <div style={{ fontSize: 10, color: '#555' }}>frame {animePlusFrame}</div>
          {/* Toggle 3/5 */}
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {([3, 5] as const).map((n) => (
              <button
                key={n}
                onClick={() => setAplusFrameMode(n)}
                style={{
                  padding: '4px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                  border: '1px solid rgba(34,211,238,0.4)',
                  background: aplusFrameMode === n ? 'rgba(34,211,238,0.25)' : 'transparent',
                  color: '#fff',
                }}
              >
                {n} кадров
              </button>
            ))}
          </div>
          {/* Toggle отдельных фишек — для диагностики что ломает */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8, fontSize: 10, color: '#9ca3af' }}>
            {[
              { label: 'lookahead +60ms', value: aplusLookahead, set: setAplusLookahead },
              { label: 'asym α (0.45/0.20)', value: aplusAsymAlpha, set: setAplusAsymAlpha },
              { label: 'silence gate 120ms', value: aplusSilenceGate, set: setAplusSilenceGate },
            ].map((t) => (
              <label key={t.label} style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={t.value}
                  onChange={(e) => t.set(e.target.checked)}
                  style={{ accentColor: '#22d3ee' }}
                />
                <span>{t.label}</span>
              </label>
            ))}
            <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>
              всё OFF = ванильный Anime
            </div>
          </div>
        </div>
      </div>

      {/* Amplitude bar */}
      <div style={{ width: '100%', maxWidth: 500 }}>
        <div style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>
          amplitude: {amplitude.toFixed(3)}
        </div>
        <div style={{ height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${amplitude * 100}%`,
            background: 'linear-gradient(to right, #ec4899, #a855f7)',
            transition: 'width 30ms linear',
          }} />
        </div>
      </div>

      {/* Сэмплы */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 600 }}>
        {SAMPLES.map((s, i) => {
          const active = playingIdx === i
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: active ? 'rgba(236,72,153,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${active ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 10, padding: '10px 14px',
            }}>
              <button
                onClick={() => play(i)}
                style={{
                  width: 36, height: 36, borderRadius: '50%', border: 'none',
                  background: active ? '#ec4899' : '#a855f7', color: '#fff',
                  fontSize: 14, cursor: 'pointer', flexShrink: 0,
                }}
              >
                {active ? '⏸' : '▶'}
              </button>
              <div style={{ fontSize: 13 }}>{s.text}</div>
            </div>
          )
        })}
      </div>

      {/* Загрузка ртов: bulk + по одному (для микса из AIUEO) */}
      <div style={{
        width: '100%', maxWidth: 600, padding: 16,
        background: 'rgba(255,255,255,0.03)', borderRadius: 10,
        border: '1px dashed rgba(255,255,255,0.1)',
      }}>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
          Кликни по кадру чтобы заменить его отдельно — можно микшировать рты из разных AIUEO-столбцов
          (frame 0 = closed/Normal, 1 = う, 2 = い, 3 = え/お, 4 = あ).
          В 3-режиме показываются 0/2/4.
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
          {mouthImages.map((url, i) => (
            <div key={i} style={{
              position: 'relative',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
              background: '#1a1a2e',
            }}>
              {/* label занимает весь блок и открывает picker по клику */}
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: 4, cursor: 'pointer',
              }}>
                <img src={url} alt={`mouth-${i}`} width={64} height={64}
                  style={{ display: 'block', objectFit: 'contain', pointerEvents: 'none' }} />
                <div style={{ textAlign: 'center', fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                  frame {i}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleSingleUpload(i, e)}
                  style={{ display: 'none' }}
                />
              </label>
              {/* кнопка-сброс — sibling, не внутри label, иначе клик уходит в picker */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); resetSingle(i) }}
                title="Сбросить этот кадр"
                style={{
                  position: 'absolute', top: 2, right: 2, zIndex: 2,
                  width: 18, height: 18, fontSize: 11, lineHeight: '16px',
                  borderRadius: 9, border: 'none',
                  background: 'rgba(0,0,0,0.65)', color: '#fff', cursor: 'pointer',
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginRight: 4 }}>
            Или загрузить пачкой (mouth-0…4.png):
          </div>
          <input type="file" accept="image/*" multiple onChange={handleUpload} style={{ color: '#fff', fontSize: 12 }} />
          <button onClick={resetImages} style={{
            padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent', color: '#fff', fontSize: 12, cursor: 'pointer',
          }}>
            Сбросить все
          </button>
        </div>
      </div>
    </div>
  )
}
