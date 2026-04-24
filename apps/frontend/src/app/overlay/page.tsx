'use client'

import { useEffect, useRef, useState } from 'react'
import { KikaFace } from '@/widgets/kika-face/KikaFace'
import { useMicListener } from '@/features/mic-input/useMicListener'
import { MicBars } from '@/features/mic-input/MicBars'
import { EnglishImages } from '@/features/english-images/EnglishImages'
import { useChat } from '@/features/chat/useChat'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { RadialMenu } from '@/widgets/radial-menu/RadialMenu'
import { BUILTIN_PLUGINS } from '@/features/plugin-system/registry'
import { useEnabledPlugins } from '@/features/plugin-system/useEnabledPlugins'
import { KikaContextProvider } from '@/features/plugin-system/KikaContextProvider'
import {
  PluginProviders,
  CharacterOverlayHost,
  PanelHost,
} from '@/features/plugin-system/PluginHost'
import type { KikaContext } from '@/features/plugin-system/types'
import {
  stripMediaTags,
  type Emotion,
} from '@/shared/kika/persona'
import { BUILTIN_CHARACTERS } from '@/shared/kika/characters'
import { DEFAULT_VOICE_ID, findVoice } from '@/shared/kika/voices'

// Фиксированные настройки — как в chat-test с дефолтами
const CHARACTER = BUILTIN_CHARACTERS[0]
const MODEL = { provider: 'anthropic' as const, model: 'claude-haiku-4-5-20251001' }

const EMOTION_STORAGE_KEY = 'kika:overlay:emotion'
const MIC_STORAGE_KEY = 'kika:overlay:micDeviceId'
const VOICE_STORAGE_KEY = 'kika:overlay:voiceId'
const VAD_THRESHOLD_KEY = 'kika:overlay:vadThreshold'
const DEFAULT_VAD_THRESHOLD = 0.4

// Устаревшие [APPEND:]/[WRITE:] текстовые теги больше не используются —
// memory операции идут через настоящие tool_calls. Но стрипать теги из
// рендера чата нужно на случай если Claude в старом стиле пришлёт.
function stripMemoryTags(text: string): string {
  return text
    .replace(/\[APPEND:[^\]]+\][\s\S]*?\[\/APPEND\]/g, '')
    .replace(/\[WRITE:[^\]]+\][\s\S]*?\[\/WRITE\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties
const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '1px 5px',
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 3,
  fontSize: 10,
  fontFamily: 'monospace',
  color: '#e5e7eb',
}

export default function OverlayPage() {
  // messages/streaming/loading/speaking/error живут в useChat (см. ниже)
  const [emotion, setEmotion] = useState<Emotion>('neutral')
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)
  const [mics, setMics] = useState<MediaDeviceInfo[]>([])
  const [micDeviceId, setMicDeviceId] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    try { return localStorage.getItem(MIC_STORAGE_KEY) ?? '' } catch { return '' }
  })
  const [voiceId, setVoiceId] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_VOICE_ID
    try { return localStorage.getItem(VOICE_STORAGE_KEY) ?? DEFAULT_VOICE_ID } catch { return DEFAULT_VOICE_ID }
  })
  const voice = findVoice(voiceId, [])
  function selectVoice(id: string) {
    setVoiceId(id)
    try { localStorage.setItem(VOICE_STORAGE_KEY, id) } catch {}
  }
  const [micLevel, setMicLevel] = useState(0)
  const [vadThreshold, setVadThreshold] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_VAD_THRESHOLD
    try {
      const saved = localStorage.getItem(VAD_THRESHOLD_KEY)
      const num = saved ? parseFloat(saved) : DEFAULT_VAD_THRESHOLD
      return Number.isFinite(num) && num > 0 && num < 1 ? num : DEFAULT_VAD_THRESHOLD
    } catch { return DEFAULT_VAD_THRESHOLD }
  })
  function selectVadThreshold(v: number) {
    setVadThreshold(v)
    try { localStorage.setItem(VAD_THRESHOLD_KEY, String(v)) } catch {}
  }
  const [compact, setCompact] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Показываем первую подсказку «как начать разговор» один раз. Ключ версионирован —
  // при значительных правках онбординга бампай суффикс, юзеры увидят обновлённую версию.
  const ONBOARDING_KEY = 'kika:onboarding-seen-v1'
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return localStorage.getItem(ONBOARDING_KEY) !== 'true' } catch { return false }
  })
  function dismissOnboarding() {
    setShowOnboarding(false)
    try { localStorage.setItem(ONBOARDING_KEY, 'true') } catch {}
  }
  function showOnboardingAgain() {
    try { localStorage.removeItem(ONBOARDING_KEY) } catch {}
    setShowOnboarding(true)
  }

  // send() определена ниже — через ref ломаем циклическую зависимость.
  const sendRef = useRef<(text: string) => void>(() => {})

  const [menuOpen, setMenuOpen] = useState(false)
  // Активная панель плагина (music, dict, english и др.) — один ID за раз, null = закрыто.
  const [activePluginPanel, setActivePluginPanel] = useState<string | null>(null)
  // profile.md кэшируется в state при старте — Кика знает юзера с первого сообщения
  const [profileMd, setProfileMd] = useState<string>('')
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Главный чат-пайплайн вынесен в useChat — хук держит messages/streaming/loading/speaking/error.
  // Plugin registry — фильтруем по enabled-state юзера. Объявлено здесь,
  // чтобы передать plugins в useChat (для injectSystemContext/onChatResponse).
  const { isEnabled, setEnabled } = useEnabledPlugins()
  const activePlugins = BUILTIN_PLUGINS.filter((p) => isEnabled(p.id))

  const chat = useChat({
    persona: CHARACTER.persona,
    model: MODEL,
    voice,
    profileMd,
    plugins: activePlugins,
    audioElRef,
    audioEl,
    onEmotion: setEmotion,
    onProfileUpdate: setProfileMd,
  })

  // Hands-free listener — headless VAD. UI рисует MicBars под персонажем.
  // Флаг что VAD подняли авто-для-настроек, а не юзер через Ctrl+Z.
  // Объявлено до useMicListener потому что используется в testMode prop.
  const autoStartedByPanelRef = useRef(false)

  // Barge-in: мик слушает во время ответа Кики. Когда VAD ловит речь юзера
  // в момент TTS — прерываем Кику (chat.interrupt), VAD продолжает запись
  // и по концу реплики шлёт транскрипт в send.
  const mic = useMicListener({
    onTranscript: (text) => sendRef.current(text),
    onSpeechChange: (active) => {
      if (!active) return
      if (chat.speaking || chat.loading) chat.interrupt()
      setEmotion('listening')
    },
    deviceId: micDeviceId || undefined,
    vadThreshold,
    // Когда Settings открыты и мик авто-поднят — крутим VAD для UI-бара,
    // но не шлём речь в STT/Клода (иначе каждое тестовое «привет» = разговор).
    testMode: settingsOpen && autoStartedByPanelRef.current,
  })

  // Dictation и Music — теперь плагины. Их Provider'ы монтируются в
  // PluginProviders ниже, включая IPC-подписки и хоткеи.

  // Core API для плагинов
  const kikaCtx: KikaContext = {
    chat: {
      send: (text, attachments) => chat.send(text, attachments),
      onResponse: () => () => {}, // TODO: реализовать подписку на финальные ответы
    },
    memory: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      read: (path) => ((window as any).electronAPI?.readMemoryFile?.(path) ?? Promise.resolve(null)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      write: (path, content) => ((window as any).electronAPI?.writeMemoryFile?.(path, content) ?? Promise.resolve(false)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      append: (path, text) => ((window as any).electronAPI?.appendMemoryFile?.(path, text) ?? Promise.resolve(false)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      list: (dir) => ((window as any).electronAPI?.listMemoryFiles?.(dir ?? '') ?? Promise.resolve([])),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      openFolder: () => (window as any).electronAPI?.openMemoryFolder?.(),
    },
    tts: {
      enqueue: () => {}, // TODO: в useChat добавить публичный enqueue для плагинов
    },
    ui: {
      openPanel: (id) => setActivePluginPanel(id),
      closePanel: () => setActivePluginPanel(null),
      setEmotion,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      openExternal: (url) => (window as any).electronAPI?.openExternal?.(url),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      copyImageToClipboard: (dataUrl) => (window as any).electronAPI?.copyImageToClipboard?.(dataUrl),
      closeChat: () => setCompact(true),
    },
  }

  function toggleCompact() {
    // Только CSS-toggle, окно не ресайзится.
    setCompact((v) => !v)
  }

  // Ref на mic — чтобы IPC-эффект не пересоздавался на каждый рендер.
  const micToggleRef = useRef(mic.toggle)
  useEffect(() => { micToggleRef.current = mic.toggle })

  // Ctrl+Z mic-toggle — единственный хоткей, который живёт на уровне core.
  // onDictationStart/Stop и onMusicStart/Stop подписывают соответствующие плагины.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI
    if (!api) return
    const unsubs: Array<(() => void) | undefined> = []
    if (api.onMicToggle) unsubs.push(api.onMicToggle(() => micToggleRef.current()))
    return () => { unsubs.forEach((fn) => { if (typeof fn === 'function') fn() }) }
  }, [])

  type PanelName = 'chat' | 'music' | 'dict' | 'english' | 'settings'
  // Открыть одну панель — остальные закрыть. Клик по активной → закрыть всё.
  // Плагины (music, dictation) используют activePluginPanel; встроенные
  // (english, settings, chat) — собственные boolean states.
  function togglePanel(name: PanelName) {
    const isChatOpen = !compact
    const currentlyOpen: PanelName | null = settingsOpen
      ? 'settings'
      : activePluginPanel === 'music'
      ? 'music'
      : activePluginPanel === 'dictation'
      ? 'dict'
      : activePluginPanel === 'english'
      ? 'english'
      : isChatOpen
      ? 'chat'
      : null
    const target: PanelName | null = currentlyOpen === name ? null : name
    setCompact(target !== 'chat')
    const pluginId =
      target === 'music' ? 'music' :
      target === 'dict' ? 'dictation' :
      target === 'english' ? 'english' : null
    setActivePluginPanel(pluginId)
    setSettingsOpen(target === 'settings')
  }

  // profile.md — грузим один раз на старте, чтобы первый ответ был быстрым.
  // Английский словарь загружается своим хуком useEnglishVocabulary.
  useEffect(() => {
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (!api?.readMemoryFile) return
      const profile = await api.readMemoryFile('profile.md')
      if (profile && profile.trim()) setProfileMd(profile)
    })()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, chat.streaming])

  useEffect(() => {
    try { localStorage.setItem(EMOTION_STORAGE_KEY, emotion) } catch {}
  }, [emotion])

  // Авто-старт hands-free при запуске приложения — Kika сразу готова слушать,
  // не нужно Ctrl+Z искать. Бежит один раз через ref-флаг.
  const autoStartedAtBootRef = useRef(false)
  useEffect(() => {
    if (autoStartedAtBootRef.current) return
    if (mic.state === 'off') {
      autoStartedAtBootRef.current = true
      mic.start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.state])

  // Авто-старт VAD при открытии настроек — чтобы юзер видел как его голос
  // реагирует на порог даже без Ctrl+Z. При закрытии — стопим VAD только если
  // это мы его сами подняли (не трогаем hands-free который юзер включил руками).
  useEffect(() => {
    if (settingsOpen) {
      if (mic.state === 'off' || mic.state === 'error') {
        autoStartedByPanelRef.current = true
        mic.start()
      }
    } else if (autoStartedByPanelRef.current) {
      autoStartedByPanelRef.current = false
      mic.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsOpen])

  useEffect(() => {
    // micDeviceId уже загружен через lazy useState initializer
    async function loadMics() {
      try {
        // Запрашиваем permission, иначе labels будут пустые
        const tmp = await navigator.mediaDevices.getUserMedia({ audio: true })
        tmp.getTracks().forEach((t) => t.stop())
        const devs = await navigator.mediaDevices.enumerateDevices()
        setMics(devs.filter((d) => d.kind === 'audioinput'))
      } catch (e) {
        console.error('[overlay] mic enumerate failed:', e)
      }
    }
    loadMics()
  }, [])

  function selectMic(id: string) {
    setMicDeviceId(id)
    try { localStorage.setItem(MIC_STORAGE_KEY, id) } catch {}
  }

  // Live-индикатор уровня выбранного микрофона
  useEffect(() => {
    let stopped = false
    let ctx: AudioContext | null = null
    let stream: MediaStream | null = null
    let raf = 0

    async function run() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            ...(micDeviceId ? { deviceId: { exact: micDeviceId } } : {}),
            autoGainControl: true,
            noiseSuppression: true,
            echoCancellation: true,
          },
        })
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return }
        ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        src.connect(analyser)
        const data = new Uint8Array(analyser.frequencyBinCount)
        const tick = () => {
          if (stopped) return
          analyser.getByteTimeDomainData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128
            sum += v * v
          }
          const rms = Math.sqrt(sum / data.length)
          // Вычитаем шумовой пол + умеренный усилитель → динамика слышна,
          // при тихом голосе бары ниже, при громком — выше, не упирается в потолок.
          const normalized = Math.max(0, (rms - 0.015) * 3)
          setMicLevel(Math.min(1, normalized))
          raf = requestAnimationFrame(tick)
        }
        tick()
      } catch (e) {
        console.error('[overlay] mic monitor failed:', e)
      }
    }
    run()

    return () => {
      stopped = true
      if (raf) cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
      ctx?.close()
    }
  }, [micDeviceId])

  // Все пост-обработки финального ответа теперь через plugin.onChatResponse
  // (englishPlugin извлекает слова/теги, open panel и т.д.)
  async function send(userText: string) {
    // Сначала даём плагинам шанс перехватить команду (скриншот, погода и т.п.)
    for (const p of activePlugins) {
      if (p.handleCommand?.(userText, kikaCtx)) return
    }
    await chat.send(userText)
  }

  // Синхронизируем sendRef — чтобы обработчики (VAD, music recognition)
  // всегда звали актуальную версию send().
  useEffect(() => { sendRef.current = send })

  return (
    <KikaContextProvider value={kikaCtx}>
      {/* Provider'ы ВСЕХ плагинов всегда монтируются — чтобы тогглы в настройках
          не перестраивали React-дерево и не сбрасывали скролл/фокус.
          Хосты ниже уже фильтруют по activePlugins — слоты отключенных
          плагинов просто не рендерятся. */}
      <PluginProviders plugins={BUILTIN_PLUGINS} ctx={kikaCtx}>
    <div className="fixed inset-0" style={{ background: 'transparent' }}>
      {/* Персонаж — абсолютно позиционирован внизу-слева, НЕ двигается при toggle чата */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: 200,
          height: 240,
          cursor: 'grab',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          userSelect: 'none',
          zIndex: 2,
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return // только левая кнопка = drag
          let lastX = e.screenX
          let lastY = e.screenY
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const api = (window as any).electronAPI
          const onMove = (ev: MouseEvent) => {
            const dx = ev.screenX - lastX
            const dy = ev.screenY - lastY
            if (dx || dy) {
              api?.moveWindowBy?.(dx, dy)
              lastX = ev.screenX
              lastY = ev.screenY
            }
          }
          const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
          }
          // Клик-toggle убран — был источник случайного отключения мика. Для toggle —
          // только Ctrl+Z или маленькая кнопка MicBars под персонажем.
          window.addEventListener('mousemove', onMove)
          window.addEventListener('mouseup', onUp)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          setMenuOpen((v) => !v)
        }}
      >
        <KikaFace emotion={emotion} audio={audioEl} size={180} />

        {/* Онбординг: показывается один раз при первом запуске справа от персонажа.
            Объясняет главное — Ctrl+Z чтобы начать разговор. Dismiss → localStorage. */}
        {showOnboarding && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              ...noDragStyle,
              position: 'absolute',
              bottom: 60,
              left: 200,
              width: 220,
              padding: '12px 14px',
              background: 'linear-gradient(135deg, rgba(236,72,153,0.95), rgba(139,92,246,0.95))',
              color: 'white',
              borderRadius: 10,
              fontSize: 12,
              lineHeight: 1.4,
              boxShadow: '0 6px 20px rgba(139,92,246,0.4)',
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Привет! 👋</div>
            <div style={{ marginBottom: 10 }}>
              Чтобы поговорить голосом — зажми <kbd style={{
                padding: '1px 6px',
                borderRadius: 3,
                background: 'rgba(0,0,0,0.3)',
                fontFamily: 'ui-monospace, monospace',
                fontSize: 11,
              }}>Ctrl+Z</kbd> или кликни на полоски под Кикой:
              <span style={{
                display: 'inline-flex',
                gap: 2,
                alignItems: 'center',
                marginLeft: 4,
                padding: '2px 6px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 4,
                verticalAlign: 'middle',
              }}>
                <span style={{ width: 2, height: 6, background: '#22c55e' }} />
                <span style={{ width: 2, height: 10, background: '#22c55e' }} />
                <span style={{ width: 2, height: 8, background: '#22c55e' }} />
                <span style={{ width: 2, height: 12, background: '#22c55e' }} />
                <span style={{ width: 2, height: 7, background: '#22c55e' }} />
              </span>
              <br />
              Повторное нажатие/клик — выключить.
            </div>
            <button
              type="button"
              onClick={dismissOnboarding}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 6,
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Понятно
            </button>
            {/* Стрелочка к персонажу */}
            <div style={{
              position: 'absolute',
              left: -8,
              bottom: 20,
              width: 0,
              height: 0,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderRight: '8px solid rgba(236,72,153,0.95)',
            }} />
          </div>
        )}

        {/* Мик-бары поверх персонажа (нижняя треть): статус hands-free, клик = toggle.
            Скрываем при открытом радиал-меню — чтобы не перекрывать кнопки. */}
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: menuOpen ? 'translateX(-50%) scale(0.5)' : 'translateX(-50%) scale(1)',
            opacity: menuOpen ? 0 : 1,
            pointerEvents: menuOpen ? 'none' : 'auto',
            transition: 'opacity 180ms ease-out, transform 180ms ease-out',
            zIndex: 3,
          }}
        >
          {/* В test-mode (VAD крутится только для слайдера в настройках) показываем
              MicBars как выключенный — чтобы юзера не сбивало «режим включился сам». */}
          <MicBars
            state={autoStartedByPanelRef.current && settingsOpen ? 'off' : mic.state}
            micLevel={micLevel}
            onClick={mic.toggle}
            error={mic.error}
          />
        </div>

        {(() => {
          // Собираем items без явных углов — углы распределятся равномерно
          // по дуге от -90° (верх) до 135° (низ-лево), 225° всего.
          // Порядок: Чат → плагины (в порядке регистрации) → Память → Настройки.
          const pluginItems = activePlugins
            .filter((p) => p.slots?.radial)
            .map((p) => ({
              icon: p.icon,
              title: p.slots!.radial!.title,
              action: () => { p.slots!.radial!.onClick(kikaCtx); setMenuOpen(false) },
            }))
          const rawItems = [
            { icon: '💬', title: 'Чат', action: () => { togglePanel('chat'); setMenuOpen(false) } },
            ...pluginItems,
            {
              icon: '🧠',
              title: 'Память Kika (открыть папку)',
              action: () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const api = (window as any).electronAPI
                api?.openMemoryFolder?.()
                setMenuOpen(false)
              },
            },
            { icon: '⚙', title: 'Настройки', action: () => { togglePanel('settings'); setMenuOpen(false) } },
          ]
          const ARC_START = -90
          const ARC_END = 135
          const step = rawItems.length > 1 ? (ARC_END - ARC_START) / (rawItems.length - 1) : 0
          const items = rawItems.map((it, i) => ({
            ...it,
            angle: rawItems.length > 1 ? ARC_START + step * i : 0,
          }))
          return <RadialMenu open={menuOpen} items={items} />
        })()}
        {/* Индикаторы статуса от плагинов (music LISTENING/RECOGNIZING и т.п.) */}
        <CharacterOverlayHost plugins={activePlugins} ctx={kikaCtx} />
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>

      {/* Чат — абсолют справа, display toggle (zero layout shift) */}
      <div
        style={{
          ...noDragStyle,
          display: compact ? 'none' : 'flex',
          position: 'absolute',
          top: 4,
          right: 4,
          bottom: 4,
          left: 204,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          flexDirection: 'column',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 12,
          borderRadius: 8,
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {/* Header со статусом + закрытие */}
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
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: chat.error
                ? '#ef4444'
                : chat.speaking
                  ? '#22c55e'
                  : chat.loading
                    ? '#f59e0b'
                    : '#6b7280',
              boxShadow: chat.speaking || chat.loading ? `0 0 8px currentColor` : 'none',
              transition: 'background 200ms, box-shadow 200ms',
            }}
          />
          <span style={{ color: '#fbbf24', fontWeight: 600 }}>Kika</span>
          <span style={{ color: '#9ca3af' }}>·</span>
          <span style={{ color: '#d1d5db', flex: 1 }}>
            {chat.error ? 'ошибка' : chat.speaking ? 'говорит' : chat.loading ? 'думает' : 'готова'}
          </span>
          {chat.lastTimings && (
            <span
              style={{
                color: '#6b7280',
                fontSize: 10,
                fontVariantNumeric: 'tabular-nums',
                marginRight: 8,
              }}
              title={`LLM: ${chat.lastTimings.llmMs.toFixed(0)}ms · TTS: ${(chat.lastTimings.ttsMs - chat.lastTimings.llmMs).toFixed(0)}ms · всего: ${chat.lastTimings.ttsMs.toFixed(0)}ms`}
            >
              ⏱ {(chat.lastTimings.llmMs / 1000).toFixed(2)}+{((chat.lastTimings.ttsMs - chat.lastTimings.llmMs) / 1000).toFixed(2)}={(chat.lastTimings.ttsMs / 1000).toFixed(2)}s
            </span>
          )}
          <button
            onClick={() => togglePanel('chat')}
            title="Закрыть чат"
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
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {chat.messages.length === 0 && !chat.streaming && (
            <div style={{ color: '#888', fontStyle: 'italic', padding: '4px 0' }}>
              Зажми <kbd style={kbdStyle}>Ctrl+Z</kbd> чтобы поговорить
              <br />
              <span style={{ color: '#666', fontSize: 10 }}>
                <kbd style={kbdStyle}>Right Alt</kbd> — диктовка ·{' '}
                <kbd style={kbdStyle}>Alt+`</kbd> — распознать песню
              </span>
            </div>
          )}
          {chat.messages.map((m, i) => {
            // Multimodal content — массив частей (text + image).
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parts = Array.isArray(m.content) ? (m.content as any[]) : []
            const imageParts = parts.filter((p) => p?.type === 'image')
            const raw = typeof m.content === 'string'
              ? m.content
              : parts
                  .filter((p) => p?.type === 'text')
                  .map((p) => p.text)
                  .join(' ')
            const isAssistant = m.role === 'assistant'
            const displayText = isAssistant
              ? stripMemoryTags(stripMediaTags(raw).replace(/\[(?:correct|wrong|hard):[^\]]*\]/gi, '').replace(/\[\w+\]/g, '')).trim()
              : raw
            return (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ color: isAssistant ? '#fbbf24' : '#60a5fa', fontSize: 10 }}>
                  {isAssistant ? 'Kika' : 'ты'}
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{displayText}</div>
                {imageParts.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    {imageParts.map((p, idx) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={idx}
                        src={`data:${p.mediaType};base64,${p.image}`}
                        alt="скриншот"
                        style={{
                          maxWidth: 140,
                          maxHeight: 100,
                          borderRadius: 4,
                          border: '1px solid rgba(255,255,255,0.1)',
                          objectFit: 'cover',
                        }}
                      />
                    ))}
                  </div>
                )}
                {isAssistant && <EnglishImages content={raw} />}
              </div>
            )
          })}
          {chat.streaming && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: '#fbbf24', fontSize: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>Kika</span>
                {chat.lastTimings && (
                  <span style={{ color: '#888', fontVariantNumeric: 'tabular-nums' }}>
                    ⏱ LLM {(chat.lastTimings.llmMs / 1000).toFixed(2)}s · TTS {((chat.lastTimings.ttsMs - chat.lastTimings.llmMs) / 1000).toFixed(2)}s · всего {(chat.lastTimings.ttsMs / 1000).toFixed(2)}s
                  </span>
                )}
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {stripMemoryTags(stripMediaTags(chat.streaming).replace(/\[(?:correct|wrong|hard):[^\]]*\]/gi, '').replace(/\[\w+\]/g, '')).trim()}
              </div>
              <EnglishImages content={chat.streaming} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Кнопка настроек — внизу чата */}
        <div style={{ padding: 6, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => togglePanel('settings')}
            title="Настройки"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#ccc',
              padding: '4px 8px',
              fontSize: 12,
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            ⚙ Настройки
          </button>
        </div>
      </div>

      <PanelHost plugins={activePlugins} activeId={activePluginPanel} ctx={kikaCtx} />

      {settingsOpen && (
        <SettingsPanel
          micDeviceId={micDeviceId}
          mics={mics}
          onSelectMic={selectMic}
          voiceId={voiceId}
          onSelectVoice={selectVoice}
          vadProbability={mic.vadProbability}
          vadThreshold={vadThreshold}
          onSelectVadThreshold={selectVadThreshold}
          onShowOnboardingAgain={showOnboardingAgain}
          isPluginEnabled={isEnabled}
          setPluginEnabled={setEnabled}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <audio
        ref={(el) => { setAudioEl(el); audioElRef.current = el }}
        className="hidden"
      />
    </div>
      </PluginProviders>
    </KikaContextProvider>
  )
}

