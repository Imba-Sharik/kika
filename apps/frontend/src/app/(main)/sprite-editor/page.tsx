'use client'

import { useEffect, useRef, useState } from 'react'

type Variant = {
  id: string
  src: string
  emotion: string
  state: 'open' | 'mid' | 'closed' | 'blink_half' | 'blink_closed' | 'normal' | 'half' | 'wide'
}

type Layer = {
  id: string
  label: string
  isMouth: boolean
  isEyes: boolean
  variants: Variant[]
  activeIdx: number
  x: number
  y: number
  width: number
}

const STORAGE_KEY = 'kika:sprite-editor:v5'

const STATE_LABELS: Record<string, string> = {
  closed: 'Закрыт',
  mid: 'Полуоткрыт',
  open: 'Открыт',
}

const EYE_STATES = ['normal', 'half', 'wide', 'closed'] as const
const EYE_STATE_LABELS: Record<string, string> = {
  normal: 'Открыты',
  half:   'Полуприкрыты',
  wide:   'Широко',
  closed: 'Улыбка/закрыты',
}

// Какое состояние глаз по умолчанию для каждой эмоции
const EMOTION_EYE_STATE: Record<string, string> = {
  neutral:     'normal',
  happy:       'normal',
  sad:         'half',
  angry:       'half',
  surprised:   'wide',
  embarrassed: 'half',
}

const FACE_EMOTIONS = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'embarrassed']

const EMOTION_LABELS: Record<string, string> = {
  neutral: 'Нейтрал',
  happy: 'Радость',
  sad: 'Грусть',
  angry: 'Злость',
  surprised: 'Удивление',
  embarrassed: 'Смущение',
}

const DEFAULT_LAYERS: Layer[] = [
  { id: 'base',  label: 'База',  isMouth: false, isEyes: false, variants: [], activeIdx: 0, x: 50, y: 0,  width: 100 },
  { id: 'eyes',  label: 'Глаза', isMouth: false, isEyes: true,  variants: [], activeIdx: 0, x: 50, y: 30, width: 70  },
  { id: 'mouth', label: 'Рот',   isMouth: true,  isEyes: false, variants: [], activeIdx: 0, x: 50, y: 65, width: 45  },
]

const PROTECTED = ['base', 'eyes', 'mouth']

function load(): Layer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return DEFAULT_LAYERS
}

export default function SpriteEditorPage() {
  // Lazy initializer — загружаем из localStorage при маунте, без useEffect.
  // Выполняется только на клиенте (SSR возвращает DEFAULT_LAYERS через typeof window).
  const [layers, setLayers] = useState<Layer[]>(() =>
    typeof window === 'undefined' ? DEFAULT_LAYERS : load(),
  )
  const [selectedId, setSelectedId] = useState('base')
  const [addingLayer, setAddingLayer] = useState(false)
  const [newLayerLabel, setNewLayerLabel] = useState('')
  const [currentEmotion, setCurrentEmotion] = useState('neutral')
  const currentEmotionRef = useRef('neutral')
  const [currentEyeState, setCurrentEyeState] = useState('normal')
  const currentEyeStateRef = useRef('normal')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [testText, setTestText] = useState('Привет, я твой новый питомец!')
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadTarget = useRef<{ layerId: string; emotion: string; state: Variant['state'] } | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const layersRef = useRef<Layer[]>(DEFAULT_LAYERS)

  // Автоморгание — 3 этапа: half(40мс) → closed(60мс) → half(40мс) → normal
  useEffect(() => {
    function applyEyeVariant(state: Variant['state'] | null) {
      const layers = layersRef.current
      const eyes = layers.find(l => l.isEyes)
      if (!eyes) return

      let idx: number
      if (state === null) {
        const em = currentEmotionRef.current
        const st = currentEyeStateRef.current
        idx = eyes.variants.findIndex(v => v.emotion === em && v.state === st)
        if (idx < 0) idx = eyes.variants.findIndex(v => v.emotion === em && v.state === 'normal')
        if (idx < 0) idx = eyes.variants.findIndex(v => v.emotion === 'neutral' && v.state === 'normal')
      } else {
        idx = eyes.variants.findIndex(v => v.state === state)
      }

      if (idx < 0) return
      const next = layers.map(l => l.isEyes ? { ...l, activeIdx: idx } : l)
      layersRef.current = next
      setLayers(next)
    }

    function scheduleBlink() {
      const delay = 8000 + Math.random() * 7000
      blinkTimer.current = setTimeout(() => {
        const eyes = layersRef.current.find(l => l.isEyes)
        const hasClosed = eyes?.variants.some(v => v.state === 'blink_closed') ?? false
        const hasHalf   = eyes?.variants.some(v => v.state === 'blink_half')   ?? false

        if (!hasClosed) { scheduleBlink(); return }

        if (hasHalf) {
          applyEyeVariant('blink_half')
          setTimeout(() => applyEyeVariant('blink_closed'), 40)
          setTimeout(() => applyEyeVariant('blink_half'),   100)
          setTimeout(() => { applyEyeVariant(null); scheduleBlink() }, 140)
        } else {
          applyEyeVariant('blink_closed')
          setTimeout(() => { applyEyeVariant(null); scheduleBlink() }, 100)
        }
      }, delay)
    }

    scheduleBlink()
    return () => { if (blinkTimer.current) clearTimeout(blinkTimer.current) }
  }, [])

  function persist(next: Layer[]) {
    layersRef.current = next
    setLayers(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const selected = layers.find(l => l.id === selectedId)

  // Найти индекс варианта по эмоции и состоянию
  function findVariantIdx(layer: Layer, emotion: string, state: 'open' | 'mid' | 'closed'): number {
    let idx = layer.variants.findIndex(v => v.emotion === emotion && v.state === state)
    if (idx >= 0) return idx
    // mid fallback: если нет mid — используем open
    if (state === 'mid') {
      idx = layer.variants.findIndex(v => v.emotion === emotion && v.state === 'open')
      if (idx >= 0) return idx
    }
    // fallback на neutral
    idx = layer.variants.findIndex(v => v.emotion === 'neutral' && v.state === state)
    if (idx >= 0) return idx
    return layer.variants.length > 0 ? 0 : -1
  }

  function setMouthState(emotion: string, state: 'open' | 'mid' | 'closed') {
    setLayers(prev => prev.map(l => {
      if (!l.isMouth) return l
      const idx = findVariantIdx(l, emotion, state)
      return idx >= 0 ? { ...l, activeIdx: idx } : l
    }))
  }

  function setEyesState(emotion: string, eyeState: string) {
    setLayers(prev => prev.map(l => {
      if (!l.isEyes) return l
      let idx = l.variants.findIndex(v => v.emotion === emotion && v.state === eyeState)
      if (idx < 0) idx = l.variants.findIndex(v => v.emotion === emotion && v.state === 'normal')
      if (idx < 0) idx = l.variants.findIndex(v => v.emotion === 'neutral' && v.state === 'normal')
      return idx >= 0 ? { ...l, activeIdx: idx } : l
    }))
  }

  function triggerUpload(layerId: string, emotion: string, state: Variant['state']) {
    uploadTarget.current = { layerId, emotion, state }
    fileRef.current?.click()
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget.current) return
    const { layerId, emotion, state } = uploadTarget.current
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      persist(layers.map(l => {
        if (l.id !== layerId) return l
        const existing = l.variants.findIndex(v => v.emotion === emotion && v.state === state)
        if (existing >= 0) {
          const variants = [...l.variants]
          variants[existing] = { ...variants[existing], src }
          return { ...l, variants }
        }
        const variant: Variant = { id: `${layerId}_${emotion}_${state}_${Date.now()}`, src, emotion, state: state as Variant['state'] }
        return { ...l, variants: [...l.variants, variant], activeIdx: l.variants.length }
      }))
    }
    reader.readAsDataURL(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  function deleteVariant(layerId: string, emotion: string, state: Variant['state']) {
    persist(layers.map(l => {
      if (l.id !== layerId) return l
      const variants = l.variants.filter(v => !(v.emotion === emotion && v.state === state))
      return { ...l, variants, activeIdx: Math.min(l.activeIdx, Math.max(0, variants.length - 1)) }
    }))
  }

  // Для не-рот слоёв
  function triggerSimpleUpload(layerId: string) {
    uploadTarget.current = { layerId, emotion: '', state: 'closed' }
    fileRef.current?.click()
  }

  function onSimpleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget.current) return
    const { layerId } = uploadTarget.current
    const layer = layers.find(l => l.id === layerId)
    if (layer?.isMouth || layer?.isEyes) { onFile(e); return }
    const label = file.name.replace(/\.[^.]+$/, '')
    const reader = new FileReader()
    reader.onload = (ev) => {
      const src = ev.target?.result as string
      const variant: Variant = { id: `${layerId}_${Date.now()}`, src, emotion: label, state: 'closed' }
      persist(layers.map(l =>
        l.id === layerId
          ? { ...l, variants: [...l.variants, variant], activeIdx: l.variants.length }
          : l
      ))
    }
    reader.readAsDataURL(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  function setActiveSimple(layerId: string, idx: number) {
    persist(layers.map(l => l.id === layerId ? { ...l, activeIdx: idx } : l))
  }

  function deleteSimpleVariant(layerId: string, variantId: string) {
    persist(layers.map(l => {
      if (l.id !== layerId) return l
      const variants = l.variants.filter(v => v.id !== variantId)
      return { ...l, variants, activeIdx: Math.min(l.activeIdx, Math.max(0, variants.length - 1)) }
    }))
  }

  function setProp(layerId: string, prop: 'x' | 'y' | 'width', value: number) {
    persist(layers.map(l => l.id === layerId ? { ...l, [prop]: value } : l))
  }

  function addLayer() {
    const label = newLayerLabel.trim()
    if (!label) return
    const id = `layer_${crypto.randomUUID().slice(0, 8)}`
    persist([...layers, { id, label, isMouth: false, isEyes: false, variants: [], activeIdx: 0, x: 50, y: 50, width: 50 }])
    setSelectedId(id)
    setNewLayerLabel('')
    setAddingLayer(false)
  }

  function removeLayer(layerId: string) {
    const next = layers.filter(l => l.id !== layerId)
    persist(next)
    if (selectedId === layerId) setSelectedId(next[0]?.id ?? '')
  }

  function moveLayer(layerId: string, dir: -1 | 1) {
    const i = layers.findIndex(l => l.id === layerId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= layers.length) return
    const next = [...layers]
    ;[next[i], next[j]] = [next[j], next[i]]
    persist(next)
  }

  function stopAnimation() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    timers.current.forEach(clearTimeout)
    timers.current = []
    setMouthState(currentEmotion, 'closed')
    setIsPlaying(false)
    setIsLoading(false)
  }

  async function playAnimation() {
    const mouth = layers.find(l => l.isMouth)
    if (!mouth || mouth.variants.length === 0) return

    stopAnimation()
    setIsLoading(true)

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          emotion: currentEmotion,
          provider: 'fish',
          voiceId: '6dc11f3f67a543f6ad4537a4a347e224',
        }),
      })
      if (!res.ok) throw new Error('TTS error')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio

      const ctx = new AudioContext()
      const source = ctx.createMediaElementSource(audio)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyser.connect(ctx.destination)
      analyserRef.current = analyser

      const data = new Uint8Array(analyser.fftSize)

      function tick() {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / data.length)

        const state: 'open' | 'mid' | 'closed' =
          rms > 0.12 ? 'open' : rms > 0.04 ? 'mid' : 'closed'
        setMouthState(currentEmotion, state)

        rafRef.current = requestAnimationFrame(tick)
      }

      audio.onended = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        setMouthState(currentEmotion, 'closed')
        setIsPlaying(false)
        URL.revokeObjectURL(url)
      }

      setIsLoading(false)
      setIsPlaying(true)
      await ctx.resume()
      tick()
      await audio.play()
    } catch {
      setIsLoading(false)
      setIsPlaying(false)
    }
  }

  function changeEmotion(emotion: string) {
    const eyeState = EMOTION_EYE_STATE[emotion] ?? 'normal'
    setCurrentEmotion(emotion)
    currentEmotionRef.current = emotion
    setCurrentEyeState(eyeState)
    currentEyeStateRef.current = eyeState
    setMouthState(emotion, 'closed')
    setEyesState(emotion, eyeState)
  }

  function changeEyeState(eyeState: string) {
    setCurrentEyeState(eyeState)
    currentEyeStateRef.current = eyeState
    setEyesState(currentEmotion, eyeState)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div>
          <h1 className="text-lg font-bold">Редактор спрайтов</h1>
          <p className="text-xs text-muted-foreground">Слои снизу вверх. Рот — пары open/closed по эмоциям.</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Слои — левая панель */}
        <aside className="flex w-48 flex-col gap-1 overflow-y-auto border-r p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Слои (↑ = верх)
          </p>
          {[...layers].reverse().map((layer) => (
            <div
              key={layer.id}
              onClick={() => setSelectedId(layer.id)}
              className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                selectedId === layer.id ? 'bg-black text-white' : 'hover:bg-muted'
              }`}
            >
              <span className="truncate">{layer.label}</span>
              <div className="ml-1 flex shrink-0" onClick={e => e.stopPropagation()}>
                <button onClick={() => moveLayer(layer.id, 1)} className="px-0.5 text-[11px] opacity-40 hover:opacity-100">↓</button>
                <button onClick={() => moveLayer(layer.id, -1)} className="px-0.5 text-[11px] opacity-40 hover:opacity-100">↑</button>
              </div>
            </div>
          ))}

          {addingLayer ? (
            <div className="mt-1 flex flex-col gap-1 rounded-lg border p-2">
              <input
                autoFocus
                value={newLayerLabel}
                onChange={e => setNewLayerLabel(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addLayer()
                  if (e.key === 'Escape') setAddingLayer(false)
                }}
                placeholder="Название слоя"
                className="rounded border px-2 py-1 text-xs"
              />
              <div className="flex gap-1">
                <button onClick={addLayer} className="flex-1 rounded bg-black px-2 py-1 text-[10px] text-white">OK</button>
                <button onClick={() => setAddingLayer(false)} className="flex-1 rounded border px-2 py-1 text-[10px]">✕</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingLayer(true)}
              className="mt-1 rounded-lg border-2 border-dashed px-2 py-2 text-xs text-muted-foreground hover:border-foreground hover:text-foreground transition"
            >
              + Слой
            </button>
          )}
        </aside>

        {/* Превью — центр */}
        <div
          className="flex flex-1 flex-col items-center justify-center gap-5 p-8"
          style={{ background: 'repeating-conic-gradient(#e5e5e5 0% 25%, white 0% 50%) 0 0 / 16px 16px' }}
        >
          <div
            className="relative overflow-visible rounded-2xl bg-white shadow-xl"
            style={{ width: 280, height: 380 }}
          >
            {layers.map(layer => {
              const variant = layer.variants[layer.activeIdx]
              if (!variant) return null
              return (
                <img
                  key={layer.id}
                  src={variant.src}
                  alt={layer.label}
                  draggable={false}
                  className="absolute select-none"
                  style={{
                    left: `${layer.x}%`,
                    top: `${layer.y}%`,
                    width: `${layer.width}%`,
                    transform: 'translateX(-50%)',
                    objectFit: 'contain',
                    outline: selectedId === layer.id ? '2px dashed rgba(0,0,0,0.25)' : undefined,
                  }}
                />
              )
            })}
            {layers.every(l => l.variants.length === 0) && (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Загрузи PNG в слои →
              </div>
            )}
          </div>

          {/* Тест */}
          <div className="flex w-80 flex-col gap-3 rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Тест анимации</p>
            <input
              value={testText}
              onChange={e => setTestText(e.target.value)}
              disabled={isPlaying}
              placeholder="Введи текст..."
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
            />
            <div className="flex flex-col gap-1">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Эмоция</p>
              <div className="flex flex-wrap gap-1">
                {FACE_EMOTIONS.map(e => (
                  <button key={e} onClick={() => changeEmotion(e)}
                    className={`rounded-full px-3 py-1 text-xs transition ${currentEmotion === e ? 'bg-black text-white' : 'border hover:bg-muted'}`}
                  >{EMOTION_LABELS[e]}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Глаза</p>
              <div className="flex flex-wrap gap-1">
                {EYE_STATES.map(st => (
                  <button key={st} onClick={() => changeEyeState(st)}
                    className={`rounded-full px-3 py-1 text-xs transition ${currentEyeState === st ? 'bg-black text-white' : 'border hover:bg-muted'}`}
                  >{EYE_STATE_LABELS[st]}</button>
                ))}
              </div>
            </div>
            <button
              onClick={isPlaying ? stopAnimation : playAnimation}
              disabled={isLoading || !layers.find(l => l.isMouth)?.variants.length}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${
                isPlaying ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {isLoading ? '⏳ Генерация...' : isPlaying ? '⏹ Стоп' : '▶ Играть'}
            </button>
          </div>
        </div>

        {/* Настройки слоя — правая панель */}
        {selected && (
          <aside className="flex w-80 flex-col gap-4 overflow-y-auto border-l p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{selected.label}</h2>
              {!PROTECTED.includes(selected.id) && (
                <button onClick={() => removeLayer(selected.id)} className="text-xs text-red-500 hover:underline">
                  удалить слой
                </button>
              )}
            </div>

            {/* Позиция */}
            <div className="flex flex-col gap-3 rounded-xl border p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Позиция</p>
              {([
                { label: 'X (центр)',  prop: 'x'     as const, min: 0, max: 100 },
                { label: 'Y (сверху)', prop: 'y'     as const, min: 0, max: 100 },
                { label: 'Ширина',     prop: 'width' as const, min: 5, max: 120 },
              ]).map(({ label, prop, min, max }) => (
                <div key={prop} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
                  <input
                    type="range" min={min} max={max} value={selected[prop]}
                    onChange={e => setProp(selected.id, prop, Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-8 text-right font-mono text-xs">{selected[prop]}%</span>
                </div>
              ))}
            </div>

            {/* Варианты глаз */}
            {selected.isEyes ? (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Глаза: эмоция × состояние
                </p>

                {/* Шапка */}
                <div className="grid grid-cols-5 gap-1">
                  <div />
                  {EYE_STATES.map(st => (
                    <p key={st} className="text-center text-[8px] leading-tight text-muted-foreground">{EYE_STATE_LABELS[st]}</p>
                  ))}
                </div>

                {/* Сетка эмоция × состояние */}
                {FACE_EMOTIONS.map(emotion => (
                  <div key={emotion} className="grid grid-cols-5 items-center gap-1">
                    <span className="text-[10px] leading-tight text-muted-foreground">{EMOTION_LABELS[emotion]}</span>
                    {EYE_STATES.map(st => {
                      const v = selected.variants.find(vv => vv.emotion === emotion && vv.state === st)
                      return v ? (
                        <div key={st} className="group relative">
                          <img src={v.src} alt={`${emotion} ${st}`} className="h-9 w-full cursor-pointer rounded border-2 border-black object-contain" onClick={() => triggerUpload(selected.id, emotion, st as Variant['state'])} />
                          <button onClick={() => deleteVariant(selected.id, emotion, st as Variant['state'])} className="absolute right-0 top-0 hidden rounded bg-red-500 px-0.5 text-[8px] text-white group-hover:block">✕</button>
                        </div>
                      ) : (
                        <button key={st} onClick={() => triggerUpload(selected.id, emotion, st as Variant['state'])} className="flex h-9 w-full items-center justify-center rounded border-2 border-dashed border-muted-foreground/20 text-base text-muted-foreground transition hover:border-foreground hover:text-foreground">+</button>
                      )
                    })}
                  </div>
                ))}

                {/* Моргание */}
                <div className="rounded-xl border p-3">
                  <p className="mb-3 text-xs font-medium">Моргание <span className="text-[10px] font-normal text-muted-foreground">(авто каждые 5–10 сек)</span></p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['blink_half', 'blink_closed'] as const).map(st => {
                      const bv = selected.variants.find(vv => vv.state === st)
                      const label = st === 'blink_half' ? 'Полузакрыты (40мс)' : 'Закрыты (60мс)'
                      return (
                        <div key={st} className="flex flex-col gap-1">
                          <p className="text-center text-[9px] text-muted-foreground">{label}</p>
                          {bv ? (
                            <div className="group relative">
                              <img src={bv.src} alt={st} className="h-10 w-full cursor-pointer rounded-lg border-2 border-black object-contain" onClick={() => triggerUpload(selected.id, st, st)} />
                              <button onClick={() => deleteVariant(selected.id, st, st)} className="absolute right-0.5 top-0.5 hidden rounded bg-red-500 px-1 text-[9px] text-white group-hover:block">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => triggerUpload(selected.id, st, st)} className="flex h-10 w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-lg text-muted-foreground transition hover:border-foreground hover:text-foreground">+</button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[9px] text-muted-foreground">Полузакрыты — опционально. Без них — сразу закрывается.</p>
                </div>
              </div>
            ) : selected.isMouth ? (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Варианты рта по эмоциям
                </p>
                {FACE_EMOTIONS.map(emotion => {
                  const closedV = selected.variants.find(v => v.emotion === emotion && v.state === 'closed')
                  const openV   = selected.variants.find(v => v.emotion === emotion && v.state === 'open')
                  return (
                    <div key={emotion} className="rounded-xl border p-2">
                      <p className="mb-2 text-xs font-medium">{EMOTION_LABELS[emotion]}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['closed', 'mid', 'open'] as const).map(state => {
                          const v = selected.variants.find(vv => vv.emotion === emotion && vv.state === state)
                          return (
                            <div key={state} className="flex flex-col gap-1">
                              <p className="text-center text-[9px] text-muted-foreground">{STATE_LABELS[state]}</p>
                              {v ? (
                                <div className="group relative">
                                  <img
                                    src={v.src}
                                    alt={`${emotion} ${state}`}
                                    className="h-12 w-full cursor-pointer rounded-lg border-2 border-black object-contain"
                                    onClick={() => triggerUpload(selected.id, emotion, state)}
                                  />
                                  <button
                                    onClick={() => deleteVariant(selected.id, emotion, state)}
                                    className="absolute right-0.5 top-0.5 hidden rounded bg-red-500 px-1 text-[9px] text-white group-hover:block"
                                  >✕</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => triggerUpload(selected.id, emotion, state)}
                                  className="flex h-12 flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground transition hover:border-foreground hover:text-foreground"
                                >
                                  <span className="text-lg font-light leading-none">+</span>
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : selected.isEyes ? null : (
              /* Варианты обычного слоя */
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Варианты{selected.variants.length > 0 ? ` (${selected.variants.length})` : ''}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {selected.variants.map((v, idx) => (
                    <div
                      key={v.id}
                      onClick={() => setActiveSimple(selected.id, idx)}
                      className={`group relative cursor-pointer rounded-lg border-2 p-1 transition ${
                        idx === selected.activeIdx ? 'border-black' : 'border-transparent hover:border-muted-foreground/50'
                      }`}
                    >
                      <img src={v.src} alt={v.emotion} className="h-14 w-full object-contain" />
                      <p className="mt-0.5 truncate text-center text-[9px] text-muted-foreground">{v.emotion || '—'}</p>
                      <button
                        onClick={e => { e.stopPropagation(); deleteSimpleVariant(selected.id, v.id) }}
                        className="absolute right-0.5 top-0.5 hidden rounded bg-red-500 px-1 text-[9px] text-white group-hover:block"
                      >✕</button>
                    </div>
                  ))}
                  <button
                    onClick={() => triggerSimpleUpload(selected.id)}
                    className="flex h-19.5 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground transition hover:border-foreground hover:text-foreground"
                  >
                    <span className="text-2xl font-light leading-none">+</span>
                    <span className="text-[9px]">PNG</span>
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onSimpleFile} />
    </div>
  )
}
