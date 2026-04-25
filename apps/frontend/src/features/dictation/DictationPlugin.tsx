'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { YukaiPlugin, YukaiContext } from '@/features/plugin-system/types'
import { useDictation, type DictationItem } from './useDictation'
import { DictationPanel } from './DictationPanel'

type DictationPluginState = {
  recording: boolean
  transcribing: boolean
  history: DictationItem[]
  // Устанавливается извне (из Settings-секции) — текущее устройство микрофона
  setDeviceId: (id: string) => void
}

const DictCtx = createContext<DictationPluginState | null>(null)
function useDictPlugin(): DictationPluginState {
  const v = useContext(DictCtx)
  if (!v) throw new Error('DictationPlugin not mounted')
  return v
}

// Provider читает выбранный микрофон из localStorage (как и раньше),
// чтобы useDictation сразу шёл на правильное устройство.
const MIC_STORAGE_KEY = 'kika:overlay:micDeviceId'

function DictProvider({ children }: { ctx: YukaiContext; children: ReactNode }) {
  const [deviceId, setDeviceId] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    try { return localStorage.getItem(MIC_STORAGE_KEY) ?? '' } catch { return '' }
  })
  const dict = useDictation({ deviceId })

  // Слушаем смену микрофона через storage event (Settings-панель пишет туда)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === MIC_STORAGE_KEY) setDeviceId(e.newValue ?? '')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // IPC-подписка Right Alt — через ref чтобы не пересоздавать listener
  const dictRef = useRef(dict)
  useEffect(() => { dictRef.current = dict })

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI
    if (!api) return
    const unsubs: Array<(() => void) | undefined> = []
    if (api.onDictationStart) unsubs.push(api.onDictationStart(() => void dictRef.current.start()))
    if (api.onDictationStop) unsubs.push(api.onDictationStop(() => dictRef.current.stop()))
    return () => { unsubs.forEach((fn) => { if (typeof fn === 'function') fn() }) }
  }, [])

  const value: DictationPluginState = {
    ...dict,
    setDeviceId,
  }
  return <DictCtx.Provider value={value}>{children}</DictCtx.Provider>
}

function DictPanelSlot({ ctx }: { ctx: YukaiContext }) {
  const dict = useDictPlugin()
  return <DictationPanel history={dict.history} onClose={() => ctx.ui.closePanel()} />
}

function DictStatusBadge() {
  const dict = useDictPlugin()
  if (!dict.recording && !dict.transcribing) return null
  return (
    <div
      style={{
        position: 'absolute',
        top: 4,
        right: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: dict.recording ? 'rgba(220,38,38,0.95)' : 'rgba(250,204,21,0.95)',
        color: dict.recording ? 'white' : '#422006',
        fontSize: 10,
        fontWeight: 600,
        padding: '4px 10px',
        borderRadius: 12,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dict.recording ? 'white' : '#422006',
          animation: 'pulse 1s infinite',
        }}
      />
      {dict.recording ? 'ЗАПИСЬ' : 'ТРАНСКРИПЦИЯ'}
    </div>
  )
}

export const dictationPlugin: YukaiPlugin = {
  id: 'dictation',
  name: 'Диктовка',
  icon: '⌨️',
  description: 'Zajmи Right Alt и говори — текст распознается и вставится в активное поле',
  permissions: ['mic', 'clipboard', 'keyboard'],
  Provider: DictProvider,
  slots: {
    radial: {
      angle: 90,
      title: 'История диктовки',
      onClick: (ctx) => ctx.ui.openPanel('dictation'),
    },
    panel: DictPanelSlot,
    characterOverlay: DictStatusBadge,
  },
}
