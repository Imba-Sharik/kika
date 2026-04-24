export type TtsProvider = 'elevenlabs' | 'fish'

export type Voice = {
  id: string
  label: string
  provider: TtsProvider
  voiceId: string
}

export const BUILTIN_VOICES: Voice[] = [
  {
    id: 'eleven-kika',
    label: 'ElevenLabs — Yukai',
    provider: 'elevenlabs',
    voiceId: 'YQ8Df5FlfEfMCfGNZHsN',
  },
  {
    id: 'fish-voice-1',
    label: 'Fish — Voice 1 (Mita)',
    provider: 'fish',
    voiceId: '6dc11f3f67a543f6ad4537a4a347e224',
  },
  {
    id: 'fish-voice-2',
    label: 'Fish — Voice 2',
    provider: 'fish',
    voiceId: '23dc81dab27e4cea8cc2cfe3104747fd',
  },
  {
    id: 'fish-voice-3',
    label: 'Fish — Voice 3',
    provider: 'fish',
    voiceId: '71bf4cb71cd44df6aa603d51db8f92ff',
  },
  {
    id: 'fish-voice-4',
    label: 'Fish — 女の子',
    provider: 'fish',
    voiceId: 'bf5634e34ee5489991fe687ad0d202c5',
  },
]

export const DEFAULT_VOICE_ID = 'fish-voice-1'

const STORAGE_KEY = 'kika:user-voices:v1'

export function loadUserVoices(): Voice[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Voice[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveUserVoices(voices: Voice[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(voices))
}

export function getAllVoices(userVoices: Voice[]): Voice[] {
  return [...BUILTIN_VOICES, ...userVoices]
}

export function findVoice(id: string, userVoices: Voice[]): Voice {
  return getAllVoices(userVoices).find((v) => v.id === id) ?? BUILTIN_VOICES[0]
}
