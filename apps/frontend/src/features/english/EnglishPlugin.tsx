'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { YukaiPlugin, YukaiContext } from '@/features/plugin-system/types'
import { useEnglishVocabulary } from './useEnglishVocabulary'
import { EnglishPanel } from './EnglishPanel'
import { statusOf, INTERVALS_DAYS, type EnglishItem, type CurriculumEntry, type ProgressEntry } from './english-md'
import { extractMediaRequests } from '@/shared/yukai/persona'

let currentItems: EnglishItem[] = []
let currentCurriculum: CurriculumEntry[] = []
let currentAddWords: ((words: string[]) => void) = () => {}
let currentApplyTags: ((text: string) => void) = () => {}
let currentOpenPanel: (() => void) = () => {}
let currentFlushSession: (() => void) = () => {}

type EnglishPluginState = { items: EnglishItem[]; progress: ProgressEntry[] }

const EngCtx = createContext<EnglishPluginState | null>(null)
function useEngPlugin(): EnglishPluginState {
  const v = useContext(EngCtx)
  if (!v) throw new Error('EnglishPlugin not mounted')
  return v
}

function EnglishProvider({ ctx, children }: { ctx: YukaiContext; children: ReactNode }) {
  const english = useEnglishVocabulary()

  currentItems = english.items
  currentCurriculum = english.curriculum
  currentAddWords = english.addWords
  currentApplyTags = english.applyTags
  currentOpenPanel = () => ctx.ui.openPanel('english')
  currentFlushSession = english.flushSession

  return <EngCtx.Provider value={{ items: english.items, progress: english.progress }}>{children}</EngCtx.Provider>
}

function EnglishPanelSlot({ ctx }: { ctx: YukaiContext }) {
  const eng = useEngPlugin()
  return (
    <EnglishPanel
      items={eng.items}
      progress={eng.progress}
      onClose={() => {
        currentFlushSession()
        ctx.ui.closePanel()
      }}
    />
  )
}

export const englishPlugin: YukaiPlugin = {
  id: 'english',
  name: 'Изучение английского',
  icon: '🔤',
  description: 'Карточки + SRS-трекер с интервалами 1d→60d. Курс через english/curriculum.md.',
  permissions: ['chat', 'memory'],
  Provider: EnglishProvider,
  slots: {
    radial: {
      angle: 45,
      title: 'История английского',
      onClick: (ctx) => ctx.ui.openPanel('english'),
    },
    panel: EnglishPanelSlot,
  },
  injectSystemContext() {
    if (currentItems.length === 0 && currentCurriculum.length === 0) return null

    const now = Date.now()
    const due = currentItems
      .filter((it) => statusOf(it) === 'learning' && it.nextReview <= now)
      .sort((a, b) => a.nextReview - b.nextReview)
    const upcoming = currentItems.filter((it) => statusOf(it) === 'learning' && it.nextReview > now)
    const newWords = currentItems.filter((it) => statusOf(it) === 'new')
    const known = currentItems.filter((it) => statusOf(it) === 'known')

    // Топ-5 проблемных слов (по количеству ошибок)
    const problem = [...currentItems]
      .filter((it) => it.wrong >= 2)
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, 5)

    // Следующие из curriculum (которых нет в items) — приоритет источника новых слов
    const knownWordsSet = new Set(currentItems.map((it) => it.word))
    const curriculumNext = currentCurriculum
      .filter((c) => !knownWordsSet.has(c.word))
      .slice(0, 10)

    const daysDiff = (ts: number) => Math.round((ts - now) / 86_400_000)
    const fmtWord = (it: EnglishItem) => it.translation ? `${it.word}=${it.translation}` : it.word

    const lines: string[] = ['[English learning session]']

    if (due.length > 0) {
      lines.push(`\nDue for review today (${due.length}):`)
      for (const it of due.slice(0, 15)) {
        const daysLate = Math.abs(daysDiff(it.nextReview))
        const interval = it.intervalIdx < INTERVALS_DAYS.length ? `${INTERVALS_DAYS[it.intervalIdx]}d` : '60d'
        const tr = it.translation ? `=${it.translation}` : ''
        lines.push(`- ${it.word}${tr} (${interval}${daysLate > 0 ? `, ${daysLate}d overdue` : ''})`)
      }
    }

    if (problem.length > 0) {
      lines.push(`\nProblem words (high error rate, give extra attention):`)
      for (const it of problem) {
        const tr = it.translation ? `=${it.translation}` : ''
        lines.push(`- ${it.word}${tr} (${it.wrong}✗ vs ${it.correct}✓${it.hard ? ' HARD' : ''})`)
      }
    }

    if (curriculumNext.length > 0) {
      lines.push(`\nNext from curriculum (introduce these as new words, in order):`)
      for (const c of curriculumNext) {
        lines.push(`- ${c.word}${c.translation ? `=${c.translation}` : ''}`)
      }
    } else if (newWords.length > 0) {
      lines.push(`\nNew words available (${newWords.length}): ${newWords.slice(0, 10).map(fmtWord).join(', ')}`)
    }

    if (upcoming.length > 0 && upcoming.length <= 20) {
      lines.push(`\nNot yet due (skip): ${upcoming.map((it) => `${it.word}(in ${daysDiff(it.nextReview)}d)`).join(', ')}`)
    }

    if (known.length > 0) {
      lines.push(`\nKnown — do NOT practice unless user requests блиц-тест: ${known.map((it) => it.word).join(', ')}`)
    }

    lines.push(`
Session methodology (proven SRS approach, follow strictly):
1. Cap session at 15 reviews + max 7 new words. Session lasts 10-20 min.
2. Review "due" words first (most overdue first), then introduce new
3. New words: take from "Next from curriculum" first, then from "available"
4. For each word presentation:
   a. Show: **word** + one example sentence in English (use [img: word] for visual flashcard)
   b. Ask "Что значит это слово?" — DO NOT give translation yet
   c. Wait for user's recall attempt
5. Grading:
   - Correct → [correct: word], brief praise, then ask user to compose their own sentence
   - Wrong/unknown → [wrong: word], give Russian translation, explain briefly, ask for sentence
   - User says hard → [hard: word]
6. NEVER practice "Known" words unless user asks for блиц-тест (rapid review of known words)

Translation tracking:
- When introducing a NEW word, ALWAYS use [tr: word=перевод] tag to record the translation
- This is critical: Yukai needs the translation to verify user answers across sessions
- Format: [tr: decision=решение]

Manual control tags (use ONLY when user explicitly says):
- [reset: word] — "забыл совсем" → restart from 1d
- [easy: word] — "слишком легко" → jump to 30d
- [skip: word] — "уже знаю" → mark as known
- [delete: word] — "убери это слово" → remove from list

Memory tools — use proactively:
- english/notes.md: read at session start (read_memory_file). Contains user-specific patterns: confusions, mnemonics, recurring mistakes. Update via write_memory_file when you spot new patterns.
- english/curriculum.md: optional seed-курс. If user asks for a structured course (e.g. Oxford 3000), help them populate this file.
- english/progress.md: auto-managed by plugin. Don't write here directly.

Tone: friendly, brief, voice-first conversation. No lectures. Praise progress, never scold mistakes.`)

    return lines.join('\n')
  },
  onChatResponse(fullText) {
    const words = extractMediaRequests(fullText)
      .filter((r) => r.type === 'img')
      .map((r) => r.query)
    if (words.length > 0) {
      currentAddWords(words)
      currentOpenPanel()
    }
    currentApplyTags(fullText)
  },
}
