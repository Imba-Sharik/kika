const STORAGE_KEY = 'kika:custom-emotions:v1'

export type CustomEmotion = {
  id: string
  label: string
  src: string
}

export function loadCustomEmotions(): CustomEmotion[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CustomEmotion[]) : []
  } catch {
    return []
  }
}

export function saveCustomEmotions(emotions: CustomEmotion[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emotions))
}
