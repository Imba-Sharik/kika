'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// ─── Рот: тот же алгоритм что в test-mouth ────────────────────────────────
const MOUTH_FRAMES = 5
const LPF_ALPHA = 0.35
const OPEN_T  = [0.00, 0.10, 0.22, 0.38, 0.55]
const CLOSE_T = [0.00, 0.06, 0.16, 0.30, 0.45]

const SAMPLES = [
  { file: '/test-mouth/mita-1.mp3', label: 'Привет! Я Мита, рада знакомству.' },
  { file: '/test-mouth/mita-2.mp3', label: 'Знаешь, я очень люблю когда ты со мной разговариваешь.' },
  { file: '/test-mouth/mita-3.mp3', label: 'Хорошо, я тебя поняла. Давай попробуем вместе.' },
]

// ─── Слой 1: позы тела ────────────────────────────────────────────────────
const POSES = [
  { id: 'listen',    label: 'Слушает',    color: '#6366f1', rot: 4,   dx: -6,  desc: 'наклон вперёд — Claude слушает' },
  { id: 'think',     label: 'Думает',     color: '#8b5cf6', rot: -3,  dx: 4,   desc: 'рука у подбородка — Claude обдумывает' },
  { id: 'explain',   label: 'Объясняет',  color: '#a855f7', rot: -7,  dx: 10,  desc: 'жест рукой — Claude рассказывает' },
  { id: 'react',     label: 'Реагирует',  color: '#ec4899', rot: 9,   dx: -3,  desc: 'откид назад — Claude удивлён' },
  { id: 'shy',       label: 'Смущена',    color: '#f43f5e', rot: 13,  dx: -8,  desc: 'голова вниз — комплимент/стеснение' },
  { id: 'confident', label: 'Уверена',    color: '#10b981', rot: 0,   dx: 0,   desc: 'прямо — нейтральный ответ' },
]

// ─── Слой 2: эмоции (только лицо / глаза / брови) ─────────────────────────
const EMOTIONS = [
  { id: 'neutral',   label: 'Нейтрал',   browInnerY: 0,  browSlant: 0,  eyeOpen: 1.0, pupilDx: 0,  cheek: false, smileAmt: 0   },
  { id: 'happy',     label: 'Радость',   browInnerY: -4, browSlant: -1, eyeOpen: 0.7, pupilDx: 0,  cheek: true,  smileAmt: 9   },
  { id: 'sad',       label: 'Грусть',    browInnerY: 3,  browSlant: 2,  eyeOpen: 0.8, pupilDx: 0,  cheek: false, smileAmt: -7  },
  { id: 'surprised', label: 'Удивление', browInnerY: -6, browSlant: -2, eyeOpen: 1.5, pupilDx: 0,  cheek: false, smileAmt: -1  },
  { id: 'angry',     label: 'Злость',    browInnerY: 6,  browSlant: 3,  eyeOpen: 0.7, pupilDx: 2,  cheek: false, smileAmt: -8  },
  { id: 'shy',       label: 'Смущение',  browInnerY: -2, browSlant: -1, eyeOpen: 0.5, pupilDx: -4, cheek: true,  smileAmt: 5   },
  { id: 'thinking',  label: 'Раздумья',  browInnerY: 2,  browSlant: 1,  eyeOpen: 0.9, pupilDx: -5, cheek: false, smileAmt: 2   },
  { id: 'serious',   label: 'Серьёзно',  browInnerY: 4,  browSlant: 2,  eyeOpen: 0.85,pupilDx: 0,  cheek: false, smileAmt: -3  },
]

// ─── Слой 3: состояние глаз (blink + dart) ────────────────────────────────
const EYE_STATES = [
  { id: 'open',   label: 'Открыт',     mul: 1.0, dx: 0  },
  { id: 'half',   label: 'Полуприкрыт',mul: 0.35, dx: 0 },
  { id: 'closed', label: 'Закрыт',     mul: 0.0, dx: 0  },
  { id: 'dartL',  label: '← Влево',    mul: 1.0, dx: -6 },
  { id: 'dartR',  label: 'Вправо →',   mul: 1.0, dx: 6  },
  { id: 'wide',   label: 'Широко',     mul: 1.45, dx: 0 },
]

// ─── Демо-последовательность "Claude ведёт диалог" ────────────────────────
const CLAUDE_DEMO = [
  { poseIdx: 0, emotionIdx: 0, label: '← Claude слушает вопрос юзера' },
  { poseIdx: 1, emotionIdx: 6, label: '← Claude обдумывает ответ' },
  { poseIdx: 2, emotionIdx: 7, label: '← Claude объясняет серьёзно' },
  { poseIdx: 3, emotionIdx: 3, label: '← Claude удивляется реплике' },
  { poseIdx: 2, emotionIdx: 1, label: '← Claude радостно завершает мысль' },
  { poseIdx: 4, emotionIdx: 5, label: '← Claude смущается от комплимента' },
  { poseIdx: 5, emotionIdx: 1, label: '← Claude говорит спасибо!' },
]

// ─── SVG персонаж (4 независимых слоя) ───────────────────────────────────
function CharacterSVG({
  pose, emotion, eyeStateMul, eyeDx, mouthFrame, isSmearing,
}: {
  pose: (typeof POSES)[0]
  emotion: (typeof EMOTIONS)[0]
  eyeStateMul: number
  eyeDx: number
  mouthFrame: number
  isSmearing: boolean
}) {
  const baseEyeH = 13
  const eyeH = Math.max(0, baseEyeH * eyeStateMul * emotion.eyeOpen)
  const pupilDx = eyeDx + emotion.pupilDx
  const mouthW = 12 + mouthFrame * 5
  const mouthH = mouthFrame === 0 ? 2 : 3 + mouthFrame * 4

  return (
    <svg
      viewBox="0 0 200 290"
      width={200}
      height={290}
      style={{
        filter: isSmearing ? 'blur(2.5px)' : 'none',
        transform: isSmearing ? 'scaleX(1.06)' : 'scaleX(1)',
        transition: isSmearing ? 'none' : 'filter 0.1s, transform 0.1s',
      }}
    >
      {/* ── СЛОЙ 1: тело (pose transform) ── */}
      <g transform={`rotate(${pose.rot}, 100, 240) translate(${pose.dx}, 0)`}>
        <rect x="35" y="230" width="130" height="70" fill="#1e1b4b" rx="8"/>
        {/* Воротничок */}
        <path d="M 75 238 L 100 260 L 125 238 L 112 226 L 100 243 L 88 226 Z" fill="white"/>
        <ellipse cx="100" cy="235" rx="65" ry="22" fill="#1e1b4b"/>
      </g>
      {/* Шея */}
      <rect x="86" y="198" width="28" height="38" fill="#fcd9c0" rx="6"/>

      {/* ── Волосы (задние) ── */}
      <ellipse cx="100" cy="108" rx="73" ry="85" fill="#16162a"/>

      {/* ── Лицо ── */}
      <ellipse cx="100" cy="128" rx="60" ry="70" fill="#fcd9c0"/>

      {/* ── Чёлка / волосы перед ── */}
      <path
        d="M 38 100 Q 50 45 100 42 Q 150 45 162 100 Q 148 65 128 70 Q 114 52 100 57 Q 86 52 72 70 Q 52 65 38 100 Z"
        fill="#16162a"
      />
      <path d="M 40 118 Q 30 162 36 205 Q 46 185 44 150 Z" fill="#16162a"/>
      <path d="M 160 118 Q 170 162 164 205 Q 154 185 156 150 Z" fill="#16162a"/>

      {/* ── СЛОЙ 2: эмоция (брови + розовый) ── */}
      {/* Левая бровь */}
      <g transform={`rotate(${-emotion.browSlant * 6}, 70, 98)`}>
        <path
          d={`M 53 ${98 + emotion.browInnerY} Q 70 ${90 + emotion.browInnerY} 87 98`}
          stroke="#2a1a0a" strokeWidth="3.5" fill="none" strokeLinecap="round"
        />
      </g>
      {/* Правая бровь */}
      <g transform={`rotate(${emotion.browSlant * 6}, 130, 98)`}>
        <path
          d={`M 113 98 Q 130 ${90 + emotion.browInnerY} 147 ${98 + emotion.browInnerY}`}
          stroke="#2a1a0a" strokeWidth="3.5" fill="none" strokeLinecap="round"
        />
      </g>
      {/* Румянец */}
      {emotion.cheek && (
        <>
          <ellipse cx="50" cy="142" rx="16" ry="9" fill="rgba(255,100,130,0.22)"/>
          <ellipse cx="150" cy="142" rx="16" ry="9" fill="rgba(255,100,130,0.22)"/>
        </>
      )}

      {/* ── СЛОЙ 3: глаза (eye state) ── */}
      {/* Белки */}
      {eyeH > 0.5 && (
        <>
          <ellipse cx="70" cy="122" rx="16" ry={eyeH} fill="white"/>
          <ellipse cx="130" cy="122" rx="16" ry={eyeH} fill="white"/>
        </>
      )}
      {eyeH <= 0.5 && (
        <>
          <path d="M 54 122 Q 70 116 86 122" stroke="#2a1a0a" strokeWidth="2" fill="none"/>
          <path d="M 114 122 Q 130 116 146 122" stroke="#2a1a0a" strokeWidth="2" fill="none"/>
        </>
      )}
      {/* Зрачки */}
      {eyeH > 2 && (
        <>
          <ellipse cx={70 + pupilDx} cy="122" rx="8" ry={Math.min(eyeH * 0.85, 11)} fill="#2d1a5e"/>
          <ellipse cx={130 + pupilDx} cy="122" rx="8" ry={Math.min(eyeH * 0.85, 11)} fill="#2d1a5e"/>
          <circle cx={72 + pupilDx} cy="118" r="2.5" fill="white"/>
          <circle cx={132 + pupilDx} cy="118" r="2.5" fill="white"/>
        </>
      )}
      {/* Верхнее веко */}
      {eyeH > 0 && (
        <>
          <path
            d={`M 54 ${122 - eyeH} Q 70 ${114 - eyeH * 0.5} 86 ${122 - eyeH}`}
            stroke="#16162a" strokeWidth="2.5" fill="none" strokeLinecap="round"
          />
          <path
            d={`M 114 ${122 - eyeH} Q 130 ${114 - eyeH * 0.5} 146 ${122 - eyeH}`}
            stroke="#16162a" strokeWidth="2.5" fill="none" strokeLinecap="round"
          />
        </>
      )}

      {/* ── СЛОЙ 4: рот (PNG-swap / амплитуда) ── */}
      {mouthFrame === 0 ? (
        <path
          d={`M ${100 - 14} 165 Q 100 ${165 + Math.max(-6, Math.min(9, emotion.smileAmt))} ${100 + 14} 165`}
          stroke="#c0556c" strokeWidth="2.5" fill="none" strokeLinecap="round"
        />
      ) : (
        <>
          <ellipse cx="100" cy={166 + mouthFrame * 0.5} rx={mouthW} ry={mouthH} fill="#7a1d3a"/>
          {mouthFrame >= 2 && (
            <rect
              x={100 - mouthW * 0.65} y={166 + mouthFrame * 0.5 - mouthH / 2}
              width={mouthW * 1.3} height="2.5" fill="white" rx="1"
            />
          )}
        </>
      )}
    </svg>
  )
}

// ─── Основная страница ────────────────────────────────────────────────────
export default function TestAnimationPage() {
  const [poseIdx, setPoseIdx]         = useState(5) // confident
  const [emotionIdx, setEmotionIdx]   = useState(0) // neutral
  const [eyeStateIdx, setEyeStateIdx] = useState(0) // open
  const [mouthFrame, setMouthFrame]   = useState(0)
  const [isSmearing, setIsSmearing]   = useState(false)
  const [playingIdx, setPlayingIdx]   = useState<number | null>(null)
  const [demoStep, setDemoStep]       = useState<number | null>(null)
  const [activeLayer, setActiveLayer] = useState<number | null>(null)

  const audioRef    = useRef<HTMLAudioElement | null>(null)
  const ctxRef      = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef   = useRef<MediaElementAudioSourceNode | null>(null)
  const rafRef      = useRef<number | null>(null)
  const lpfState    = useRef({ smoothedAmp: 0, currentFrame: 0 })

  // Смена позы со smear-кадром
  const changePose = useCallback((idx: number) => {
    setIsSmearing(true)
    setPoseIdx(idx)
    setActiveLayer(1)
    setTimeout(() => { setIsSmearing(false); setActiveLayer(null) }, 80)
  }, [])

  const changeEmotion = useCallback((idx: number) => {
    setEmotionIdx(idx)
    setActiveLayer(2)
    setTimeout(() => setActiveLayer(null), 400)
  }, [])

  const changeEyeState = useCallback((idx: number) => {
    setEyeStateIdx(idx)
    setActiveLayer(3)
    setTimeout(() => setActiveLayer(null), 300)
  }, [])

  // Авто-моргание
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    const scheduleBlink = () => {
      const delay = 2500 + Math.random() * 4000
      timeoutId = setTimeout(() => {
        changeEyeState(1) // half
        setTimeout(() => {
          changeEyeState(2) // closed
          setTimeout(() => {
            changeEyeState(0) // open
            scheduleBlink()
          }, 60)
        }, 60)
      }, delay)
    }

    scheduleBlink()
    return () => clearTimeout(timeoutId)
  }, [changeEyeState])

  // Авто-dart глаз (редко)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    const scheduleDart = () => {
      const delay = 4000 + Math.random() * 8000
      timeoutId = setTimeout(() => {
        const dartIdx = Math.random() < 0.5 ? 3 : 4
        changeEyeState(dartIdx)
        setTimeout(() => { changeEyeState(0); scheduleDart() }, 600)
      }, delay)
    }

    scheduleDart()
    return () => clearTimeout(timeoutId)
  }, [changeEyeState])

  // Рот: LPF + hysteresis
  function tick() {
    const analyser = analyserRef.current
    if (!analyser) { rafRef.current = requestAnimationFrame(tick); return }

    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    const amp = Math.min(1, Math.sqrt(sum / data.length) * 4)

    const s = lpfState.current
    s.smoothedAmp += (amp - s.smoothedAmp) * LPF_ALPHA
    let f = s.currentFrame
    while (f < MOUTH_FRAMES - 1 && s.smoothedAmp >= OPEN_T[f + 1]) f++
    while (f > 0 && s.smoothedAmp < CLOSE_T[f]) f--
    if (f !== s.currentFrame) { s.currentFrame = f; setMouthFrame(f); setActiveLayer(4) }

    rafRef.current = requestAnimationFrame(tick)
  }

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

  async function play(idx: number) {
    const audio = audioRef.current
    if (!audio) return
    if (playingIdx === idx) { audio.pause(); setPlayingIdx(null); return }
    ensureCtx(audio)
    await ctxRef.current?.resume()
    audio.src = SAMPLES[idx].file
    audio.play()
    setPlayingIdx(idx)
    lpfState.current = { smoothedAmp: 0, currentFrame: 0 }
    if (!rafRef.current) tick()
  }

  // Демо-последовательность "Claude ведёт диалог"
  async function runClaudeDemo() {
    for (let i = 0; i < CLAUDE_DEMO.length; i++) {
      setDemoStep(i)
      const step = CLAUDE_DEMO[i]
      changePose(step.poseIdx)
      await new Promise((r) => setTimeout(r, 150))
      changeEmotion(step.emotionIdx)
      await new Promise((r) => setTimeout(r, 1200))
    }
    setDemoStep(null)
  }

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  const pose     = POSES[poseIdx]
  const emotion  = EMOTIONS[emotionIdx]
  const eyeState = EYE_STATES[eyeStateIdx]

  const layerBorder = (n: number) =>
    activeLayer === n ? '1px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.08)'

  return (
    <div style={{
      minHeight: '100vh', background: '#0f0f1a', color: '#fff',
      fontFamily: 'system-ui, sans-serif', padding: '24px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
    }}>
      <h1 style={{ fontSize: 18, margin: 0, color: '#e2e8f0' }}>
        Layered Animation — 4 независимых слоя PNG
      </h1>
      <p style={{ fontSize: 12, color: '#64748b', margin: 0, textAlign: 'center', maxWidth: 500 }}>
        Каждый слой переключает PNG независимо. Рот — как в /test-mouth. Поза — по контексту реплики Claude. Smear-кадр при смене позы (80мс).
      </p>

      {/* ─── Главный блок ─── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>

        {/* Левая панель: слои */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
          {[
            { n: 1, label: 'Слой 1 — ТЕЛО', value: pose.label,      color: pose.color,       desc: pose.desc },
            { n: 2, label: 'Слой 2 — ЭМОЦИЯ', value: emotion.label, color: '#f59e0b',        desc: 'глаза + брови' },
            { n: 3, label: 'Слой 3 — ГЛАЗА', value: eyeState.label, color: '#22d3ee',        desc: 'blink / dart' },
            { n: 4, label: 'Слой 4 — РОТ',   value: `frame ${mouthFrame}`, color: '#ec4899', desc: 'LPF + amplitude' },
          ].map(({ n, label, value, color, desc }) => (
            <div key={n} style={{
              padding: '10px 12px', borderRadius: 10, border: layerBorder(n),
              background: activeLayer === n ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
              transition: 'background 0.2s, border 0.2s',
            }}>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13, color, fontWeight: 600 }}>{value}</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{desc}</div>
            </div>
          ))}

          {/* Smear индикатор */}
          <div style={{
            padding: '6px 12px', borderRadius: 8,
            background: isSmearing ? 'rgba(236,72,153,0.2)' : 'rgba(255,255,255,0.02)',
            border: isSmearing ? '1px solid rgba(236,72,153,0.5)' : '1px solid rgba(255,255,255,0.05)',
            fontSize: 11, color: isSmearing ? '#ec4899' : '#374151',
            transition: 'all 0.1s',
          }}>
            {isSmearing ? '⚡ smear frame (80мс)' : '— нет smear —'}
          </div>
        </div>

        {/* Центр: персонаж */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>Композит (все 4 слоя)</div>
          <div style={{
            width: 220, height: 310,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <CharacterSVG
              pose={pose}
              emotion={emotion}
              eyeStateMul={eyeState.mul}
              eyeDx={eyeState.dx}
              mouthFrame={mouthFrame}
              isSmearing={isSmearing}
            />
          </div>
          {demoStep !== null && (
            <div style={{ fontSize: 11, color: '#a855f7', textAlign: 'center', maxWidth: 200 }}>
              {CLAUDE_DEMO[demoStep].label}
            </div>
          )}
        </div>

        {/* Правая панель: контролы */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 180 }}>

          {/* Позы */}
          <div>
            <div style={{ fontSize: 11, color: '#6366f1', marginBottom: 6 }}>Слой 1 — Поза тела</div>
            {POSES.map((p, i) => (
              <button key={p.id} onClick={() => changePose(i)} style={{
                display: 'block', width: '100%', marginBottom: 4,
                padding: '6px 10px', borderRadius: 6, border: 'none',
                background: poseIdx === i ? p.color : 'rgba(255,255,255,0.06)',
                color: poseIdx === i ? 'white' : '#94a3b8',
                fontSize: 12, cursor: 'pointer', textAlign: 'left',
              }}>
                {poseIdx === i ? '▶ ' : ''}{p.label}
              </button>
            ))}
          </div>

          {/* Эмоции */}
          <div>
            <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 6 }}>Слой 2 — Эмоция</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {EMOTIONS.map((e, i) => (
                <button key={e.id} onClick={() => changeEmotion(i)} style={{
                  padding: '5px 8px', borderRadius: 6, border: 'none',
                  background: emotionIdx === i ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                  color: emotionIdx === i ? '#000' : '#94a3b8',
                  fontSize: 11, cursor: 'pointer',
                }}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Глаза */}
          <div>
            <div style={{ fontSize: 11, color: '#22d3ee', marginBottom: 6 }}>Слой 3 — Глаза (авто + ручной)</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {EYE_STATES.map((e, i) => (
                <button key={e.id} onClick={() => changeEyeState(i)} style={{
                  padding: '5px 8px', borderRadius: 6, border: 'none',
                  background: eyeStateIdx === i ? '#22d3ee' : 'rgba(255,255,255,0.06)',
                  color: eyeStateIdx === i ? '#000' : '#94a3b8',
                  fontSize: 11, cursor: 'pointer',
                }}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Аудио + рот ─── */}
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ fontSize: 11, color: '#ec4899', marginBottom: 8 }}>
          Слой 4 — Рот (LPF + hysteresis, тот же алгоритм что в /test-mouth)
        </div>
        <audio
          ref={audioRef}
          onEnded={() => { setPlayingIdx(null); setMouthFrame(0) }}
          style={{ display: 'none' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SAMPLES.map((s, i) => (
            <button key={i} onClick={() => play(i)} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: playingIdx === i ? 'rgba(236,72,153,0.18)' : 'rgba(255,255,255,0.04)',
              color: '#e2e8f0', textAlign: 'left', fontSize: 12,
            }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: playingIdx === i ? '#ec4899' : '#a855f7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
              }}>
                {playingIdx === i ? '⏸' : '▶'}
              </span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Claude Demo ─── */}
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ fontSize: 11, color: '#a855f7', marginBottom: 8 }}>
          Claude управляет позой и эмоцией по контексту реплики (симуляция)
        </div>
        <button
          onClick={runClaudeDemo}
          disabled={demoStep !== null}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: demoStep !== null ? 'rgba(168,85,247,0.3)' : '#a855f7',
            color: 'white', fontSize: 13, fontWeight: 600,
          }}
        >
          {demoStep !== null ? `▶ ${CLAUDE_DEMO[demoStep].label}` : '▶ Запустить Claude Demo'}
        </button>
        <div style={{ marginTop: 8, fontSize: 11, color: '#374151' }}>
          Каждый шаг = смена позы (smear 80мс) + смена эмоции. В реальной версии Claude передаёт pose/emotion в JSON вместе с текстом ответа.
        </div>
      </div>

    </div>
  )
}
