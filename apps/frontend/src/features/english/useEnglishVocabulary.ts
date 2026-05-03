'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ENGLISH_MD_PATH,
  ENGLISH_CURRICULUM_PATH,
  ENGLISH_PROGRESS_PATH,
  INTERVALS_DAYS,
  PROGRESS_HEADER,
  parseCurriculum,
  parseEnglishMd,
  parseProgressMd,
  progressLogEntry,
  serializeEnglishToMd,
  type CurriculumEntry,
  type EnglishItem,
  type ProgressEntry,
} from './english-md'

// Хук: state словаря + загрузка из vocabulary.md + debounce-запись + curriculum + progress log.
export function useEnglishVocabulary() {
  const [items, setItems] = useState<EnglishItem[]>([])
  const [curriculum, setCurriculum] = useState<CurriculumEntry[]>([])
  const [progress, setProgress] = useState<ProgressEntry[]>([])
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef<EnglishItem[] | null>(null)

  // Сессионный буфер для intervalIdx (применяется при flushSession).
  const sessionRef = useRef<Map<string, number>>(new Map())

  // Сессионная статистика для progress.md (накапливается, обнуляется при flushSession).
  const sessionStatsRef = useRef({ newWords: 0, correct: 0, wrong: 0, reviewed: new Set<string>() })

  // Начальная загрузка vocabulary.md + curriculum.md (опционально)
  useEffect(() => {
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.readMemoryFile) return

      const md = await api.readMemoryFile(ENGLISH_MD_PATH)
      if (md) {
        setItems(parseEnglishMd(md))
      } else {
        // Legacy миграция (если файла нет, но есть старый localStorage)
        try {
          const legacy = localStorage.getItem('kika:english-history')
          if (legacy) {
            const parsed = JSON.parse(legacy) as EnglishItem[]
            const now = Date.now()
            const normalized: EnglishItem[] = parsed.map((it) => ({
              ts: it.ts ?? now,
              word: it.word,
              correct: it.correct ?? 0,
              wrong: it.wrong ?? 0,
              streak: it.streak ?? 0,
              lastSeen: it.lastSeen ?? it.ts ?? now,
              hard: it.hard,
              intervalIdx: 0,
              nextReview: now,
            }))
            setItems(normalized)
            await api.writeMemoryFile?.(ENGLISH_MD_PATH, serializeEnglishToMd(normalized))
            localStorage.removeItem('kika:english-history')
          }
        } catch (err) {
          console.error('[english] migration failed:', err)
        }
      }

      // Curriculum (опционально — если Игорь создал)
      const curr = await api.readMemoryFile(ENGLISH_CURRICULUM_PATH)
      if (curr) {
        setCurriculum(parseCurriculum(curr))
      }

      // Progress (журнал сессий)
      const prog = await api.readMemoryFile(ENGLISH_PROGRESS_PATH)
      if (prog) {
        setProgress(parseProgressMd(prog))
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

  useEffect(() => {
    const onUnload = () => flushNow()
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      flushNow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          // Подтягиваем translation из curriculum, если совпадение есть
          const fromCurr = curriculum.find((c) => c.word === w)
          byWord.set(w, {
            ts: now,
            word: w,
            translation: fromCurr?.translation,
            correct: 0,
            wrong: 0,
            streak: 0,
            lastSeen: now,
            intervalIdx: 0,
            nextReview: now,
          })
          hasNewWord = true
          sessionStatsRef.current.newWords += 1
        }
      }
      const next = [...byWord.values()]
        .sort((a, b) => (b.lastSeen ?? b.ts) - (a.lastSeen ?? a.ts))
        .slice(0, 200)
      persist(next, hasNewWord ? { immediate: true } : undefined)
      return next
    })
  }

  // Все теги: оценочные ([correct/wrong/hard]), управляющие ([reset/easy/skip/delete]),
  // мета ([tr: word=перевод]).
  function applyTags(response: string) {
    const parse = (regex: RegExp, type: string) =>
      [...response.matchAll(regex)].map((m) => ({ type, word: m[1].toLowerCase().trim(), extra: m[2]?.trim() }))

    const all = [
      ...parse(/\[correct:\s*([a-z][a-z\s-]*)\]/gi, 'correct'),
      ...parse(/\[wrong:\s*([a-z][a-z\s-]*)\]/gi, 'wrong'),
      ...parse(/\[hard:\s*([a-z][a-z\s-]*)\]/gi, 'hard'),
      ...parse(/\[reset:\s*([a-z][a-z\s-]*)\]/gi, 'reset'),
      ...parse(/\[easy:\s*([a-z][a-z\s-]*)\]/gi, 'easy'),
      ...parse(/\[skip:\s*([a-z][a-z\s-]*)\]/gi, 'skip'),
      ...parse(/\[delete:\s*([a-z][a-z\s-]*)\]/gi, 'delete'),
      ...parse(/\[tr:\s*([a-z][a-z\s-]*)\s*=\s*([^\]]+)\]/gi, 'tr'),
    ]
    if (all.length === 0) return

    setItems((prev) => {
      const byWord = new Map(prev.map((it) => [it.word.toLowerCase(), it]))
      const now = Date.now()
      let immediate = false
      const stats = sessionStatsRef.current

      for (const { type, word, extra } of all) {
        if (type === 'delete') {
          if (byWord.delete(word)) {
            sessionRef.current.delete(word)
            immediate = true
          }
          continue
        }

        const existing = byWord.get(word)
        if (!existing) continue

        if (type === 'correct') {
          byWord.set(word, { ...existing, correct: existing.correct + 1, streak: existing.streak + 1 })
          const curIdx = sessionRef.current.get(word) ?? existing.intervalIdx
          sessionRef.current.set(word, Math.min(curIdx + 1, 6))
          stats.correct += 1
          stats.reviewed.add(word)
        } else if (type === 'wrong') {
          byWord.set(word, { ...existing, wrong: existing.wrong + 1, streak: 0 })
          sessionRef.current.set(word, 0)
          stats.wrong += 1
          stats.reviewed.add(word)
        } else if (type === 'hard') {
          byWord.set(word, { ...existing, hard: true, streak: 0 })
          sessionRef.current.set(word, 0)
          stats.reviewed.add(word)
        } else if (type === 'reset') {
          byWord.set(word, { ...existing, intervalIdx: 0, nextReview: now, streak: 0, hard: false })
          sessionRef.current.delete(word)
          immediate = true
        } else if (type === 'easy') {
          byWord.set(word, { ...existing, intervalIdx: 4, nextReview: now + 30 * 86_400_000, hard: false })
          sessionRef.current.delete(word)
          immediate = true
        } else if (type === 'skip') {
          byWord.set(word, {
            ...existing,
            intervalIdx: 6,
            nextReview: now + 60 * 86_400_000,
            correct: Math.max(existing.correct, 3),
            streak: Math.max(existing.streak, 3),
            hard: false,
          })
          sessionRef.current.delete(word)
          immediate = true
        } else if (type === 'tr' && extra) {
          // Установить/обновить перевод (только если новый или явно изменился)
          if (existing.translation !== extra) {
            byWord.set(word, { ...existing, translation: extra })
            immediate = true // перевод важно сохранить сразу
          }
        }
      }
      const next = [...byWord.values()].sort((a, b) => (b.lastSeen ?? b.ts) - (a.lastSeen ?? a.ts))
      persist(next, immediate ? { immediate: true } : undefined)
      return next
    })
  }

  // При закрытии English-панели:
  // 1. Применить sessionRef к items (interval/nextReview)
  // 2. Дописать строку в progress.md если в сессии было хоть что-то
  // 3. Обнулить session stats
  function flushSession() {
    const buf = new Map(sessionRef.current)
    sessionRef.current.clear()
    const stats = sessionStatsRef.current
    const hasActivity = buf.size > 0 || stats.newWords > 0 || stats.correct > 0 || stats.wrong > 0

    if (buf.size > 0) {
      const now = Date.now()
      setItems((prev) => {
        const byWord = new Map(prev.map((it) => [it.word, it]))
        for (const [word, newIdx] of buf) {
          const existing = byWord.get(word)
          if (!existing) continue
          const days = newIdx < INTERVALS_DAYS.length ? INTERVALS_DAYS[newIdx] : 60
          const nextReview = now + days * 86_400_000
          byWord.set(word, { ...existing, intervalIdx: newIdx, nextReview })
        }
        const next = [...byWord.values()].sort((a, b) => (b.lastSeen ?? b.ts) - (a.lastSeen ?? a.ts))
        persist(next, { immediate: true })
        return next
      })
    }

    if (hasActivity) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      const entry = progressLogEntry({
        newWords: stats.newWords,
        reviewed: stats.reviewed.size,
        correct: stats.correct,
        wrong: stats.wrong,
      })
      ;(async () => {
        const existing = await api?.readMemoryFile?.(ENGLISH_PROGRESS_PATH)
        if (existing) {
          await api?.appendMemoryFile?.(ENGLISH_PROGRESS_PATH, entry + '\n')
        } else {
          await api?.writeMemoryFile?.(ENGLISH_PROGRESS_PATH, PROGRESS_HEADER + entry + '\n')
        }
        // Перечитать progress в state — UI обновится
        const fresh = await api?.readMemoryFile?.(ENGLISH_PROGRESS_PATH)
        if (fresh) setProgress(parseProgressMd(fresh))
      })()
    }

    sessionStatsRef.current = { newWords: 0, correct: 0, wrong: 0, reviewed: new Set() }
  }

  return {
    items,
    curriculum,
    progress,
    addWords,
    applyTags,
    flushSession,
  }
}
