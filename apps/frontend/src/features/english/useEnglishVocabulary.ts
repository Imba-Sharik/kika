'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ENGLISH_MD_PATH,
  parseEnglishMd,
  serializeEnglishToMd,
  statusOf,
  type EnglishItem,
} from './english-md'

// Хук: state словаря + загрузка из vocabulary.md + debounce-запись.
// Вызывается один раз из overlay. Экспортирует все action-хелперы.
export function useEnglishVocabulary() {
  const [items, setItems] = useState<EnglishItem[]>([])
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef<EnglishItem[] | null>(null)

  // Начальная загрузка + миграция из localStorage
  useEffect(() => {
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.readMemoryFile) return
      const md = await api.readMemoryFile(ENGLISH_MD_PATH)
      if (md) {
        setItems(parseEnglishMd(md))
        return
      }
      // Legacy миграция (если файла нет, но есть старый localStorage)
      try {
        const legacy = localStorage.getItem('kika:english-history')
        if (legacy) {
          const parsed = JSON.parse(legacy) as EnglishItem[]
          const normalized: EnglishItem[] = parsed.map((it) => ({
            ts: it.ts ?? Date.now(),
            word: it.word,
            correct: it.correct ?? 0,
            wrong: it.wrong ?? 0,
            streak: it.streak ?? 0,
            lastSeen: it.lastSeen ?? it.ts ?? Date.now(),
            hard: it.hard,
          }))
          setItems(normalized)
          await api.writeMemoryFile?.(ENGLISH_MD_PATH, serializeEnglishToMd(normalized))
          localStorage.removeItem('kika:english-history')
        }
      } catch (err) {
        console.error('[english] migration failed:', err)
      }
    })()
  }, [])

  function flushNow() {
    if (!dirtyRef.current) return
    if (writeTimerRef.current) {
      clearTimeout(writeTimerRef.current)
      writeTimerRef.current = null
    }
    const data = dirtyRef.current
    dirtyRef.current = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI
    api?.writeMemoryFile?.(ENGLISH_MD_PATH, serializeEnglishToMd(data))
  }

  function persist(next: EnglishItem[], options?: { immediate?: boolean }) {
    dirtyRef.current = next
    if (options?.immediate) {
      flushNow()
      return
    }
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current)
    writeTimerRef.current = setTimeout(flushNow, 30_000)
  }

  // Force-save при закрытии окна
  useEffect(() => {
    const onUnload = () => flushNow()
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      flushNow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Добавить слова (которые Kika показала) — обновить lastSeen у повторов, создать новые
  function addWords(words: string[]) {
    if (words.length === 0) return
    setItems((prev) => {
      const byWord = new Map(prev.map((it) => [it.word.toLowerCase(), it]))
      const now = Date.now()
      let hasNewWord = false
      for (const rawW of words) {
        const w = rawW.toLowerCase().trim()
        if (!w) continue
        const existing = byWord.get(w)
        if (existing) {
          byWord.set(w, { ...existing, lastSeen: now })
        } else {
          byWord.set(w, { ts: now, word: w, correct: 0, wrong: 0, streak: 0, lastSeen: now })
          hasNewWord = true
        }
      }
      const next = [...byWord.values()]
        .sort((a, b) => (b.lastSeen ?? b.ts) - (a.lastSeen ?? a.ts))
        .slice(0, 100)
      persist(next, hasNewWord ? { immediate: true } : undefined)
      return next
    })
  }

  // Обработать теги [correct: word] / [wrong: word] / [hard: word] из ответа Kika
  function applyTags(response: string) {
    const matches = [
      ...response.matchAll(/\[correct:\s*([a-z][a-z\s-]*)\]/gi),
    ].map((m) => ({ type: 'correct' as const, word: m[1].toLowerCase().trim() }))
    const wrongs = [
      ...response.matchAll(/\[wrong:\s*([a-z][a-z\s-]*)\]/gi),
    ].map((m) => ({ type: 'wrong' as const, word: m[1].toLowerCase().trim() }))
    const hards = [
      ...response.matchAll(/\[hard:\s*([a-z][a-z\s-]*)\]/gi),
    ].map((m) => ({ type: 'hard' as const, word: m[1].toLowerCase().trim() }))
    const all = [...matches, ...wrongs, ...hards]
    if (all.length === 0) return
    setItems((prev) => {
      const byWord = new Map(prev.map((it) => [it.word.toLowerCase(), it]))
      let milestone = false
      for (const { type, word } of all) {
        const existing = byWord.get(word)
        if (!existing) continue
        const oldStatus = statusOf(existing)
        let updated = existing
        if (type === 'correct') {
          updated = { ...existing, correct: existing.correct + 1, streak: existing.streak + 1 }
        } else if (type === 'wrong') {
          updated = { ...existing, wrong: existing.wrong + 1, streak: 0 }
        } else if (type === 'hard') {
          updated = { ...existing, hard: true, streak: 0 }
        }
        byWord.set(word, updated)
        if (statusOf(updated) !== oldStatus || type === 'hard') milestone = true
      }
      const next = [...byWord.values()].sort((a, b) => (b.lastSeen ?? b.ts) - (a.lastSeen ?? a.ts))
      persist(next, milestone ? { immediate: true } : undefined)
      return next
    })
  }

  return {
    items,
    addWords,
    applyTags,
  }
}
