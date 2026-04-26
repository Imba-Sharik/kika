'use client'

import { useEffect, useRef, useState } from 'react'
import { getAiBaseUrl } from '@/shared/api/strapi'

type Props = {
  onTranscript: (text: string) => void
  onSpeechChange?: (speaking: boolean) => void
  paused?: boolean
  language?: string
  deviceId?: string
}

type VadState = 'off' | 'loading' | 'listening' | 'speech' | 'transcribing'

type MicVADInstance = {
  start: () => void
  pause: () => void
  destroy: () => void
}

export function ListenButton({ onTranscript, onSpeechChange, paused, language = 'ru', deviceId }: Props) {
  const [state, setState] = useState<VadState>('off')
  function setStateBoth(s: VadState) { stateRef.current = s; setState(s) }
  const [error, setError] = useState<string | null>(null)
  const vadRef = useRef<MicVADInstance | null>(null)
  const stateRef = useRef<VadState>('off')
  const pausedRef = useRef<boolean>(!!paused)
  const transcribingRef = useRef<boolean>(false)
  const utilsRef = useRef<{ encodeWAV: (a: Float32Array) => ArrayBuffer } | null>(null)
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat) return
      if (e.ctrlKey && e.code === 'KeyZ') {
        e.preventDefault()
        if (stateRef.current !== 'off') stop()
        else void start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
          if (!pausedRef.current) { setStateBoth('speech'); onSpeechChange?.(true) }
        },
        onSpeechEnd: (audio) => {
          setStateBoth('listening')
          onSpeechChange?.(false)
          void sendAudio(audio)
        },
        model: 'v5',
        onnxWASMBasePath: '/vad/',
        baseAssetPath: '/vad/',
        positiveSpeechThreshold: 0.4,
        negativeSpeechThreshold: 0.25,
        minSpeechMs: 250,
        preSpeechPadMs: 200,
        redemptionMs: 100,
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
      setStateBoth('off')
    }
  }

  function stop() {
    vadRef.current?.destroy()
    vadRef.current = null
    setStateBoth('off')
  }

  const on = state !== 'off'
  const label =
    state === 'loading'
      ? '…'
      : state === 'transcribing'
        ? '⋯'
        : state === 'speech'
          ? '●'
          : on
            ? 'Слушаю'
            : 'Hands-free'

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={on ? stop : start}
        className={`rounded px-3 py-2 text-xs ${
          state === 'speech'
            ? 'bg-red-600 text-white'
            : on
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-black'
        }`}
        title={on ? 'Выключить hands-free' : 'Включить постоянное прослушивание'}
      >
        {label}
      </button>
      {error && (
        <div className="max-w-50 truncate text-xs text-red-600" title={error}>
          {error}
        </div>
      )}
    </div>
  )
}
