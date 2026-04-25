'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import type { YukaiPlugin, YukaiContext } from '@/features/plugin-system/types'
import { useMusicRecognition, type MusicItem } from './useMusicRecognition'
import { MusicPanel } from './MusicPanel'

type MusicPluginState = {
  listening: boolean
  recognizing: boolean
  history: MusicItem[]
  start: () => Promise<void>
  stop: () => void
}

const MusicCtx = createContext<MusicPluginState | null>(null)
function useMusicPlugin(): MusicPluginState {
  const v = useContext(MusicCtx)
  if (!v) throw new Error('MusicPlugin not mounted')
  return v
}

function MusicProvider({ ctx, children }: { ctx: YukaiContext; children: ReactNode }) {
  const music = useMusicRecognition({
    onResult: (text) => void ctx.chat.send(text),
    onEmotion: (e) => ctx.ui.setEmotion(e),
  })

  // Глобальный хоткей Alt+` — приходит через IPC из main.js (uIOhook).
  // Core уже роутит события — здесь мы просто слушаем через electronAPI.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI
    if (!api) return
    const unsubs: Array<(() => void) | undefined> = []
    if (api.onMusicStart) unsubs.push(api.onMusicStart(() => void music.start()))
    if (api.onMusicStop) unsubs.push(api.onMusicStop(() => music.stop()))
    return () => { unsubs.forEach((fn) => { if (typeof fn === 'function') fn() }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <MusicCtx.Provider value={music}>{children}</MusicCtx.Provider>
}

function MusicPanelSlot({ ctx }: { ctx: YukaiContext }) {
  const music = useMusicPlugin()
  return <MusicPanel history={music.history} onClose={() => ctx.ui.closePanel()} language={ctx.language} />
}

function MusicStatusBadge() {
  const music = useMusicPlugin()
  if (!music.listening && !music.recognizing) return null
  return (
    <div
      style={{
        position: 'absolute',
        top: 32,
        right: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: music.listening ? 'rgba(59,130,246,0.95)' : 'rgba(168,85,247,0.95)',
        color: 'white',
        fontSize: 10,
        fontWeight: 600,
        padding: '4px 10px',
        borderRadius: 12,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}
    >
      <span style={{ fontSize: 12 }}>♪</span>
      {music.listening ? 'LISTENING' : 'RECOGNIZING'}
    </div>
  )
}

export const musicPlugin: YukaiPlugin = {
  id: 'music',
  name: 'Распознавание песен',
  icon: '🎵',
  description: 'Shazam-style: зажми Left Alt + ` чтобы Kika узнала что играет',
  permissions: ['desktop-audio', 'chat'],
  Provider: MusicProvider,
  slots: {
    radial: {
      angle: -45,
      title: 'История песен',
      onClick: (ctx) => ctx.ui.openPanel('music'),
    },
    panel: MusicPanelSlot,
    characterOverlay: MusicStatusBadge,
  },
}
