import { YUKAI_DEFAULT_PERSONA } from './persona'

export type Character = {
  id: string
  name: string
  persona: string
  voiceId: string
}

export const BUILTIN_CHARACTERS: Character[] = [
  {
    id: 'yukai-default',
    name: 'Юкай',
    persona: YUKAI_DEFAULT_PERSONA,
    voiceId: 'eleven-kika',
  },
]

export const DEFAULT_CHARACTER_ID = BUILTIN_CHARACTERS[0].id

const STORAGE_KEY = 'kika:user-characters:v1'

export function loadUserCharacters(): Character[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Character[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveUserCharacters(list: Character[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export function getAllCharacters(userChars: Character[]): Character[] {
  return [...BUILTIN_CHARACTERS, ...userChars]
}

export function findCharacter(id: string, userChars: Character[]): Character {
  return (
    getAllCharacters(userChars).find((c) => c.id === id) ?? BUILTIN_CHARACTERS[0]
  )
}
