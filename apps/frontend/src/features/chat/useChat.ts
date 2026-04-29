'use client'

import { useRef, useState } from 'react'
import type { ModelMessage } from 'ai'
import {
  buildSystemPrompt,
  LANG_NAME,
  type Emotion,
  type Language,
} from '@/shared/yukai/persona'
import { fetchTts, playViaBlob, playViaStream, type TtsVoice } from '@/features/tts/audio'
import { extractSentences } from '@/features/tts/sentenceStream'
import { executeMemoryTool } from '@/features/memory/executeMemoryTool'
import type { YukaiPlugin, ChatAttachment } from '@/features/plugin-system/types'
import { aiFetch } from '@/shared/api/aiFetch'

// Триггер-слова, при которых разрешаем tool_use. В обычном разговоре tools выключены —
// лишние tool_calls создают паузы 1-2с между фразами.
const TOOLS_TRIGGER_RE = /(?:запомни|запиши|добавь|сохрани|создай заметк|открой файл|открой заметк|удали|запоминай)/i

type ChatModel = {
  provider: 'anthropic' | 'openai' | 'deepseek'
  model: string
}

type UseChatOptions = {
  persona: string                    // характер Yukai (для system prompt)
  language: Language                 // язык по умолчанию (ru / en) — меняет EMOTION_PROTOCOL
  model: ChatModel                   // какая LLM используется
  voice: TtsVoice                    // голос для TTS
  profileMd: string                  // инжектится в [ПАМЯТЬ: profile.md]
  plugins: YukaiPlugin[]              // активные плагины — для injectSystemContext / onChatResponse
  audioElRef: React.RefObject<HTMLAudioElement | null>
  audioEl: HTMLAudioElement | null
  onEmotion: (e: Emotion) => void    // обновление лица персонажа
  onProfileUpdate: (md: string) => void  // инвалидация кеша после write/append в profile.md
}

// Главный чат-пайплайн: Claude streaming + TTS очередь + tool execution.
// Вызывающий рендерит streaming/loading/speaking — хук держит их в своём state.
export function useChat(opts: UseChatOptions) {
  const [messages, setMessages] = useState<ModelMessage[]>([])
  const [streaming, setStreaming] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Тайминги последнего ответа (от момента send()):
  // llmMs — когда первое предложение ушло в очередь TTS
  // ttsMs — когда прозвучал первый байт аудио
  const [lastTimings, setLastTimings] = useState<{ llmMs: number; ttsMs: number } | null>(null)

  // Refs для barge-in: interrupt() из любого места обрывает текущий send().
  // abortRef — стопит fetch к /api/chat и /api/tts.
  // currentQueueRef — чтобы обнулить очередь TTS снаружи send()-скоупа.
  // interruptedRef — флаг: "юзер прервал", чтобы send() не ломался исключением.
  const abortRef = useRef<AbortController | null>(null)
  const currentQueueRef = useRef<Array<{ resPromise: Promise<Response | null>; emotion: Emotion }> | null>(null)
  const interruptedRef = useRef(false)

  function interrupt() {
    interruptedRef.current = true
    abortRef.current?.abort()
    if (currentQueueRef.current) currentQueueRef.current.length = 0
    const audio = opts.audioElRef.current ?? opts.audioEl
    if (audio) {
      try {
        audio.pause()
        // Полностью сбрасываем audio — MediaSource иначе может доиграть буфер.
        // 'pause'-listener в playViaStream поймает событие и даст runPlayback выйти.
        audio.removeAttribute('src')
        audio.load()
      } catch {}
    }
    console.log('[chat] interrupt()')
  }

  async function send(userText: string, attachments?: ChatAttachment[]) {
    const userMsg = userText.trim()
    if (!userMsg && (!attachments || attachments.length === 0)) return
    // Если уже идёт активный send — прерываем его ПОЛНОСТЬЮ (abort fetch +
    // очистка TTS-очереди + остановка audio). Раньше был только abortRef.abort()
    // — fetch отменялся, но уже декодированный TTS audio продолжал играть и
    // очередь не очищалась → накопление параллельных pipeline'ов при быстрой
    // последовательности transcripts.
    interrupt()
    const abortController = new AbortController()
    abortRef.current = abortController
    interruptedRef.current = false
    setLoading(true)
    opts.onEmotion('thinking')
    setError(null)
    setStreaming('')
    setLastTimings(null)

    // Если есть картинки — собираем multimodal content (text + image parts).
    // Claude видит картинку как нативный ImagePart и помнит её на следующих ходах,
    // пока не вылезет из context window.
    const userContent = attachments && attachments.length > 0
      ? [
          { type: 'text' as const, text: userMsg },
          ...attachments.map((a) => ({
            type: 'image' as const,
            image: a.image.replace(/^data:image\/\w+;base64,/, ''),
            mediaType: a.mediaType,
          })),
        ]
      : userMsg
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const next: ModelMessage[] = [...messages, { role: 'user', content: userContent as any }]
    setMessages(next)

    const needsTools = TOOLS_TRIGGER_RE.test(userMsg)
    const t0 = performance.now()

    // Очередь воспроизведения TTS — наполняется по мере прихода предложений
    const audioQueue: Array<{ resPromise: Promise<Response | null>; emotion: Emotion }> = []
    currentQueueRef.current = audioQueue
    let streamDone = false
    let playbackPromise: Promise<void> | null = null

    let firstEnqueueMs: number | null = null
    function enqueueSentence(text: string, em: Emotion) {
      if (text.length < 3) return
      const ms = performance.now() - t0
      if (firstEnqueueMs === null) firstEnqueueMs = ms
      console.log(`[timing] enqueue @ ${(ms / 1000).toFixed(2)}s:`, text)
      audioQueue.push({
        resPromise: fetchTts(text, opts.voice).catch((e) => {
          console.error('[chat] TTS fetch:', e)
          return null
        }),
        emotion: em,
      })
      if (!playbackPromise) playbackPromise = runPlayback()
    }

    async function runPlayback() {
      setSpeaking(true)
      let firstSound = true
      try {
        while (!streamDone || audioQueue.length > 0) {
          if (interruptedRef.current) break
          if (audioQueue.length === 0) {
            await new Promise<void>((r) => setTimeout(r, 30))
            continue
          }
          const { resPromise, emotion: seg } = audioQueue.shift()!
          opts.onEmotion(seg)
          const res = await resPromise
          if (!res || interruptedRef.current) continue
          const audio = opts.audioElRef.current ?? opts.audioEl
          if (!audio) continue
          if (firstSound) {
            const ttsMs = performance.now() - t0
            console.log(`[timing] first bytes @ ${(ttsMs / 1000).toFixed(2)}s`)
            setLastTimings({ llmMs: firstEnqueueMs ?? ttsMs, ttsMs })
            // Первая фраза — MSE streaming (мгновенный первый звук).
            await playViaStream(res, audio)
            firstSound = false
          } else {
            // Остальные — через blob URL (нет gap на пересборку MediaSource).
            await playViaBlob(res, audio)
          }
        }
      } finally {
        setSpeaking(false)
      }
    }

    let full = ''
    let streamBuf = ''
    let streamEmotion: Emotion = 'neutral'

    try {
      // Собираем system prompt: персона + profile + инъекции плагинов
      // (каждый плагин может добавить свою "память" типа английского словаря)
      let systemPrompt = buildSystemPrompt(opts.persona, opts.language)
      // Memory + plugin инъекции могут содержать факты на любом языке (русское
      // имя в profile.md, английский словарь в English-плагине). Sandwich-prompt:
      // напоминаем Claude перед инжектом и после — отвечать ТОЛЬКО на UI-locale,
      // независимо от языка фактов. Это фиксит code-switching на mixed-context.
      const langName = LANG_NAME[opts.language] ?? opts.language
      const memoryGuard = `\n\n---\nIMPORTANT: The following memory blocks may contain facts in any language (Russian names, English vocabulary, etc.). Use facts as data, but YOUR REPLY MUST BE IN ${langName} ONLY. Do not echo or quote in the source language. Translate names if needed.`
      if (opts.profileMd && opts.profileMd.trim()) {
        systemPrompt += memoryGuard
        systemPrompt += '\n\n[MEMORY: profile.md]\n' + opts.profileMd
      }
      for (const plugin of opts.plugins) {
        const injection = plugin.injectSystemContext?.()
        if (injection && injection.trim()) {
          if (!opts.profileMd?.trim()) systemPrompt += memoryGuard
          systemPrompt += '\n\n' + injection
        }
      }
      // Финальный reminder в самом конце system prompt — последнее что Claude
      // прочитает перед user message. Помогает на длинных prompt'ах.
      systemPrompt += `\n\n---\nFINAL REMINDER: Reply in ${langName}. Never code-switch.`

      // Multi-step loop: пока Claude зовёт tools — выполняем локально, продолжаем.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conversationMessages: any[] = [...next]
      let stepCount = 0
      const MAX_STEPS = 5

      while (stepCount++ < MAX_STEPS) {
        const res = await aiFetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: conversationMessages,
            system: systemPrompt,
            provider: opts.model.provider,
            model: opts.model.model,
            tools: needsTools,
          }),
          signal: abortController.signal,
        })
        if (!res.ok || !res.body) throw new Error(await res.text())

        // С tools — SSE (UIMessageStream), без tools — plain text stream
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let lineBuf = ''
        let stepText = ''
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stepToolCalls: any[] = []

        const onText = (delta: string) => {
          stepText += delta
          full += delta
          streamBuf += delta
          setStreaming(full)
          ;({ remainder: streamBuf, emotion: streamEmotion } = extractSentences(
            streamBuf,
            streamEmotion,
            enqueueSentence,
          ))
        }

        while (true) {
          if (interruptedRef.current) { try { reader.cancel() } catch {}; break }
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })

          if (!needsTools) {
            onText(chunk)
            continue
          }

          lineBuf += chunk
          const lines = lineBuf.split('\n')
          lineBuf = lines.pop() ?? ''
          for (const rawLine of lines) {
            const line = rawLine.trim()
            if (!line || !line.startsWith('data:')) continue
            const payload = line.slice(5).trim()
            if (!payload || payload === '[DONE]') continue
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let evt: any
            try { evt = JSON.parse(payload) } catch { continue }
            if (evt.type === 'text-delta' && typeof evt.delta === 'string') {
              onText(evt.delta)
            } else if (evt.type === 'tool-input-available') {
              stepToolCalls.push({
                toolCallId: evt.toolCallId,
                toolName: evt.toolName,
                args: evt.input,
              })
            }
          }
        }

        if (stepToolCalls.length === 0) break

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const assistantContent: any[] = []
        if (stepText) assistantContent.push({ type: 'text', text: stepText })
        for (const tc of stepToolCalls) {
          assistantContent.push({
            type: 'tool-call',
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            input: tc.args,
          })
        }
        conversationMessages.push({ role: 'assistant', content: assistantContent })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolResults: any[] = []
        for (const tc of stepToolCalls) {
          const { output } = await executeMemoryTool(tc, opts.onProfileUpdate)
          toolResults.push({
            type: 'tool-result',
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            output,
          })
        }
        conversationMessages.push({ role: 'tool', content: toolResults })
      }

      if (!interruptedRef.current && streamBuf.trim()) {
        const clean = streamBuf.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim()
        enqueueSentence(clean, streamEmotion)
      }

      // Даже при прерывании сохраняем то что успел сказать Клод — чтобы в истории
      // осталась частичная реплика и Кика помнила что начинала говорить.
      if (full) setMessages([...next, { role: 'assistant', content: full }])
      setStreaming('')

      if (!interruptedRef.current) {
        // Плагины обрабатывают финальный ответ (теги, извлечение слов и т.п.)
        for (const plugin of opts.plugins) {
          try {
            plugin.onChatResponse?.(full)
          } catch (err) {
            console.error(`[chat] plugin ${plugin.id} onChatResponse failed:`, err)
          }
        }
      }

      streamDone = true
      if (playbackPromise) await playbackPromise
    } catch (e) {
      // AbortError от interrupt() — не ошибка, просто выходим молча.
      if (e instanceof DOMException && e.name === 'AbortError') {
        streamDone = true
      } else if (interruptedRef.current) {
        streamDone = true
      } else {
        setError(e instanceof Error ? e.message : String(e))
        streamDone = true
      }
    } finally {
      setLoading(false)
      if (abortRef.current === abortController) abortRef.current = null
      if (currentQueueRef.current === audioQueue) currentQueueRef.current = null
    }

    return full
  }

  return {
    messages,
    setMessages,
    streaming,
    loading,
    speaking,
    error,
    lastTimings,
    send,
    interrupt,
  }
}
