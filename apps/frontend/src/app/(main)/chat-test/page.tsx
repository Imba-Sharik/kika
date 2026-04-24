'use client'

import { useEffect, useRef, useState } from 'react'
import type { ModelMessage } from 'ai'
import { KikaFace } from '@/widgets/kika-face/KikaFace'
import { MicButton } from '@/features/mic-input/MicButton'
import { ListenButton } from '@/features/mic-input/ListenButton'
import {
  EMOTIONS,
  buildSystemPrompt,
  stripMediaTags,
  type Emotion,
} from '@/shared/kika/persona'
import { EnglishImages } from '@/features/english-images/EnglishImages'
import {
  DEFAULT_VOICE_ID,
  type Voice,
  type TtsProvider,
  loadUserVoices,
  saveUserVoices,
  getAllVoices,
  findVoice,
} from '@/shared/kika/voices'
import {
  DEFAULT_CHARACTER_ID,
  type Character,
  loadUserCharacters,
  saveUserCharacters,
  getAllCharacters,
  findCharacter,
} from '@/shared/kika/characters'

const MODEL_PRESETS = [
  { id: 'haiku', label: '⚡ Haiku (быстрый)', provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  { id: 'gpt4o-mini', label: '⚡ GPT-4o mini', provider: 'openai', model: 'gpt-4o-mini' },
  { id: 'deepseek', label: '⚡ DeepSeek', provider: 'deepseek', model: 'deepseek-chat' },
  { id: 'sonnet', label: '🧠 Sonnet (умный)', provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
] as const

export default function ChatTestPage() {
  const [input, setInput] = useState('Привет! Как дела?')
  const [messages, setMessages] = useState<ModelMessage[]>([])
  const [streaming, setStreaming] = useState<string>('')
  const [emotion, setEmotion] = useState<Emotion>('neutral')
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [voiceId, setVoiceId] = useState<string>(DEFAULT_VOICE_ID)
  const [userVoices, setUserVoices] = useState<Voice[]>(loadUserVoices)
  const [showVoiceForm, setShowVoiceForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newProvider, setNewProvider] = useState<TtsProvider>('fish')
  const [newVoiceId, setNewVoiceId] = useState('')

  const [modelPresetId, setModelPresetId] = useState<string>('haiku')

  const [characterId, setCharacterId] = useState<string>(DEFAULT_CHARACTER_ID)
  const [userChars, setUserChars] = useState<Character[]>(loadUserCharacters)
  const [showCharForm, setShowCharForm] = useState(false)
  const [charName, setCharName] = useState('')
  const [charPersona, setCharPersona] = useState('')
  const [charVoiceId, setCharVoiceId] = useState(DEFAULT_VOICE_ID)
  const [editingCharId, setEditingCharId] = useState<string | null>(null)

  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  useEffect(() => {
    try { localStorage.setItem('kika:overlay:emotion', emotion) } catch {}
  }, [emotion])

  useEffect(() => {
    try { localStorage.setItem('kika:overlay:voiceId', voiceId) } catch {}
  }, [voiceId])

  const allVoices = getAllVoices(userVoices)
  const allChars = getAllCharacters(userChars)
  const character = findCharacter(characterId, userChars)
  const voice = findVoice(voiceId || character.voiceId, userVoices)

  function addVoice() {
    const label = newLabel.trim()
    const vid = newVoiceId.trim()
    if (!label || !vid) return
    const next: Voice = {
      id: `user-${Date.now()}`,
      label,
      provider: newProvider,
      voiceId: vid,
    }
    const updated = [...userVoices, next]
    setUserVoices(updated)
    saveUserVoices(updated)
    setNewLabel('')
    setNewVoiceId('')
    setShowVoiceForm(false)
  }

  function removeVoice(id: string) {
    const updated = userVoices.filter((v) => v.id !== id)
    setUserVoices(updated)
    saveUserVoices(updated)
    if (voiceId === id) setVoiceId(DEFAULT_VOICE_ID)
  }

  function openCharForm(target?: Character) {
    if (target) {
      setEditingCharId(target.id)
      setCharName(target.name)
      setCharPersona(target.persona)
      setCharVoiceId(target.voiceId)
    } else {
      setEditingCharId(null)
      setCharName('')
      setCharPersona('')
      setCharVoiceId(DEFAULT_VOICE_ID)
    }
    setShowCharForm(true)
  }

  function saveCharacter() {
    const name = charName.trim()
    const persona = charPersona.trim()
    if (!name || !persona) return

    const next: Character = {
      id: editingCharId ?? `char-${Date.now()}`,
      name,
      persona,
      voiceId: charVoiceId,
    }

    const updated = editingCharId
      ? userChars.map((c) => (c.id === editingCharId ? next : c))
      : [...userChars, next]

    setUserChars(updated)
    saveUserCharacters(updated)
    setCharacterId(next.id)
    setShowCharForm(false)
    setEditingCharId(null)
  }

  function removeCharacter(id: string) {
    const updated = userChars.filter((c) => c.id !== id)
    setUserChars(updated)
    saveUserCharacters(updated)
    if (characterId === id) setCharacterId(DEFAULT_CHARACTER_ID)
  }

  async function fetchAudio(text: string, emotionTag: Emotion = 'neutral'): Promise<string> {
    const ttsText = text.replace(/\*\*?|__?|~~|`/g, '').replace(/\s+/g, ' ').trim()
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: ttsText,
        emotion: emotionTag,
        provider: voice.provider,
        voiceId: voice.voiceId,
      }),
    })
    if (!res.ok) throw new Error(await res.text())
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  }

  async function playAudio(url: string) {
    const audio = audioEl
    if (!audio) return
    audio.src = url
    await audio.play()
    await new Promise<void>((resolve) => {
      const onEnd = () => {
        audio.removeEventListener('ended', onEnd)
        URL.revokeObjectURL(url)
        resolve()
      }
      audio.addEventListener('ended', onEnd)
    })
  }

  async function send(overrideText?: string) {
    const userMsg = (overrideText ?? input).trim()
    if (!userMsg) return
    setLoading(true)
    setEmotion('thinking')
    setError(null)
    setStreaming('')
    setInput('')

    const next: ModelMessage[] = [...messages, { role: 'user', content: userMsg }]
    setMessages(next)

    const t0 = performance.now()

    // Sentence-level streaming pipeline: fetch TTS per sentence as Claude streams
    const audioQueue: Array<{ urlPromise: Promise<string>; emotion: Emotion }> = []
    let streamDone = false
    let playbackPromise: Promise<void> | null = null

    function enqueueSentence(text: string, emotion: Emotion) {
      if (text.length < 3) return
      audioQueue.push({ urlPromise: fetchAudio(text, emotion).catch(() => ''), emotion })
      if (!playbackPromise) playbackPromise = runPlayback()
    }

    async function runPlayback() {
      setSpeaking(true)
      let firstSound = true
      try {
        while (!streamDone || audioQueue.length > 0) {
          if (audioQueue.length === 0) {
            await new Promise<void>((r) => setTimeout(r, 30))
            continue
          }
          const { urlPromise, emotion: seg } = audioQueue.shift()!
          setEmotion(seg)
          const url = await urlPromise
          if (firstSound) {
            console.log(`[timing] First sound: ${((performance.now() - t0) / 1000).toFixed(2)}s`)
            firstSound = false
          }
          if (url) await playAudio(url)
        }
      } finally {
        setSpeaking(false)
        console.log(`[timing] Total with playback: ${((performance.now() - t0) / 1000).toFixed(2)}s`)
      }
    }

    // Extract complete sentences from buffer, fire TTS per sentence
    // Eager первая фраза: эмитим на запятой после 12+ символов — сокращает TTFB
    let firstEmitted = false

    function extractSentences(buffer: string, emotion: Emotion): { remainder: string; emotion: Emotion } {
      let pos = 0
      let lastEmit = 0
      let cur = emotion

      while (pos < buffer.length) {
        if (buffer[pos] === '[') {
          const close = buffer.indexOf(']', pos)
          if (close === -1) break // incomplete tag — leave in buffer
          const tag = buffer.slice(pos + 1, close).toLowerCase()
          if ((EMOTIONS as readonly string[]).includes(tag)) cur = tag as Emotion
          pos = close + 1
          continue
        }

        if (buffer[pos] === '.' || buffer[pos] === '!' || buffer[pos] === '?') {
          const next = buffer[pos + 1]
          if (next === undefined || next === ' ' || next === '\n' || next === '[') {
            const raw = buffer.slice(lastEmit, pos + 1)
            const clean = raw.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim()
            enqueueSentence(clean, cur)
            firstEmitted = true
            lastEmit = pos + 1
          }
        }

        // Eager first chunk — только для первой фразы, ловим запятую после 12+ символов
        if (!firstEmitted && buffer[pos] === ',' && pos >= lastEmit + 12) {
          const nextCh = buffer[pos + 1]
          if (nextCh === ' ' || nextCh === undefined) {
            const raw = buffer.slice(lastEmit, pos + 1)
            const clean = raw.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim()
            enqueueSentence(clean, cur)
            firstEmitted = true
            lastEmit = pos + 1
          }
        }

        // Split on em-dash " — " as a natural speech boundary
        if (
          pos >= lastEmit + 20 &&
          buffer[pos] === '—' &&
          buffer[pos - 1] === ' ' &&
          buffer[pos + 1] === ' '
        ) {
          const raw = buffer.slice(lastEmit, pos)
          const clean = raw.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim()
          enqueueSentence(clean, cur)
          firstEmitted = true
          lastEmit = pos + 2 // skip "— "
        }

        pos++
      }

      return { remainder: buffer.slice(lastEmit), emotion: cur }
    }

    let full = ''
    let streamBuf = ''
    let streamEmotion: Emotion = 'neutral'

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          system: buildSystemPrompt(character.persona),
          provider: MODEL_PRESETS.find((p) => p.id === modelPresetId)?.provider ?? 'anthropic',
          model: MODEL_PRESETS.find((p) => p.id === modelPresetId)?.model,
        }),
      })
      if (!res.ok || !res.body) throw new Error(await res.text())

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        full += chunk
        streamBuf += chunk
        setStreaming(full)
        ;({ remainder: streamBuf, emotion: streamEmotion } = extractSentences(streamBuf, streamEmotion))
      }

      console.log(`[timing] Claude: ${((performance.now() - t0) / 1000).toFixed(2)}s`)

      // Flush remainder (text without trailing punctuation)
      if (streamBuf.trim()) {
        const clean = streamBuf.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim()
        enqueueSentence(clean, streamEmotion)
      }

      setMessages([...next, { role: 'assistant', content: full }])
      setStreaming('')
      streamDone = true
      if (playbackPromise) await playbackPromise
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      streamDone = true
    } finally {
      setLoading(false)
    }
  }

  function resetChat() {
    setMessages([])
    setStreaming('')
    setEmotion('neutral')
    setError(null)
  }

  const isUserVoice = userVoices.some((v) => v.id === voiceId)
  const isUserChar = userChars.some((c) => c.id === characterId)

  return (
    <main className="mx-auto flex max-w-6xl gap-6 p-6" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Левая колонка — персонаж и настройки */}
      <aside className="sticky top-6 flex h-fit w-64 flex-shrink-0 flex-col items-center gap-3">
        <KikaFace emotion={emotion} audio={audioEl} size={240} />
        <div className="text-center text-xs text-gray-500">
          {character.name} · {emotion}
          <br />
          {speaking ? 'говорит…' : loading ? 'думает…' : 'готова'}
        </div>

        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <label className="w-16 text-xs text-gray-500">персонаж:</label>
            <select
              value={characterId}
              onChange={(e) => { setCharacterId(e.target.value); resetChat() }}
              className="flex-1 rounded border px-2 py-1 text-xs"
              disabled={loading || speaking}
            >
              {allChars.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="button" onClick={() => openCharForm()} className="rounded border px-2 py-1 text-xs" disabled={loading || speaking}>+</button>
            {isUserChar && (
              <>
                <button type="button" onClick={() => openCharForm(character)} className="rounded border px-2 py-1 text-xs" disabled={loading || speaking}>ред.</button>
                <button type="button" onClick={() => removeCharacter(characterId)} className="rounded border border-red-400 px-2 py-1 text-xs text-red-600" disabled={loading || speaking}>×</button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <label className="w-16 text-xs text-gray-500">модель:</label>
            <select value={modelPresetId} onChange={(e) => setModelPresetId(e.target.value)} className="flex-1 rounded border px-2 py-1 text-xs" disabled={loading || speaking}>
              {MODEL_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <label className="w-16 text-xs text-gray-500">голос:</label>
            <select value={voice.id} onChange={(e) => setVoiceId(e.target.value)} className="flex-1 rounded border px-2 py-1 text-xs" disabled={loading || speaking}>
              {allVoices.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            <button type="button" onClick={() => setShowVoiceForm((v) => !v)} className="rounded border px-2 py-1 text-xs" disabled={loading || speaking}>
              {showVoiceForm ? '×' : '+'}
            </button>
            {isUserVoice && (
              <button type="button" onClick={() => removeVoice(voice.id)} className="rounded border border-red-400 px-2 py-1 text-xs text-red-600" disabled={loading || speaking}>×</button>
            )}
          </div>
        </div>

        {showVoiceForm && (
          <div className="flex w-full flex-col gap-2 rounded border p-3 text-sm">
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Название" className="rounded border px-2 py-1 text-xs" />
            <select value={newProvider} onChange={(e) => setNewProvider(e.target.value as TtsProvider)} className="rounded border px-2 py-1 text-xs">
              <option value="fish">Fish Audio</option>
              <option value="elevenlabs">ElevenLabs</option>
            </select>
            <input value={newVoiceId} onChange={(e) => setNewVoiceId(e.target.value)} placeholder="Voice ID" className="rounded border px-2 py-1 font-mono text-xs" />
            <button type="button" onClick={addVoice} disabled={!newLabel.trim() || !newVoiceId.trim()} className="rounded bg-black px-3 py-1 text-xs text-white disabled:opacity-50">Добавить</button>
          </div>
        )}

        {showCharForm && (
          <div className="flex w-full flex-col gap-2 rounded border p-3 text-sm">
            <div className="text-xs font-semibold text-gray-600">{editingCharId ? 'Редактировать' : 'Новый персонаж'}</div>
            <input value={charName} onChange={(e) => setCharName(e.target.value)} placeholder="Имя" className="rounded border px-2 py-1 text-xs" />
            <textarea value={charPersona} onChange={(e) => setCharPersona(e.target.value)} placeholder="Персона в Markdown…" className="min-h-[120px] rounded border px-2 py-1 font-mono text-xs" />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">голос:</label>
              <select value={charVoiceId} onChange={(e) => setCharVoiceId(e.target.value)} className="flex-1 rounded border px-2 py-1 text-xs">
                {allVoices.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={saveCharacter} disabled={!charName.trim() || !charPersona.trim()} className="flex-1 rounded bg-black px-3 py-1 text-xs text-white disabled:opacity-50">
                {editingCharId ? 'Сохранить' : 'Создать'}
              </button>
              <button type="button" onClick={() => setShowCharForm(false)} className="rounded border px-3 py-1 text-xs">Отмена</button>
            </div>
          </div>
        )}
      </aside>

      {/* Правая колонка — чат */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex-1 overflow-y-auto rounded border p-4">
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => {
              const raw = String(m.content)
              const isAssistant = m.role === 'assistant'
              const displayText = isAssistant
                ? stripMediaTags(raw).replace(/\[\w+\]/g, '').trim()
                : raw
              return (
                <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                  <div className="text-xs text-gray-500">{m.role}</div>
                  <div className="whitespace-pre-wrap">{displayText}</div>
                  {isAssistant && <EnglishImages content={raw} />}
                </div>
              )
            })}
            {streaming && (
              <div>
                <div className="text-xs text-gray-500">assistant (streaming)</div>
                <div className="whitespace-pre-wrap">
                  {stripMediaTags(streaming).replace(/\[\w+\]/g, '').trim()}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && send()}
            placeholder={`Скажи что-нибудь ${character.name}…`}
            className="flex-1 rounded border px-3 py-2"
            disabled={loading}
          />
          <MicButton
            onTranscript={(text) => send(text)}
            onRecordingChange={(active) => { if (active) setEmotion('listening') }}
            disabled={loading || speaking}
          />
          <ListenButton
            onTranscript={(text) => send(text)}
            onSpeechChange={(active) => { if (active) setEmotion('listening') }}
            paused={loading || speaking}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
            {loading ? '…' : 'Send'}
          </button>
        </div>

        {error && <pre className="whitespace-pre-wrap text-sm text-red-600">{error}</pre>}
      </div>

      <audio ref={setAudioEl} className="hidden" />
    </main>
  )
}
