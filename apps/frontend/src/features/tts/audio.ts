// Чистые TTS-хелперы: fetch текста → аудио, и два способа воспроизведения.
// Логика очереди и управления потоком остаётся на вызывающей стороне (пока —
// в overlay page.tsx в функции send, потом вынесем в useTTSPipeline).

export type TtsVoice = {
  provider: 'fish' | 'elevenlabs'
  voiceId: string
}

// POST /api/tts → Response с mp3-потоком (может быть streaming, может быть полное тело).
export async function fetchTts(text: string, voice: TtsVoice): Promise<Response> {
  const ttsText = text.replace(/\*\*?|__?|~~|`/g, '').replace(/\s+/g, ' ').trim()
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: ttsText,
      provider: voice.provider,
      voiceId: voice.voiceId,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res
}

// Воспроизведение через blob URL — быстрый swap без MSE overhead.
// Используем для 2-й+ фразы в пайплайне (~50мс смена audio.src vs ~300мс MSE setup).
export async function playViaBlob(res: Response, audio: HTMLAudioElement): Promise<void> {
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  audio.src = url
  try {
    await audio.play()
  } catch (err) {
    console.warn('[tts] blob play failed:', err)
  }
  await new Promise<void>((resolve) => {
    const onEnd = () => {
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('error', onEnd)
      audio.removeEventListener('pause', onEnd)
      URL.revokeObjectURL(url)
      resolve()
    }
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('error', onEnd)
    audio.addEventListener('pause', onEnd) // barge-in: interrupt() паузит — выходим сразу
  })
}

// Потоковое воспроизведение через MediaSource API.
// Используем для первой фразы — чтобы слышать звук как можно раньше (первый чанк
// TTS → play сразу, не ждём полное mp3).
export async function playViaStream(res: Response, audio: HTMLAudioElement): Promise<void> {
  if (!res.body) return

  const supportsMSE =
    typeof window !== 'undefined' &&
    'MediaSource' in window &&
    MediaSource.isTypeSupported('audio/mpeg')

  if (!supportsMSE) {
    // Фолбэк: полное тело → blob URL
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    audio.src = url
    await audio.play()
    await new Promise<void>((resolve) => {
      const onEnd = () => {
        audio.removeEventListener('ended', onEnd)
        audio.removeEventListener('pause', onEnd)
        URL.revokeObjectURL(url)
        resolve()
      }
      audio.addEventListener('ended', onEnd)
      audio.addEventListener('pause', onEnd)
    })
    return
  }

  const mediaSource = new MediaSource()
  const objectUrl = URL.createObjectURL(mediaSource)
  audio.src = objectUrl

  await new Promise<void>((resolve) => {
    mediaSource.addEventListener('sourceopen', () => resolve(), { once: true })
  })

  const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg')
  const reader = res.body.getReader()
  let started = false

  async function waitUpdate() {
    if (!sourceBuffer.updating) return
    await new Promise<void>((r) =>
      sourceBuffer.addEventListener('updateend', () => r(), { once: true }),
    )
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      await waitUpdate()
      sourceBuffer.appendBuffer(value)
      if (!started) {
        started = true
        audio.play().catch(() => {})
      }
    }
    await waitUpdate()
    try {
      if (mediaSource.readyState === 'open' && !sourceBuffer.updating) {
        mediaSource.endOfStream()
      }
    } catch (err) {
      console.warn('[tts] endOfStream skipped:', err)
    }
  } catch (err) {
    console.error('[tts] MSE error:', err)
  }

  // Ждём 'ended' с таймаутом — если не сработает, не блочим очередь.
  // 'pause' тоже выход — barge-in interrupt() паузит audio.
  await Promise.race([
    new Promise<void>((resolve) => {
      const onEnd = () => {
        audio.removeEventListener('ended', onEnd)
        audio.removeEventListener('error', onEnd)
        audio.removeEventListener('pause', onEnd)
        resolve()
      }
      audio.addEventListener('ended', onEnd)
      audio.addEventListener('error', onEnd)
      audio.addEventListener('pause', onEnd)
    }),
    new Promise<void>((resolve) => setTimeout(resolve, 30000)),
  ])
  URL.revokeObjectURL(objectUrl)
}
