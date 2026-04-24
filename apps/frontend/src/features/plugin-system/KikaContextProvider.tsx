'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { KikaContext } from './types'

const Ctx = createContext<KikaContext | null>(null)

export function KikaContextProvider({ value, children }: { value: KikaContext; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// Плагины и хосты получают core API через этот хук
export function useKikaContext(): KikaContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useKikaContext must be used inside KikaContextProvider')
  return ctx
}
