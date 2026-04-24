// Парс/сериализация словаря английских слов в/из markdown.
// Файл kika-memory/english/vocabulary.md — человекочитаемый лог изучения.

export type EnglishItem = {
  ts: number
  word: string
  correct: number      // сколько раз угадал
  wrong: number        // сколько раз ошибся
  streak: number       // текущая серия правильных
  lastSeen: number     // timestamp последнего показа
  hard?: boolean       // юзер прямо сказал "сложно"
}

export type EnglishStatus = 'new' | 'learning' | 'known'

export const ENGLISH_MD_PATH = 'english/vocabulary.md'

export function statusOf(it: EnglishItem): EnglishStatus {
  if (it.hard) return 'learning'
  if (it.streak >= 3 && it.correct >= 3) return 'known'
  if (it.correct + it.wrong === 0) return 'new'
  return 'learning'
}

export function formatEnglishDate(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function serializeEnglishToMd(items: EnglishItem[]): string {
  const known = items.filter((it) => statusOf(it) === 'known').length
  const learning = items.filter((it) => statusOf(it) === 'learning').length
  const newish = items.filter((it) => statusOf(it) === 'new').length

  const lines: string[] = []
  lines.push('# English Vocabulary')
  lines.push('')
  lines.push('> Автоматически управляется Yukai. Ты можешь редактировать этот файл вручную — она подхватит изменения.')
  lines.push('')
  lines.push(`**Всего: ${items.length}** · ✅ ${known} знаю · 📚 ${learning} учу · 🆕 ${newish} новых`)
  lines.push('')
  lines.push('## Слова')
  lines.push('')
  const sorted = [...items].sort((a, b) => (b.lastSeen ?? b.ts) - (a.lastSeen ?? a.ts))
  for (const it of sorted) {
    const s = statusOf(it)
    const check = s === 'known' ? 'x' : s === 'new' ? '~' : ' '
    const stats = it.correct + it.wrong > 0
      ? `(${it.correct}✓/${it.wrong}✗/streak:${it.streak})`
      : ''
    const markers: string[] = []
    if (it.hard) markers.push('HARD')
    if (s === 'new') markers.push('new')
    const markerStr = markers.length ? ' ' + markers.join(' ') : ''
    const date = formatEnglishDate(it.lastSeen ?? it.ts)
    const parts = ['-', `[${check}]`, it.word]
    if (stats) parts.push(stats)
    if (markerStr) parts.push(markerStr.trim())
    parts.push(`— ${date}`)
    lines.push(parts.join(' '))
  }
  lines.push('')
  return lines.join('\n')
}

const ENGLISH_LINE_RE = /^-\s*\[([x~\s])\]\s+(\S+)(?:\s+\((\d+)✓\/(\d+)✗\/streak:(\d+)\))?(?:\s+(HARD)(?=\s))?(?:\s+(new)(?=\s))?(?:\s*—\s*([\d:.\s]+))?\s*$/

export function parseEnglishMd(md: string): EnglishItem[] {
  const items: EnglishItem[] = []
  const seen = new Set<string>()
  for (const rawLine of md.split('\n')) {
    const line = rawLine.trimEnd()
    const m = line.match(ENGLISH_LINE_RE)
    if (!m) continue
    const [, , word, correctStr, wrongStr, streakStr, hardFlag, , dateStr] = m
    const w = word.toLowerCase().trim()
    if (!w || seen.has(w)) continue
    seen.add(w)
    const correct = correctStr ? parseInt(correctStr, 10) : 0
    const wrong = wrongStr ? parseInt(wrongStr, 10) : 0
    const streak = streakStr ? parseInt(streakStr, 10) : 0
    let ts = Date.now()
    if (dateStr) {
      const parts = dateStr.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/)
      if (parts) {
        const [, dd, mm, yyyy, hh = '12', min = '00'] = parts
        ts = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00`).getTime()
      }
    }
    items.push({
      ts,
      word: w,
      correct,
      wrong,
      streak,
      lastSeen: ts,
      hard: !!hardFlag,
    })
  }
  return items
}
