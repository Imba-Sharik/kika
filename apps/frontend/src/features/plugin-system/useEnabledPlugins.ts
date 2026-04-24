'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'kika:plugins:enabled'

// Хранит список ID отключенных плагинов (по умолчанию все включены).
// Используем "disabled-set" а не "enabled-set" чтобы новые плагины
// автоматически появлялись включёнными без миграции.
function loadDisabled(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function saveDisabled(disabled: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...disabled]))
  } catch {}
}

export function useEnabledPlugins() {
  const [disabled, setDisabled] = useState<Set<string>>(() => loadDisabled())

  function setEnabled(id: string, enabled: boolean) {
    setDisabled((prev) => {
      const next = new Set(prev)
      if (enabled) next.delete(id)
      else next.add(id)
      saveDisabled(next)
      return next
    })
  }

  function isEnabled(id: string): boolean {
    return !disabled.has(id)
  }

  // Переотправлять событие на кросс-окно, если нужно будет (пока нет)
  useEffect(() => {}, [])

  return { isEnabled, setEnabled, disabled }
}
