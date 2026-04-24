'use client'

import { useEffect, useRef, useState } from 'react'
import { EMOTIONS, type Emotion } from '@/shared/kika/persona'
import {
  loadEmotionOverrides,
  saveEmotionOverrides,
  resetEmotionOverride,
  type EmotionOverrides,
} from '@/shared/kika/emotion-overrides'
import {
  loadCustomEmotions,
  saveCustomEmotions,
  type CustomEmotion,
} from '@/shared/kika/custom-emotions'
import { KikaFace } from '@/widgets/kika-face/KikaFace'

const DEFAULT_SRC: Record<string, string> = {
  neutral: '/kika/emotions/neutral.png',
  happy: '/kika/emotions/happy.png',
  excited: '/kika/emotions/excited.png',
  love: '/kika/emotions/love.png',
  wink: '/kika/emotions/wink.png',
  thinking: '/kika/emotions/thinking.png',
  listening: '/kika/emotions/listening.png',
  confused: '/kika/emotions/confused.png',
  surprised: '/kika/emotions/surprised.png',
  alert: '/kika/emotions/alert.png',
  flustered: '/kika/emotions/flustered.png',
  worried: '/kika/emotions/worried.png',
  sad: '/kika/emotions/sad.png',
  upset: '/kika/emotions/upset.png',
  crying: '/kika/emotions/crying.png',
  angry: '/kika/emotions/angry.png',
  sleeping: '/kika/emotions/sleeping.png',
}

type EditTarget = { id: string; isCustom: boolean }

export default function EmotionEditorPage() {
  const [overrides, setOverrides] = useState<EmotionOverrides>({})
  const [customEmotions, setCustomEmotions] = useState<CustomEmotion[]>([])
  const [editing, setEditing] = useState<EditTarget | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [previewEmotion, setPreviewEmotion] = useState<string>('neutral')
  const [newId, setNewId] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setOverrides(loadEmotionOverrides())
    setCustomEmotions(loadCustomEmotions())
  }, [])

  const allOverrides: EmotionOverrides = {
    ...overrides,
    ...Object.fromEntries(customEmotions.map((c) => [c.id, c.src])),
  }

  function currentSrc(id: string): string {
    return overrides[id] ?? DEFAULT_SRC[id] ?? ''
  }

  function openEditor(id: string, isCustom: boolean) {
    setEditing({ id, isCustom })
    setUrlInput(isCustom ? '' : (overrides[id] ?? ''))
    setPreview(isCustom ? customEmotions.find((c) => c.id === id)?.src ?? null : overrides[id] ?? null)
    setPreviewEmotion(id)
  }

  function closeEditor() {
    setEditing(null)
    setUrlInput('')
    setPreview(null)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    readFile(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  function readFile(file: File) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string)
      setUrlInput('')
    }
    reader.readAsDataURL(file)
  }

  function onUrlChange(url: string) {
    setUrlInput(url)
    setPreview(url || null)
  }

  function saveEdit() {
    if (!editing || !preview) return
    if (editing.isCustom) {
      const next = customEmotions.map((c) =>
        c.id === editing.id ? { ...c, src: preview } : c,
      )
      setCustomEmotions(next)
      saveCustomEmotions(next)
    } else {
      const next = { ...overrides, [editing.id]: preview }
      setOverrides(next)
      saveEmotionOverrides(next)
    }
    closeEditor()
  }

  function resetBuiltin(id: string) {
    const next = resetEmotionOverride(id, overrides)
    setOverrides(next)
    saveEmotionOverrides(next)
    if (editing?.id === id) closeEditor()
  }

  function deleteCustom(id: string) {
    const next = customEmotions.filter((c) => c.id !== id)
    setCustomEmotions(next)
    saveCustomEmotions(next)
    if (editing?.id === id) closeEditor()
  }

  function addCustom() {
    const id = newId.trim().toLowerCase().replace(/\s+/g, '_')
    const label = newLabel.trim()
    if (!id || !label || !preview) return
    if (customEmotions.some((c) => c.id === id) || EMOTIONS.includes(id as Emotion)) return
    const next = [...customEmotions, { id, label, src: preview }]
    setCustomEmotions(next)
    saveCustomEmotions(next)
    setNewId('')
    setNewLabel('')
    setPreview(null)
    setUrlInput('')
    setShowNewForm(false)
  }

  const DropZone = ({ onFile }: { onFile: (f: File) => void }) => (
    <div
      className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-500"
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
    >
      <span className="text-2xl">🖼</span>
      <span>Перетащи файл или кликни</span>
      <span className="text-xs text-gray-400">PNG, GIF, WebP, APNG</span>
    </div>
  )

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Редактор эмоций</h1>
          <p className="text-sm text-gray-500">PNG, GIF, WebP, APNG — изменения хранятся локально</p>
        </div>
        <button
          onClick={() => { setShowNewForm(true); setEditing(null) }}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white"
        >
          + Новая эмоция
        </button>
      </div>

      {/* Встроенные эмоции */}
      <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">Встроенные</h2>
      <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {EMOTIONS.map((emotion) => {
          const hasOverride = !!overrides[emotion]
          const isActive = editing?.id === emotion
          return (
            <div
              key={emotion}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition ${
                isActive ? 'border-black ring-2 ring-black' : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <div className="relative">
                <img src={currentSrc(emotion)} alt={emotion} className="h-20 w-20 rounded-lg object-contain" />
                {hasOverride && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] text-white">custom</span>
                )}
              </div>
              <span className="text-xs font-medium text-gray-700">{emotion}</span>
              <div className="flex gap-1">
                <button onClick={() => openEditor(emotion, false)} className="rounded bg-black px-2 py-1 text-[10px] text-white">изменить</button>
                {hasOverride && (
                  <button onClick={() => resetBuiltin(emotion)} className="rounded border border-red-400 px-2 py-1 text-[10px] text-red-600">сброс</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Кастомные эмоции */}
      {customEmotions.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">Кастомные</h2>
          <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {customEmotions.map((c) => {
              const isActive = editing?.id === c.id
              return (
                <div
                  key={c.id}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition ${
                    isActive ? 'border-black ring-2 ring-black' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <img src={c.src} alt={c.id} className="h-20 w-20 rounded-lg object-contain" />
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-700">{c.label}</div>
                    <div className="font-mono text-[10px] text-gray-400">[{c.id}]</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditor(c.id, true)} className="rounded bg-black px-2 py-1 text-[10px] text-white">изменить</button>
                    <button onClick={() => deleteCustom(c.id)} className="rounded border border-red-400 px-2 py-1 text-[10px] text-red-600">удалить</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Форма добавления новой */}
      {showNewForm && (
        <div className="mb-6 rounded-xl border p-6">
          <h2 className="mb-4 text-lg font-semibold">Новая эмоция</h2>
          <div className="flex gap-6">
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs text-gray-500">Тег (латиница, без пробелов)</label>
                  <input
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="например: bored"
                    className="rounded border px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs text-gray-500">Название</label>
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="например: скучает"
                    className="rounded border px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <DropZone onFile={readFile} />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">или URL</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <input type="url" value={urlInput} onChange={(e) => onUrlChange(e.target.value)} placeholder="https://..." className="rounded border px-3 py-2 font-mono text-sm" />
              <div className="flex gap-2">
                <button
                  onClick={addCustom}
                  disabled={!newId.trim() || !newLabel.trim() || !preview}
                  className="flex-1 rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-40"
                >
                  Добавить
                </button>
                <button onClick={() => { setShowNewForm(false); setPreview(null); setUrlInput('') }} className="rounded border px-4 py-2 text-sm">
                  Отмена
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-gray-500">Превью</span>
              {preview
                ? <img src={preview} alt="preview" className="h-40 w-40 rounded-xl object-contain border" />
                : <div className="flex h-40 w-40 items-center justify-center rounded-xl border-2 border-dashed text-gray-300 text-sm">нет превью</div>
              }
            </div>
          </div>
        </div>
      )}

      {/* Редактор существующей */}
      {editing && (
        <div className="rounded-xl border p-6">
          <h2 className="mb-4 text-lg font-semibold">
            Редактировать:{' '}
            <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-sm">[{editing.id}]</span>
          </h2>
          <div className="flex gap-8">
            <div className="flex flex-1 flex-col gap-3">
              <DropZone onFile={readFile} />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">или URL</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <input type="url" value={urlInput} onChange={(e) => onUrlChange(e.target.value)} placeholder="https://..." className="rounded border px-3 py-2 font-mono text-sm" />
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={!preview} className="flex-1 rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-40">Сохранить</button>
                <button onClick={closeEditor} className="rounded border px-4 py-2 text-sm">Отмена</button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <span className="text-sm text-gray-500">Превью</span>
              {preview
                ? <img src={preview} alt="preview" className="h-40 w-40 rounded-xl border object-contain" />
                : <div className="flex h-40 w-40 items-center justify-center rounded-xl border-2 border-dashed text-gray-300 text-sm">нет превью</div>
              }
              <span className="mt-2 text-xs text-gray-500">В интерфейсе</span>
              <KikaFace
                emotion={EMOTIONS.includes(previewEmotion as Emotion) ? previewEmotion as Emotion : 'neutral'}
                overrides={preview ? { ...allOverrides, [editing.id]: preview } : allOverrides}
                size={160}
              />
              <div className="flex gap-1">
                {(['neutral', 'happy', 'excited', 'sad'] as Emotion[]).map((e) => (
                  <button key={e} onClick={() => setPreviewEmotion(e)} className={`rounded px-2 py-1 text-[10px] ${previewEmotion === e ? 'bg-black text-white' : 'border'}`}>{e}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
