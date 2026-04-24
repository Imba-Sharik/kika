'use client'

import { Fragment, type ReactNode } from 'react'
import type { KikaContext, KikaPlugin } from './types'

// Оборачивает children всеми Provider-компонентами включенных плагинов
// рекурсивно. Каждый Provider получает ctx.
export function PluginProviders({
  plugins,
  ctx,
  children,
}: {
  plugins: KikaPlugin[]
  ctx: KikaContext
  children: ReactNode
}) {
  return plugins.reduceRight<ReactNode>((acc, plugin) => {
    const Provider = plugin.Provider
    if (!Provider) return acc
    return <Provider ctx={ctx}>{acc}</Provider>
  }, children)
}

// Рендерит characterOverlay всех включенных плагинов поверх персонажа
export function CharacterOverlayHost({ plugins, ctx }: { plugins: KikaPlugin[]; ctx: KikaContext }) {
  return (
    <>
      {plugins.map((p) => {
        const C = p.slots?.characterOverlay
        if (!C) return null
        return (
          <Fragment key={p.id}>
            <C ctx={ctx} />
          </Fragment>
        )
      })}
    </>
  )
}

// Рендерит текущую активную панель (по pluginId)
export function PanelHost({
  plugins,
  activeId,
  ctx,
}: {
  plugins: KikaPlugin[]
  activeId: string | null
  ctx: KikaContext
}) {
  if (!activeId) return null
  const plugin = plugins.find((p) => p.id === activeId)
  const C = plugin?.slots?.panel
  if (!C) return null
  return <C ctx={ctx} />
}

// Рендерит секции настроек всех включенных плагинов
export function SettingsPluginsHost({ plugins, ctx }: { plugins: KikaPlugin[]; ctx: KikaContext }) {
  return (
    <>
      {plugins.map((p) => {
        const C = p.slots?.settings
        if (!C) return null
        return (
          <Fragment key={p.id}>
            <C ctx={ctx} />
          </Fragment>
        )
      })}
    </>
  )
}
