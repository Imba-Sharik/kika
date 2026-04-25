'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import type { YukaiPlugin, YukaiContext } from '@/features/plugin-system/types'


// Явный запрос про аниме → запускаем trace.moe параллельно с Claude.
// Сузили regex: только прямые упоминания, без общих слов ("какое", "откуда") —
// чтобы не тратить API-запрос когда юзер может спрашивать про фильм/игру/что угодно.
const ANIME_KEYWORDS_RE = /\b(аниме|anime|какая\s+серия|какой\s+эпизод|какое\s+это\s+аниме|из\s+какого\s+аниме|trace\.?moe)\b/i

// Ключевики для режима "область" (с падежами через \w*).
const REGION_KEYWORDS_RE = /(выдел\w*|обведи|отметь|област\w*|участ\w*|кусоч?к\w*|часть\s+экрана|выделени\w*)/i

// Голосовые команды на захват экрана. Широкий охват с падежами через \w*.
// Покрывает: "сделай скрин", "скрин", "сними экран", "скрин области",
// "заскринь", "что на экране", "посмотри на экран", "распознай что на скрине"
const COMMAND_RE = /(?:сдела\w+|сними|захвати)?\s*(скрин\w*|скриншот\w*|снимок|screenshot|заскрин\w*)|(что|чё|какое|расскажи\w*|распозна\w+)\s.{0,40}(на\s+\S*\s*(экране|скрине|картинке|мониторе|скриншоте)|видишь|аниме)|посмотри\s+(на\s+)?(экран|скрин)/i

type TraceMoeHit = {
  found: boolean
  title?: string
  titleNative?: string
  episode?: number | string | null
  from?: string
  to?: string
  similarity?: number
  isAdult?: boolean
  anilistId?: number
  malId?: number
  previewVideo?: string
}

export type ScreenshotItem = {
  ts: number
  dataUrl: string            // полный "data:image/png;base64,..." для рендера + повторной отправки
  trace?: TraceMoeHit | null // если распознано trace.moe — показываем в панели
}

// Singleton-сеттеры — doCapture и handlers в панели пушат/обновляют историю.
let pushItem: (item: ScreenshotItem) => void = () => {}
let updateItem: (ts: number, patch: Partial<ScreenshotItem>) => void = () => {}

type ScreenshotState = {
  history: ScreenshotItem[]
  capture: (ctx: YukaiContext, opts?: { userText?: string; mode?: 'full' | 'region' }) => Promise<void>
}

const ScreenCtx = createContext<ScreenshotState | null>(null)
export function useScreenshotHistory(): ScreenshotItem[] {
  return useContext(ScreenCtx)?.history ?? []
}

async function identifyAnime(imageDataUrl: string): Promise<TraceMoeHit | null> {
  try {
    const res = await fetch('/api/trace-moe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageDataUrl }),
    })
    if (!res.ok) return null
    return (await res.json()) as TraceMoeHit
  } catch (err) {
    console.error('[screenshot] trace.moe failed:', err)
    return null
  }
}

// Захват экрана → картинка в multimodal-сообщение + пуш в историю.
// mode: 'full' (весь экран) | 'region' (выделение мышкой). Если не указан —
// смотрим userText на ключевики "выдели/обведи/..." → region, иначе full.
async function doCapture(
  ctx: YukaiContext,
  opts?: { userText?: string; mode?: 'full' | 'region' },
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (window as any).electronAPI
  if (!api?.captureScreen) {
    console.error('[screenshot] electronAPI.captureScreen missing')
    return
  }

  const { userText, mode } = opts ?? {}
  const wantRegion = mode === 'region' || (userText ? REGION_KEYWORDS_RE.test(userText) : false)

  // Закрываем только панель скриншотов — чтобы она не попала в кадр.
  // Чат и персонажа НЕ трогаем: их состояние не должно мигать при каждом скрине.
  ctx.ui.closePanel()
  await new Promise((r) => setTimeout(r, 200))

  const dataUrl: string | null = wantRegion && api.captureRegion
    ? await api.captureRegion()
    : await api.captureScreen()
  if (!dataUrl) return

  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!match) {
    console.error('[screenshot] invalid data URL')
    return
  }
  const [, mediaType, base64] = match

  const isAnimeQuery = userText ? ANIME_KEYWORDS_RE.test(userText) : false
  const traceHit = isAnimeQuery ? await identifyAnime(dataUrl) : null

  // Пушим в историю плагина (отображается в панели + может быть переиспользован)
  pushItem({ ts: Date.now(), dataUrl, trace: traceHit })

  const userQuestion = userText?.trim()
    || 'Посмотри на скриншот и коротко опиши что там. Если это известный контент (фильм, сериал, игра, сайт, приложение) — назови. Если тест/задача — дай ответ. Если код/ошибка — объясни суть.'

  let traceContext = ''
  if (traceHit?.found && traceHit.title) {
    const ep = traceHit.episode != null ? `, эпизод ${traceHit.episode}` : ''
    const time = traceHit.from ? `, таймкод ${traceHit.from}` : ''
    traceContext =
      `\n\n[trace.moe определил аниме по кадру с точностью ${traceHit.similarity}%: ` +
      `"${traceHit.title}"${traceHit.titleNative ? ` (${traceHit.titleNative})` : ''}${ep}${time}. ` +
      `Используй эту информацию в ответе — она точная.]`
  } else if (isAnimeQuery) {
    traceContext = '\n\n[trace.moe не распознал кадр — попробуй угадать сама по скриншоту.]'
  }

  const prompt = `[Я только что посмотрела на экран — вот скриншот, я его вижу своими глазами.]${traceContext}\n\n${userQuestion}`

  void ctx.chat.send(prompt, [{ image: base64, mediaType }])
}

function ScreenProvider({ children }: { ctx: YukaiContext; children: ReactNode }) {
  const [history, setHistory] = useState<ScreenshotItem[]>([])
  pushItem = (item) => setHistory((prev) => [item, ...prev].slice(0, 10))
  updateItem = (ts, patch) => setHistory((prev) => prev.map((it) => (it.ts === ts ? { ...it, ...patch } : it)))

  const value: ScreenshotState = {
    history,
    capture: doCapture,
  }
  return <ScreenCtx.Provider value={value}>{children}</ScreenCtx.Provider>
}

// Панель галереи — превью последних скринов + кнопка нового захвата
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties
const actionBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#e5e7eb',
  fontSize: 10,
  padding: '4px 6px',
  borderRadius: 4,
  cursor: 'pointer',
  textAlign: 'left',
}

function ScreenshotPanel({ ctx }: { ctx: YukaiContext }) {
  const state = useContext(ScreenCtx)
  const history = state?.history ?? []
  const [selectedTs, setSelectedTs] = useState<number | null>(null)
  const [analyzing, setAnalyzing] = useState<Set<number>>(new Set())

  async function runTraceMoe(item: ScreenshotItem) {
    setAnalyzing((s) => new Set(s).add(item.ts))
    try {
      const hit = await identifyAnime(item.dataUrl)
      updateItem(item.ts, { trace: hit })
    } finally {
      setAnalyzing((s) => {
        const n = new Set(s)
        n.delete(item.ts)
        return n
      })
    }
  }

  // Универсальная функция: копирует картинку, открывает URL, через 2.5с Ctrl+V
  function openSearchSite(item: ScreenshotItem, url: string) {
    ctx.ui.copyImageToClipboard(item.dataUrl)
    ctx.ui.openExternal(url)
    setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      api?.simulatePaste?.()
    }, 2500)
  }

  return (
    <div
      style={{
        ...noDragStyle,
        position: 'absolute',
        top: 4,
        right: 4,
        bottom: 4,
        left: 204,
        background: 'rgba(0,0,0,0.88)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 12,
        borderRadius: 8,
        overflow: 'hidden',
        zIndex: 3,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          fontSize: 11,
        }}
      >
        <span style={{ fontSize: 14 }}>📸</span>
        <span style={{ color: '#fbbf24', fontWeight: 600 }}>Скриншоты</span>
        <span style={{ color: '#9ca3af', flex: 1 }}>· {history.length}</span>
        <button
          onClick={() => { void doCapture(ctx, { mode: 'region' }) }}
          title="Выделить область мышкой"
          style={{
            background: 'rgba(59,130,246,0.2)',
            border: '1px solid rgba(59,130,246,0.4)',
            color: '#93c5fd',
            cursor: 'pointer',
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 12,
          }}
        >
          ▭ область
        </button>
        <button
          onClick={() => { void doCapture(ctx, { mode: 'full' }) }}
          title="Скрин всего экрана"
          style={{
            background: 'rgba(236,72,153,0.2)',
            border: '1px solid rgba(236,72,153,0.4)',
            color: '#fbbf24',
            cursor: 'pointer',
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 12,
          }}
        >
          + экран
        </button>
        <button
          onClick={() => ctx.ui.closePanel()}
          title="Закрыть"
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {history.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic', padding: 12, textAlign: 'center' }}>
            Пока пусто.
            <br />
            <span style={{ color: '#666', fontSize: 10 }}>
              Нажми «+ новый» или скажи «что на экране?» / «выдели область и скажи откуда это»
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 }}>
            {history.map((item) => {
              const when = new Date(item.ts)
              const timeStr = when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
              const isSelected = selectedTs === item.ts
              const isAnalyzing = analyzing.has(item.ts)
              return (
                <div
                  key={item.ts}
                  style={{
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isSelected ? 'rgba(236,72,153,0.5)' : 'rgba(255,255,255,0.06)'}`,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedTs(isSelected ? null : item.ts)}
                  title={isSelected ? 'Клик — свернуть' : 'Клик — действия'}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.dataUrl}
                    alt="screenshot"
                    style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                  />
                  <div style={{ padding: '4px 6px', fontSize: 9, color: '#9ca3af' }}>
                    <div>{timeStr}</div>
                    {item.trace?.found && item.trace.title && (
                      <div style={{ color: '#fbbf24', marginTop: 2 }} title={item.trace.title}>
                        🎬 {item.trace.title}
                        {item.trace.episode != null && ` · эп. ${item.trace.episode}`}
                        {item.trace.similarity != null && ` · ${item.trace.similarity}%`}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div
                      style={{ padding: '4px 6px 6px', display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => openSearchSite(item, 'https://trace.moe')}
                        style={actionBtnStyle}
                        title="Точный поиск по кадрам аниме (эпизод + таймкод)"
                      >
                        🔗 trace.moe
                      </button>
                      <button
                        onClick={() => openSearchSite(item, 'https://yandex.com/images/search?rpt=imageview')}
                        style={actionBtnStyle}
                        title="Yandex Images — аниме, фильмы, арт"
                      >
                        🔍 Yandex
                      </button>
                      <button
                        onClick={() => openSearchSite(item, 'https://lens.google.com')}
                        style={actionBtnStyle}
                        title="Google Lens — мейнстрим фильмы и аниме"
                      >
                        📸 Google Lens
                      </button>
                      {item.trace?.anilistId && (
                        <button
                          onClick={() => ctx.ui.openExternal(`https://anilist.co/anime/${item.trace!.anilistId}`)}
                          style={actionBtnStyle}
                        >
                          📺 Страница на AniList
                        </button>
                      )}
                      {item.trace?.previewVideo && (
                        <button
                          onClick={() => ctx.ui.openExternal(item.trace!.previewVideo!)}
                          style={actionBtnStyle}
                        >
                          ▶ Превью сцены
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export const screenshotPlugin: YukaiPlugin = {
  id: 'screenshot',
  name: 'Скриншот + зрение',
  icon: '📸',
  description: 'Захват экрана → Claude описывает что видит. Скажи "что на экране", "выдели область", "из какого это аниме".',
  permissions: ['desktop-audio', 'chat'],
  Provider: ScreenProvider,
  slots: {
    radial: {
      angle: 135,
      title: 'Скриншоты + зрение',
      // Клик открывает только панель. Новый скрин — либо голосом
      // ("что на экране?", "выдели область"), либо кнопкой "+ новый" внутри панели.
      onClick: (ctx) => ctx.ui.openPanel('screenshot'),
    },
    panel: ScreenshotPanel,
  },
  handleCommand(userText, ctx) {
    if (!COMMAND_RE.test(userText)) return false
    void (async () => {
      try {
        await doCapture(ctx, { userText })
      } catch (e) {
        console.error('[screenshot] voice trigger failed:', e)
      }
    })()
    return true
  },
}
