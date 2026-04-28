'use client'

import { useEffect, useRef, useState } from 'react'
import { aiFetch } from '@/shared/api/aiFetch'

export type DictationItem = {
  ts: number
  text: string
}

type Options = {
  // ID микрофона из настроек (пустая строка = default device)
  deviceId?: string
  // Вызывается когда распознанный текст вставлен — для истории
  onTranscript?: (text: string) => void
  // Язык распознавания (ISO 639-1: ru, en, ja, ...). Default — 'ru'.
  language?: string
}

const STORAGE_KEY = 'kika:dictation-history'

// Диктовка через Right Alt hold-to-talk (Wispr Flow-style).
// Запись → STT с LLM-очисткой → вставка в активное поле через clipboard + keybd_event.
export function useDictation({ deviceId, onTranscript, language = 'ru' }: Options) {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [history, setHistory] = useState<DictationItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const activeRef = useRef(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const deviceIdRef = useRef(deviceId)
  const onTranscriptRef = useRef(onTranscript)
  useEffect(() => { deviceIdRef.current = deviceId })
  useEffect(() => { onTranscriptRef.current = onTranscript })

  function addToHistory(text: string) {
    setHistory((prev) => {
      const next = [{ ts: Date.now(), text }, ...prev].slice(0, 30)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  async function start() {
    if (activeRef.current) return
    activeRef.current = true
    setRecording(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...(deviceIdRef.current ? { deviceId: { exact: deviceIdRef.current } } : {}),
          autoGainControl: true,
          noiseSuppression: true,
          echoCancellation: true,
        },
      })
      streamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size < 1000) {
          setTranscribing(false)
          return
        }
        setTranscribing(true)
        try {
          const form = new FormData()
          form.append('audio', new File([blob], 'dictation.webm', { type: mimeType }))
          form.append('language', language)
          form.append('clean', 'true') // LLM чистит слова-паразиты + пунктуация
          const res = await aiFetch('/stt', { method: 'POST', body: form })
          if (!res.ok) throw new Error(await res.text())
          const { text } = (await res.json()) as { text: string }
          const trimmed = text?.trim() ?? ''
          if (trimmed) {
            addToHistory(trimmed)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const api = (window as any).electronAPI
            api?.pasteText?.(trimmed)
            onTranscriptRef.current?.(trimmed)
          }
        } catch (e) {
          console.error('[dictation] STT failed:', e)
        } finally {
          setTranscribing(false)
        }
      }

      recorder.start()
      recorderRef.current = recorder
    } catch (e) {
      console.error('[dictation] start failed:', e)
      activeRef.current = false
      setRecording(false)
    }
  }

  function stop() {
    if (!activeRef.current) return
    activeRef.current = false
    setRecording(false)
    recorderRef.current?.stop()
    recorderRef.current = null
  }

  return { recording, transcribing, history, start, stop }
}
