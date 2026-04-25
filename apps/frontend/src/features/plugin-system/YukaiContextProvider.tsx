'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { YukaiContext } from './types'

const Ctx = createContext<YukaiContext | null>(null)

export function YukaiContextProvider({ value, children }: { value: YukaiContext; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// Плагины и хосты получают core API через этот хук
export function useYukaiContext(): YukaiContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useYukaiContext must be used inside YukaiContextProvider')
  return ctx
}
