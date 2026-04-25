'use client'

export type Character = {
  id: string
  name: string
  animations: Record<string, string> // trigger → gif/image URL
}

export const BUILTIN_TRIGGERS: { id: string; label: string }[] = [
  { id: 'neutral',    label: 'Нейтрал' },
  { id: 'happy',      label: 'Радость' },
  { id: 'excited',    label: 'Восторг' },
  { id: 'thinking',   label: 'Думает' },
  { id: 'listening',  label: 'Слушает' },
  { id: 'surprised',  label: 'Удивление' },
  { id: 'confused',   label: 'Замешательство' },
  { id: 'sad',        label: 'Грусть' },
  { id: 'angry',      label: 'Злость' },
  { id: 'love',       label: 'Любовь' },
  { id: 'crying',     label: 'Плачет' },
  { id: 'sleeping',   label: 'Спит' },
  { id: 'wink',       label: 'Подмигивает' },
  { id: 'flustered',  label: 'Смущение' },
  { id: 'alert',      label: 'Тревога' },
  // Скрипты
  { id: 'pomodoro_work',  label: 'Помодоро: работа' },
  { id: 'pomodoro_break', label: 'Помодоро: перерыв' },
  { id: 'reminder',       label: 'Напоминание' },
  { id: 'idle',           label: 'Ожидание' },
]

const STORAGE_KEY = 'kika:character:v1'

export function loadCharacter(): Character {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { id: 'default', name: 'Yukai', animations: {} }
}

export function saveCharacter(c: Character) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
}

export function exportCharacter(c: Character) {
  const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${c.name}.character.json`
  a.click()
  URL.revokeObjectURL(url)
}
