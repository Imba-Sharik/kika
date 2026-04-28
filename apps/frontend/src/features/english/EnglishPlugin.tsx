'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { YukaiPlugin, YukaiContext } from '@/features/plugin-system/types'
import { useEnglishVocabulary } from './useEnglishVocabulary'
import { EnglishPanel } from './EnglishPanel'
import { statusOf, type EnglishItem } from './english-md'
import { extractMediaRequests } from '@/shared/yukai/persona'

// Ref-based singleton для доступа извне (через injectSystemContext / onChatResponse).
// Плагинные хуки (hooks жизненного цикла) не являются React-компонентами,
// так что не могут использовать useContext. Храним "живую" ссылку на state.
let currentItems: EnglishItem[] = []
let currentAddWords: ((words: string[]) => void) = () => {}
let currentApplyTags: ((text: string) => void) = () => {}
let currentOpenPanel: (() => void) = () => {}

type EnglishPluginState = {
  items: EnglishItem[]
}

const EngCtx = createContext<EnglishPluginState | null>(null)
function useEngPlugin(): EnglishPluginState {
  const v = useContext(EngCtx)
  if (!v) throw new Error('EnglishPlugin not mounted')
  return v
}

function EnglishProvider({ ctx, children }: { ctx: YukaiContext; children: ReactNode }) {
  const english = useEnglishVocabulary()

  // Каждый рендер обновляем singletons — последнее значение всегда актуально
  currentItems = english.items
  currentAddWords = english.addWords
  currentApplyTags = english.applyTags
  currentOpenPanel = () => ctx.ui.openPanel('english')

  return <EngCtx.Provider value={{ items: english.items }}>{children}</EngCtx.Provider>
}

function EnglishPanelSlot({ ctx }: { ctx: YukaiContext }) {
  const eng = useEngPlugin()
  return <EnglishPanel items={eng.items} onClose={() => ctx.ui.closePanel()} />
}

export const englishPlugin: YukaiPlugin = {
  id: 'english',
  name: 'Изучение английского',
  icon: '🔤',
  description: 'Карточки с угадыванием, SRS-трекер. [img: word] → картинка + Kika спрашивает.',
  permissions: ['chat', 'memory'],
  Provider: EnglishProvider,
  slots: {
    radial: {
      angle: 45,
      title: 'История английского',
      onClick: (ctx) => ctx.ui.openPanel('english'),
    },
    panel: EnglishPanelSlot,
  },
  // Инжектим сводку в system prompt — Kika знает что ученик уже выучил
  injectSystemContext() {
    if (currentItems.length === 0) return null
    const known = currentItems.filter((it) => statusOf(it) === 'known').map((it) => it.word)
    const learning = currentItems.filter((it) => statusOf(it) === 'learning').map(
      (it) => `${it.word}(${it.correct}✓${it.wrong}✗${it.hard ? ' HARD' : ''})`,
    )
    const newish = currentItems.filter((it) => statusOf(it) === 'new').map((it) => it.word)
    // Инжект на английском — иначе bias к ru в Claude system prompt при
    // не-русской UI-локали. Сами слова словаря — английские, инструкции тоже.
    return [
      '[MEMORY: English vocabulary]',
      known.length > 0 ? `Known (${known.length}): ${known.join(', ')}` : null,
      learning.length > 0 ? `Learning (${learning.length}): ${learning.join(', ')}` : null,
      newish.length > 0 ? `New (${newish.length}): ${newish.join(', ')}` : null,
      '',
      'Rules for picking the next practice word:',
      '- Do NOT show words from "Known" (user already learned them)',
      '- Return to "Learning" more often, especially HARD words',
      '- Occasionally add a new word to grow vocabulary',
    ].filter(Boolean).join('\n')
  },
  // После ответа Kika: извлекаем [img: word] и теги [correct/wrong/hard]
  onChatResponse(fullText) {
    const words = extractMediaRequests(fullText)
      .filter((r) => r.type === 'img')
      .map((r) => r.query)
    if (words.length > 0) {
      currentAddWords(words)
      currentOpenPanel()
    }
    currentApplyTags(fullText)
  },
}
