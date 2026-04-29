'use client'

import { useEffect, useRef, useState } from 'react'
import { aiFetch } from '@/shared/api/aiFetch'

export type MusicItem = {
  ts: number
  title: string
  artist: string
  album?: string
  spotify?: string | null
  apple_music?: string | null
}

type Options = {
  // Вызывается когда Kika должна что-то сказать юзеру про результат.
  onResult: (text: string) => void
  // Эмоция персонажа — хук выставляет 'listening' во время записи.
  onEmotion?: (emotion: 'listening' | 'neutral') => void
}

const STORAGE_KEY = 'kika:music-history'

// Распознавание песен через захват системного звука (loopback) → AudD API.
// Вызов start/stop — например, по глобальному хоткею Alt+`.
export function useMusicRecognition({ onResult, onEmotion }: Options) {
  const [listening, setListening] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const [history, setHistory] = useState<MusicItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const activeRef = useRef(false)
  const onResultRef = useRef(onResult)
  const onEmotionRef = useRef(onEmotion)
  useEffect(() => { onResultRef.current = onResult })
  useEffect(() => { onEmotionRef.current = onEmotion })

  function addToHistory(item: MusicItem) {
    setHistory((prev) => {
      const next = [item, ...prev].slice(0, 20)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  async function start() {
    if (activeRef.current || recognizing) return
    activeRef.current = true
    setListening(true)
    onEmotionRef.current?.('listening')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI
    if (!api?.getDesktopAudioSource) {
      console.error('[music] desktop capture API not available')
      activeRef.current = false
      setListening(false)
      return
    }

    try {
      const sourceId: string | null = await api.getDesktopAudioSource()
      if (!sourceId) throw new Error('no desktop source')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stream = await (navigator.mediaDevices.getUserMedia as any)({
        audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } },
        video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } },
      }) as MediaStream

      stream.getVideoTracks().forEach((t) => t.stop())
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
        if (blob.size < 5000) {
          setRecognizing(false)
          return
        }
        setRecognizing(true)
        try {
          const form = new FormData()
          form.append('audio', new File([blob], 'sample.webm', { type: mimeType }))
          const res = await aiFetch(`/recognize-music`, { method: 'POST', body: form })
          if (!res.ok) throw new Error(await res.text())
          const result = await res.json()
          if (!result.found) {
            onResultRef.current('Скажи пользователю что ты не смогла распознать эту песню.')
          } else {
            addToHistory({
              ts: Date.now(),
              title: result.title,
              artist: result.artist,
              album: result.album,
              spotify: result.spotify,
              apple_music: result.apple_music,
            })
            const msg = `Скажи пользователю что сейчас играет "${result.title}" — ${result.artist}${result.album ? ` из альбома "${result.album}"` : ''}. Коротко, в своём стиле.`
            onResultRef.current(msg)
          }
        } catch (e) {
          console.error('[music] recognition failed:', e)
        } finally {
          setRecognizing(false)
        }
      }
      recorder.start()
      recorderRef.current = recorder
    } catch (e) {
      console.error('[music] start failed:', e)
      activeRef.current = false
      setListening(false)
      onEmotionRef.current?.('neutral')
    }
  }

  function stop() {
    if (!activeRef.current) return
    activeRef.current = false
    setListening(false)
    recorderRef.current?.stop()
    recorderRef.current = null
  }

  return { listening, recognizing, history, start, stop }
}
