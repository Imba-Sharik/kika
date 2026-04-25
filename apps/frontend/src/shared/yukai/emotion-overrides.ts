import type { Emotion } from './persona'

const STORAGE_KEY = 'kika:emotion-overrides:v1'

export type EmotionOverrides = Record<string, string>

export function loadEmotionOverrides(): EmotionOverrides {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as EmotionOverrides) : {}
  } catch {
    return {}
  }
}

export function saveEmotionOverrides(overrides: EmotionOverrides): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}

export function resetEmotionOverride(emotion: string, overrides: EmotionOverrides): EmotionOverrides {
  const next = { ...overrides }
  delete next[emotion]
  return next
}
