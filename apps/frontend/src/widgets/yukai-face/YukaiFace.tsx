'use client'

import { useEffect, useRef, useState } from 'react'
import type { Emotion } from '@/shared/yukai/persona'

import type { EmotionOverrides } from '@/shared/yukai/emotion-overrides'

type Props = {
  emotion: Emotion
  audio?: HTMLAudioElement | null
  size?: number
  overrides?: EmotionOverrides
}

const EMOTION_SRC: Record<Emotion, string> = {
  neutral: '/yukai/emotions/neutral.png',
  happy: '/yukai/emotions/happy.png',
  excited: '/yukai/emotions/excited.png',
  love: '/yukai/emotions/love.png',
  wink: '/yukai/emotions/wink.png',
  thinking: '/yukai/emotions/thinking.png',
  listening: '/yukai/emotions/listening.png',
  confused: '/yukai/emotions/confused.png',
  surprised: '/yukai/emotions/surprised.png',
  alert: '/yukai/emotions/alert.png',
  flustered: '/yukai/emotions/flustered.png',
  worried: '/yukai/emotions/worried.png',
  sad: '/yukai/emotions/sad.png',
  upset: '/yukai/emotions/upset.png',
  crying: '/yukai/emotions/crying.png',
  angry: '/yukai/emotions/angry.png',
  sleeping: '/yukai/emotions/sleeping.png',
}

const FADE_MS = 250

// Все 16 PNG предзагружаются один раз при первом mount YukaiFace —
// HTTP cache браузера → последующие смены эмоций instant. Без этого первый
// показ каждой эмоции вызывал ~50-200ms задержку (HTTP fetch).
//
// Используем requestIdleCallback чтобы не конкурировать с первичным рендером
// (active emotion грузится через <img> с приоритетом, остальные — в idle).
let preloaded = false
function preloadEmotions() {
  if (preloaded || typeof window === 'undefined') return
  preloaded = true
  const run = () => {
    for (const src of Object.values(EMOTION_SRC)) {
      const img = new Image()
      img.src = src
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const idle = (window as any).requestIdleCallback as ((cb: () => void) => void) | undefined
  if (idle) idle(run)
  else setTimeout(run, 200)
}

export function YukaiFace({ emotion, audio, size = 320, overrides }: Props) {
  // Прелоад всех эмоций на первом mount компонента — синхронно, без эффекта.
  // Браузер начинает качать в параллель, к моменту смены emotion картинка уже в cache.
  preloadEmotions()
  const [amplitude, setAmplitude] = useState(0)
  const rafRef = useRef<number | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)

  // Crossfade: при смене emotion prop сохраняем старое значение в prevEmotion
  // и гасим его через FADE_MS. emotion используем как "current" напрямую —
  // отдельный state не нужен (см. https://react.dev/learn/you-might-not-need-an-effect).
  const [prevEmotion, setPrevEmotion] = useState<Emotion | null>(null)
  const lastEmotionRef = useRef<Emotion>(emotion)
  if (lastEmotionRef.current !== emotion) {
    setPrevEmotion(lastEmotionRef.current)
    lastEmotionRef.current = emotion
  }

  useEffect(() => {
    if (!prevEmotion) return
    const t = setTimeout(() => setPrevEmotion(null), FADE_MS)
    return () => clearTimeout(t)
  }, [prevEmotion])

  useEffect(() => {
    if (!audio) return

    const ensureCtx = () => {
      if (!ctxRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        ctxRef.current = new Ctx()
      }
      if (!sourceRef.current) {
        sourceRef.current = ctxRef.current.createMediaElementSource(audio)
        analyserRef.current = ctxRef.current.createAnalyser()
        analyserRef.current.fftSize = 256
        sourceRef.current.connect(analyserRef.current)
        analyserRef.current.connect(ctxRef.current.destination)
      }
    }

    const tick = () => {
      const analyser = analyserRef.current
      if (!analyser) {
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
      const rms = Math.sqrt(sum / data.length)
      setAmplitude(Math.min(1, rms * 4))
      rafRef.current = requestAnimationFrame(tick)
    }

    const onPlay = () => {
      ensureCtx()
      ctxRef.current?.resume()
      if (!rafRef.current) tick()
    }

    const onEnd = () => {
      setAmplitude(0)
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('pause', onEnd)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('pause', onEnd)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [audio])

  const mouthHeight = 4 + amplitude * 22
  const speaking = amplitude > 0.05

  const currentSrc = overrides?.[emotion] ?? EMOTION_SRC[emotion]
  const prevSrc = prevEmotion ? (overrides?.[prevEmotion] ?? EMOTION_SRC[prevEmotion]) : null

  // Размер glow зависит от амплитуды голоса
  const glowIntensity = 0.3 + amplitude * 0.7
  const glowSize = 40 + amplitude * 30

  return (
    <div
      className="relative select-none"
      style={{ width: size, height: size * 1.33 }}
    >
      {/* Glow за персонажем — пульсирует с голосом */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, rgba(236,72,153,${glowIntensity * 0.4}) 0%, rgba(168,85,247,${glowIntensity * 0.2}) 30%, transparent 60%)`,
          filter: `blur(${glowSize}px)`,
          opacity: speaking ? 1 : 0,
          transition: 'opacity 200ms ease-out',
        }}
      />

      {/* Предыдущая эмоция (fade out) */}
      {prevSrc && (
        <img
          key={prevSrc}
          src={prevSrc}
          alt=""
          width={size}
          height={size * 1.33}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          style={{
            animation: `kikaFadeOut ${FADE_MS}ms ease-out forwards`,
          }}
          draggable={false}
        />
      )}

      {/* Текущая эмоция (fade in) */}
      <img
        key={currentSrc}
        src={currentSrc}
        alt={`Yukai ${emotion}`}
        width={size}
        height={size * 1.33}
        className="pointer-events-none relative h-full w-full object-contain"
        style={prevSrc ? { animation: `kikaFadeIn ${FADE_MS}ms ease-out forwards` } : undefined}
        draggable={false}
      />

      {/* Анимация рта на голос */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-rose-700/70"
        style={{
          bottom: '28%',
          width: 28 + amplitude * 10,
          height: mouthHeight,
          transition: 'height 40ms linear, width 40ms linear',
          mixBlendMode: 'multiply',
        }}
      />

      <style>{`
        @keyframes kikaFadeIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @keyframes kikaFadeOut {
          from { opacity: 1 }
          to { opacity: 0 }
        }
      `}</style>
    </div>
  )
}
