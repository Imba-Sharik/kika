'use client'

import { useEffect, useRef, useState } from 'react'
import { getAiBaseUrl } from '@/shared/api/strapi'

export type VadState = 'off' | 'loading' | 'listening' | 'speech' | 'transcribing' | 'error'

type Options = {
  onTranscript: (text: string) => void
  onSpeechChange?: (speaking: boolean) => void
  paused?: boolean
  language?: string
  deviceId?: string
  // Порог срабатывания VAD: 0.3 (низкий = чувствительный, ловит тихий голос + шум) …
  // 0.9 (высокий = только уверенная речь). Дефолт 0.4 — компромисс для тихой комнаты.
  vadThreshold?: number
  // Test mode: VAD работает (крутит onFrameProcessed для UI), но не шлёт речь
  // в STT/чат. Используется для настройки порога без "случайных разговоров".
  testMode?: boolean
}

type MicVADInstance = {
  start: () => void
  pause: () => void
  destroy: () => void
  setOptions: (update: { positiveSpeechThreshold?: number; negativeSpeechThreshold?: number }) => void
}

// Headless VAD-хук: всё поведение ListenButton без UI.
// Возвращает state + управление. Рисовать можно как угодно.
export function useMicListener({
  onTranscript,
  onSpeechChange,
  paused,
  language = 'ru',
  deviceId,
  vadThreshold = 0.4,
  testMode = false,
}: Options) {
  const [state, setState] = useState<VadState>('off')
  const [error, setError] = useState<string | null>(null)
  // Текущая Silero-вероятность (0-1) что юзер говорит прямо сейчас. Это ТА ЖЕ шкала,
  // что и `positiveSpeechThreshold` — полезно для UI-полоски «настройка чувствительности».
  const [vadProbability, setVadProbability] = useState(0)
  const vadRef = useRef<MicVADInstance | null>(null)
  const stateRef = useRef<VadState>('off')
  const pausedRef = useRef<boolean>(!!paused)
  const transcribingRef = useRef<boolean>(false)
  const utilsRef = useRef<{ encodeWAV: (a: Float32Array) => ArrayBuffer } | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  // Аналогично onTranscript — MicVAD.new() вызывается один раз в start(), так что
  // callback захватывается закрытием. Без ref barge-in ломается: onSpeechChange
  // читает state Кики из момента включения мика, а не из текущего рендера.
  const onSpeechChangeRef = useRef(onSpeechChange)
  // testMode через ref — MicVAD callbacks захватывают закрытие один раз в start().
  const testModeRef = useRef(testMode)

  function setStateBoth(s: VadState) {
    if (s === 'off' && stateRef.current !== 'off') {
      // Диагностика: откуда пришло выключение мика (сам юзер или баг)
      console.trace('[mic] state → off (from:', stateRef.current, ')')
    }
    stateRef.current = s
    setState(s)
  }

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    onSpeechChangeRef.current = onSpeechChange
  }, [onSpeechChange])

  useEffect(() => {
    testModeRef.current = testMode
  }, [testMode])

  // Живое обновление порога — без перезапуска VAD. setOptions пробрасывает
  // новые значения во frame-processor, следующий frame уже использует их.
  useEffect(() => {
    const vad = vadRef.current
    if (!vad) return
    vad.setOptions({
      positiveSpeechThreshold: vadThreshold,
      negativeSpeechThreshold: Math.max(0.1, vadThreshold * 0.6),
    })
  }, [vadThreshold])

  useEffect(() => {
    pausedRef.current = !!paused
    const vad = vadRef.current
    if (!vad) return
    if (paused) {
      vad.pause()
    } else if (state === 'listening' || state === 'speech') {
      vad.start()
    }
  }, [paused, state])

  useEffect(() => {
    return () => {
      vadRef.current?.destroy()
      vadRef.current = null
    }
  }, [])

  async function sendAudio(audio: Float32Array) {
    if (transcribingRef.current) return
    const utils = utilsRef.current
    if (!utils) return

    transcribingRef.current = true
    setStateBoth('transcribing')
    try {
      const wavBuffer = utils.encodeWAV(audio)
      const blob = new Blob([wavBuffer], { type: 'audio/wav' })
      const form = new FormData()
      form.append('audio', new File([blob], 'speech.wav', { type: 'audio/wav' }))
      form.append('language', language)

      const res = await fetch(`${getAiBaseUrl()}/stt`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text())
      const { text } = (await res.json()) as { text: string }
      if (text?.trim()) onTranscriptRef.current(text.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      transcribingRef.current = false
      setStateBoth(stateRef.current === 'off' ? 'off' : 'listening')
    }
  }

  async function start() {
    setError(null)
    setStateBoth('loading')
    try {
      const mod = await import('@ricky0123/vad-web')
      utilsRef.current = mod.utils

      const vad = await mod.MicVAD.new({
        onSpeechStart: () => {
          if (!pausedRef.current) {
            setStateBoth('speech')
            onSpeechChangeRef.current?.(true)
          }
        },
        onSpeechEnd: (audio) => {
          setStateBoth('listening')
          onSpeechChangeRef.current?.(false)
          // В test-режиме (настройки открыты) не шлём речь в STT/чат.
          if (testModeRef.current) return
          void sendAudio(audio)
        },
        onFrameProcessed: (probs) => {
          // Real-time Silero-вероятность — для UI-полоски в настройках.
          // Тикает каждые 32мс (30fps), React батчит рендеры.
          setVadProbability(probs.isSpeech)
        },
        model: 'v5',
        onnxWASMBasePath: '/vad/',
        baseAssetPath: '/vad/',
        positiveSpeechThreshold: vadThreshold,
        // Negative держим на 60% от positive — промежуток для стабильности гистерезиса
        // (исключает дёрганье speech/silence у границы threshold).
        negativeSpeechThreshold: Math.max(0.1, vadThreshold * 0.6),
        // 400мс минимум — короче обычно кашель/клик мыши/стук. Whisper на
        // коротких шумах галлюцинирует «субтитры сделал DimaTorzok» и т.п.
        minSpeechMs: 400,
        preSpeechPadMs: 200,
        // Сколько мс тишины ждём прежде чем считать что юзер договорил.
        // 100мс (раньше) — реживет паузы в речи. 700мс — стандарт как у
        // OpenAI Realtime / ChatGPT voice: даёт договорить, но не слишком медленно.
        redemptionMs: 700,
        // v6 API: аудио получаем сами через getStream, передаём свои constraints
        getStream: () =>
          navigator.mediaDevices.getUserMedia({
            audio: {
              ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
              autoGainControl: true,
              noiseSuppression: true,
              echoCancellation: true,
            },
          }),
      })

      vadRef.current = vad
      if (!pausedRef.current) vad.start()
      setStateBoth('listening')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStateBoth('error')
    }
  }

  function stop() {
    vadRef.current?.destroy()
    vadRef.current = null
    setStateBoth('off')
  }

  function toggle() {
    if (stateRef.current === 'off' || stateRef.current === 'error') void start()
    else stop()
  }

  // Ctrl+Z больше не слушаем через window — глобальный хоткей повешен в Electron
  // main process (uIOhook), сигнал приходит через electronAPI.onMicToggle.
  // Overlay-страница сама подключает слушатель и вызывает toggle().

  return { state, error, vadProbability, start, stop, toggle }
}
