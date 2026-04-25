import type { ReactNode } from 'react'
import type { Emotion, Language } from '@/shared/yukai/persona'

// Разрешения, которые плагин может запросить. Юзер видит и одобряет.
export type Permission =
  | 'mic'             // доступ к микрофону
  | 'desktop-audio'   // захват системного звука (для распознавания музыки)
  | 'speaker'         // озвучка через TTS
  | 'keyboard'        // глобальные хоткеи
  | 'clipboard'       // запись/чтение буфера обмена
  | 'memory'          // чтение/запись в kika-memory/
  | 'chat'            // инжект в system prompt + подписка на ответы Kika

export type Cleanup = () => void

// Картинки/файлы для multimodal-сообщений. image — base64 без префикса
// ("data:..." снимается автоматом в useChat), mediaType — "image/png", etc.
export type ChatAttachment = {
  image: string
  mediaType: string
}

// Core API — то что core предоставляет плагинам.
export type YukaiContext = {
  chat: {
    send: (text: string, attachments?: ChatAttachment[]) => Promise<string | void>
    // Подписка на финальные ответы Kika (когда стрим завершён)
    onResponse: (cb: (fullText: string) => void) => Cleanup
  }
  memory: {
    read: (path: string) => Promise<string | null>
    write: (path: string, content: string) => Promise<boolean>
    append: (path: string, text: string) => Promise<boolean>
    list: (dir?: string) => Promise<Array<{ name: string; isDirectory: boolean }>>
    openFolder: () => void
  }
  tts: {
    enqueue: (text: string, emotion?: Emotion) => void
  }
  ui: {
    openPanel: (pluginId: string) => void
    closePanel: () => void
    setEmotion: (emotion: Emotion) => void
    // Открыть URL в дефолтном браузере (shell.openExternal)
    openExternal: (url: string) => void
    // Положить картинку (data URL) в clipboard — для paste в trace.moe / любой сайт
    copyImageToClipboard: (dataUrl: string) => void
    // Свернуть чат Kika (compact mode) — удобно перед скрином экрана
    closeChat: () => void
  }
  // Текущий язык интерфейса — плагины используют для локализации своих UI-строк.
  language: Language
}

// Манифест плагина — метаданные + UI-слоты.
// Для 3rd-party плагина весь этот объект будет сериализован (кроме компонентов).
export type YukaiPlugin = {
  id: string                      // уникальный: 'dictation', 'weather'
  name: string                    // "Диктовка"
  icon: string                    // '⌨️' (emoji или sprite id)
  description?: string
  version?: string
  author?: string
  permissions: Permission[]

  // React-провайдер, оборачивающий children контекстом плагина (state/refs).
  // Если плагину не нужен state — можно не указывать.
  Provider?: React.ComponentType<{ ctx: YukaiContext; children: ReactNode }>

  // UI-слоты. Каждый рендерится в соответствующем месте overlay.
  slots?: {
    // Кнопка в радиал-меню вокруг персонажа
    radial?: {
      angle: number               // угол в градусах (0 = справа, -90 = сверху)
      title: string
      onClick: (ctx: YukaiContext) => void
    }
    // Полноэкранная панель (открывается через ctx.ui.openPanel(id))
    panel?: React.ComponentType<{ ctx: YukaiContext }>
    // Компонент поверх персонажа (как MicBars)
    characterOverlay?: React.ComponentType<{ ctx: YukaiContext }>
    // Секция в панели настроек
    settings?: React.ComponentType<{ ctx: YukaiContext }>
  }

  // Хуки жизненного цикла — вызываются из core.
  // Инжект контекста в system prompt Claude (английский словарь, weather-сводка и т.д.)
  injectSystemContext?: () => string | null
  // Обработка финального ответа Kika (теги, извлечение данных)
  onChatResponse?: (fullText: string) => void
  // Перехватчик голосовых/текстовых команд юзера. Если вернул true —
  // команда "проглочена" плагином, обычная отправка в Claude пропускается.
  // Плагин отвечает за то чтобы сам сформулировать `ctx.chat.send(...)` с результатом.
  handleCommand?: (userText: string, ctx: YukaiContext) => boolean
}
