'use client'

import { useRef, useState } from 'react'

type Props = {
  onTranscript: (text: string) => void
  onRecordingChange?: (recording: boolean) => void
  disabled?: boolean
  language?: string
}

export function MicButton({ onTranscript, onRecordingChange, disabled, language = 'ru' }: Props) {
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  async function start() {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
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

        try {
          const form = new FormData()
          form.append('audio', new File([blob], 'audio.webm', { type: mimeType }))
          form.append('language', language)
          const res = await fetch('/api/stt', { method: 'POST', body: form })
          if (!res.ok) throw new Error(await res.text())
          const { text } = (await res.json()) as { text: string }
          if (text?.trim()) onTranscript(text.trim())
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e))
        } finally {
          setTranscribing(false)
        }
      }

      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
      onRecordingChange?.(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function stop() {
    if (!recorderRef.current) return
    setRecording(false)
    setTranscribing(true)
    onRecordingChange?.(false)
    recorderRef.current.stop()
    recorderRef.current = null
  }

  const busy = disabled || transcribing
  const label = transcribing ? '…' : recording ? '■' : '🎤'

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        onMouseDown={start}
        onMouseUp={stop}
        onMouseLeave={() => recording && stop()}
        onTouchStart={start}
        onTouchEnd={stop}
        disabled={busy}
        className={`rounded px-4 py-2 text-white disabled:opacity-50 ${
          recording ? 'bg-red-600' : 'bg-black'
        }`}
        title="Нажми и держи чтобы говорить"
      >
        {label}
      </button>
      {error && (
        <div className="max-w-[200px] truncate text-xs text-red-600" title={error}>
          {error}
        </div>
      )}
    </div>
  )
}
