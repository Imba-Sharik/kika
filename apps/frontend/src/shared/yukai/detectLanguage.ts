// Простой детектор языка по преобладающему алфавиту.
// Используется для voice-flip в TTS: когда Yukai говорит на английском в English-сессии,
// нужен английский голос; когда переключается на русский lifeline — русский голос.

export type DetectedLang = 'ru' | 'en' | 'ja' | 'ko' | 'zh' | 'mixed' | 'other'

const RANGES: Array<{ lang: Exclude<DetectedLang, 'mixed' | 'other'>; re: RegExp }> = [
  { lang: 'ja', re: /[぀-ゟ゠-ヿ]/g }, // hiragana + katakana
  { lang: 'ko', re: /[가-힯]/g },              // hangul
  { lang: 'zh', re: /[一-鿿]/g },              // CJK
  { lang: 'ru', re: /[а-яА-ЯёЁ]/g },                   // cyrillic
  { lang: 'en', re: /[a-zA-Z]/g },                     // latin
]

export function detectLanguage(text: string): DetectedLang {
  // Убираем теги [emotion], [img: word], [tr: word=tr] и markdown шум
  const cleaned = text.replace(/\[[^\]]*\]/g, '').replace(/[*_`~]/g, '')
  if (!cleaned.trim()) return 'other'

  const counts: Record<string, number> = {}
  let total = 0
  for (const { lang, re } of RANGES) {
    const n = (cleaned.match(re) || []).length
    counts[lang] = n
    total += n
  }
  if (total === 0) return 'other'

  // Сортируем по количеству, берём топ-2
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const [topLang, topCount] = sorted[0]
  const secondCount = sorted[1]?.[1] ?? 0

  // Если топ-язык занимает >70% букв — он. Иначе mixed.
  const ratio = topCount / total
  if (ratio > 0.7) return topLang as DetectedLang
  // Близко к 50/50 → mixed (например русский с английскими словами)
  if (topCount > 0 && secondCount > 0 && secondCount / topCount > 0.4) return 'mixed'
  return topLang as DetectedLang
}
