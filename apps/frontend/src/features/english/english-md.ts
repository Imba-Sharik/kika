// Парс/сериализация словаря английских слов в/из markdown.
// Файл kika-memory/english/vocabulary.md — таблица как у english-agent, легко править вручную.

export const INTERVALS_DAYS = [1, 3, 7, 14, 30, 60]
export const KNOWN_IDX = 6 // выпуск из learning

export type EnglishItem = {
  ts: number
  word: string
  translation?: string  // русский перевод (Claude устанавливает через [tr: word=перевод])
  correct: number
  wrong: number
  streak: number
  lastSeen: number
  hard?: boolean
  intervalIdx: number   // 0-5 = INTERVALS_DAYS, 6 = known
  nextReview: number
}

export type EnglishStatus = 'new' | 'learning' | 'known'

export const ENGLISH_MD_PATH = 'english/vocabulary.md'
export const ENGLISH_CURRICULUM_PATH = 'english/curriculum.md'
export const ENGLISH_NOTES_PATH = 'english/notes.md'
export const ENGLISH_PROGRESS_PATH = 'english/progress.md'

export function statusOf(it: EnglishItem): EnglishStatus {
  if (it.correct + it.wrong === 0) return 'new'
  if (!it.hard && it.intervalIdx >= KNOWN_IDX) return 'known'
  return 'learning'
}

export function intervalLabel(it: EnglishItem): string {
  const s = statusOf(it)
  if (s === 'new') return '-'
  if (s === 'known') return 'done'
  return `${INTERVALS_DAYS[Math.min(it.intervalIdx, INTERVALS_DAYS.length - 1)]}d`
}

function fmtDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10) // YYYY-MM-DD
}

function progressCell(it: EnglishItem): string {
  if (it.correct + it.wrong === 0) return 'new'
  const base = `${it.correct}✓/${it.wrong}✗/s:${it.streak}`
  return it.hard ? `${base} HARD` : base
}

export function serializeEnglishToMd(items: EnglishItem[]): string {
  const known = items.filter((it) => statusOf(it) === 'known').length
  const learning = items.filter((it) => statusOf(it) === 'learning').length
  const newish = items.filter((it) => statusOf(it) === 'new').length

  const lines: string[] = []
  lines.push('# English Vocabulary')
  lines.push('')
  lines.push('> Автоматически управляется Yukai. Можешь редактировать таблицу вручную — изменения подхватятся.')
  lines.push('')
  lines.push(`**Всего: ${items.length}** · ✅ ${known} знаю · 📚 ${learning} учу · 🆕 ${newish} новых`)
  lines.push('')
  lines.push('## Словарь')
  lines.push('')
  lines.push('| word | translation | interval | next_review | progress | last_seen |')
  lines.push('|------|-------------|----------|-------------|----------|-----------|')

  const sorted = [...items].sort((a, b) => (b.lastSeen ?? b.ts) - (a.lastSeen ?? a.ts))
  for (const it of sorted) {
    const s = statusOf(it)
    const interval = intervalLabel(it)
    const nextRev = s === 'new' || s === 'known' ? '-' : fmtDate(it.nextReview)
    const tr = it.translation || '-'
    lines.push(`| ${it.word} | ${tr} | ${interval} | ${nextRev} | ${progressCell(it)} | ${fmtDate(it.lastSeen ?? it.ts)} |`)
  }
  lines.push('')
  return lines.join('\n')
}

// Парс таблицы: ищем строки с 6 `|`-разделёнными колонками, пропускаем header/separator.
export function parseEnglishMd(md: string): EnglishItem[] {
  const items: EnglishItem[] = []
  const seen = new Set<string>()
  const now = Date.now()

  for (const rawLine of md.split('\n')) {
    const line = rawLine.trim()
    if (!line.startsWith('|')) continue
    // Separator |---|---|...
    if (/^\|[\s\-:|]+\|$/.test(line)) continue

    const cols = line.split('|').slice(1, -1).map((s) => s.trim())
    if (cols.length !== 6) continue

    const [word, translationRaw, intervalStr, nextReviewStr, progressStr, lastSeenStr] = cols
    const w = word.toLowerCase().trim()
    if (!w || w === 'word' || seen.has(w)) continue
    seen.add(w)

    const translation = translationRaw && translationRaw !== '-' ? translationRaw : undefined

    // Парсим progress: "3✓/1✗/s:2" или "3✓/1✗/s:2 HARD" или "new"
    let correct = 0, wrong = 0, streak = 0, hard = false
    if (progressStr && progressStr !== 'new') {
      const m = progressStr.match(/(\d+)✓\/(\d+)✗\/s:(\d+)/)
      if (m) {
        correct = parseInt(m[1], 10)
        wrong = parseInt(m[2], 10)
        streak = parseInt(m[3], 10)
      }
      if (/HARD/i.test(progressStr)) hard = true
    }

    // Парсим interval: "1d" .. "60d" .. "done" .. "-"
    let intervalIdx = 0
    if (intervalStr === 'done') {
      intervalIdx = KNOWN_IDX
    } else {
      const m = intervalStr.match(/^(\d+)d$/)
      if (m) {
        const days = parseInt(m[1], 10)
        const idx = INTERVALS_DAYS.indexOf(days)
        intervalIdx = idx >= 0 ? idx : 0
      }
    }

    // Парсим next_review: "YYYY-MM-DD" или "-"
    let nextReview = now
    if (nextReviewStr && nextReviewStr !== '-') {
      const t = new Date(nextReviewStr).getTime()
      if (!Number.isNaN(t)) nextReview = t
    }

    // Парсим last_seen: "YYYY-MM-DD"
    let ts = now
    if (lastSeenStr) {
      const t = new Date(lastSeenStr).getTime()
      if (!Number.isNaN(t)) ts = t
    }

    items.push({
      ts,
      word: w,
      translation,
      correct,
      wrong,
      streak,
      lastSeen: ts,
      hard,
      intervalIdx,
      nextReview,
    })
  }

  // Backward-compat: если новый формат не нашёл записей, пробуем старый (list-based)
  if (items.length === 0) {
    return parseLegacyEnglishMd(md)
  }
  return items
}

// Старый формат: "- [x] word (3✓/1✗/streak:2) @7d 2026-05-10 — 03.05.2026 14:30"
const LEGACY_RE = /^-\s*\[([x~\s])\]\s+(\S+)(?:\s+\((\d+)✓\/(\d+)✗\/streak:(\d+)\))?(?:\s+@(\d+)d\s+(\d{4}-\d{2}-\d{2}))?(?:\s+(HARD))?(?:\s+(new))?(?:\s*—\s*([\d:.\s]+))?\s*$/

function parseLegacyEnglishMd(md: string): EnglishItem[] {
  const items: EnglishItem[] = []
  const seen = new Set<string>()
  const now = Date.now()
  for (const rawLine of md.split('\n')) {
    const m = rawLine.trimEnd().match(LEGACY_RE)
    if (!m) continue
    const [, check, word, correctStr, wrongStr, streakStr, intervalDaysStr, nextReviewDateStr, hardFlag] = m
    const w = word.toLowerCase().trim()
    if (!w || seen.has(w)) continue
    seen.add(w)
    const correct = correctStr ? parseInt(correctStr, 10) : 0
    const wrong = wrongStr ? parseInt(wrongStr, 10) : 0
    const streak = streakStr ? parseInt(streakStr, 10) : 0
    let intervalIdx: number
    let nextReview: number
    if (intervalDaysStr && nextReviewDateStr) {
      intervalIdx = INTERVALS_DAYS.indexOf(parseInt(intervalDaysStr, 10))
      if (intervalIdx === -1) intervalIdx = 0
      nextReview = new Date(nextReviewDateStr).getTime()
    } else if (check === 'x') {
      intervalIdx = KNOWN_IDX
      nextReview = now + 60 * 86_400_000
    } else if (check === ' ') {
      intervalIdx = correct > 0 ? Math.min(correct - 1, 5) : 0
      nextReview = now
    } else {
      intervalIdx = 0
      nextReview = now
    }
    items.push({
      ts: now, word: w, correct, wrong, streak, lastSeen: now,
      hard: !!hardFlag, intervalIdx, nextReview,
    })
  }
  return items
}

// Парс curriculum.md: "- word — перевод" или "| word | перевод |" или просто "- word"
const CURRICULUM_LINE_RE = /^-\s+([a-z][a-z\s-]+?)(?:\s+[—\-]\s+(.+))?$/i

export type CurriculumEntry = { word: string; translation?: string }

export function parseCurriculum(md: string): CurriculumEntry[] {
  const out: CurriculumEntry[] = []
  const seen = new Set<string>()
  for (const rawLine of md.split('\n')) {
    const line = rawLine.trim()
    // Markdown-list: "- word — перевод"
    const lm = line.match(CURRICULUM_LINE_RE)
    if (lm) {
      const w = lm[1].toLowerCase().trim()
      if (!w || seen.has(w)) continue
      seen.add(w)
      out.push({ word: w, translation: lm[2]?.trim() })
      continue
    }
    // Table-row: "| word | перевод |"
    if (line.startsWith('|') && !/^\|[\s\-:|]+\|$/.test(line)) {
      const cols = line.split('|').slice(1, -1).map((s) => s.trim())
      if (cols.length >= 1) {
        const w = cols[0].toLowerCase().trim()
        if (!w || w === 'word' || seen.has(w)) continue
        seen.add(w)
        out.push({ word: w, translation: cols[1] && cols[1] !== '-' ? cols[1] : undefined })
      }
    }
  }
  return out
}

export function progressLogEntry(stats: { newWords: number; reviewed: number; correct: number; wrong: number }): string {
  const date = new Date().toISOString().slice(0, 16).replace('T', ' ')
  return `| ${date} | ${stats.newWords} new | ${stats.reviewed} reviewed | ${stats.correct} correct | ${stats.wrong} wrong |`
}

export const PROGRESS_HEADER = `# English Progress

| date | new_words | reviewed | correct | wrong |
|------|-----------|----------|---------|-------|
`

export type ProgressEntry = {
  date: string // YYYY-MM-DD HH:mm
  newWords: number
  reviewed: number
  correct: number
  wrong: number
}

// Парс progress.md: строки таблицы вида "| 2026-05-03 14:30 | 7 new | 12 reviewed | 10 correct | 2 wrong |"
export function parseProgressMd(md: string): ProgressEntry[] {
  const out: ProgressEntry[] = []
  for (const rawLine of md.split('\n')) {
    const line = rawLine.trim()
    if (!line.startsWith('|')) continue
    if (/^\|[\s\-:|]+\|$/.test(line)) continue
    const cols = line.split('|').slice(1, -1).map((s) => s.trim())
    if (cols.length !== 5) continue
    if (cols[0] === 'date') continue // header
    const num = (s: string) => parseInt(s.match(/\d+/)?.[0] || '0', 10)
    out.push({
      date: cols[0],
      newWords: num(cols[1]),
      reviewed: num(cols[2]),
      correct: num(cols[3]),
      wrong: num(cols[4]),
    })
  }
  return out
}
