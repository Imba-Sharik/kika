"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Upload } from "lucide-react"
import { getAiBaseUrl } from "@/shared/api/strapi"

const PRESETS = [
  { src: "/yukai/fridge-samples/1.jpg", label: "Молочка" },
  { src: "/yukai/fridge-samples/2.webp", label: "Напитки" },
  { src: "/yukai/fridge-samples/3.jpg", label: "Перекус" },
]

export type PhotoCartProduct = { id: string; name: string; category?: string }

type PhotoCartResult = {
  foundIds: string[]
  missing: string[]
  summary: string
}

type Props = {
  brandColor: string
  products: PhotoCartProduct[]
  onResult: (result: PhotoCartResult) => void
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function compressImage(dataUrl: string, maxSize = 1280): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
      if (ratio === 1) {
        resolve(dataUrl)
        return
      }
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL("image/jpeg", 0.85))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export function PhotoCartButton({ brandColor, products, onResult }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [menuOpen])

  const processImage = async (dataUrl: string) => {
    setBusy(true)
    setMenuOpen(false)
    try {
      const compressed = await compressImage(dataUrl)
      const res = await fetch(`${getAiBaseUrl()}/vkusvill/photo-cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressed, products }),
      })
      if (!res.ok) throw new Error("photo-cart failed")
      const data = (await res.json()) as PhotoCartResult
      onResult(data)
    } catch (err) {
      console.warn("[photo-cart]", err)
      onResult({ foundIds: [], missing: [], summary: "Не удалось распознать фото. Попробуйте другое." })
    } finally {
      setBusy(false)
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    await processImage(dataUrl)
  }

  const handlePreset = async (src: string) => {
    try {
      const res = await fetch(src)
      if (!res.ok) throw new Error("preset fetch failed")
      const blob = await res.blob()
      const dataUrl = await fileToDataUrl(blob)
      await processImage(dataUrl)
    } catch (err) {
      console.warn("[photo-cart] preset failed", err)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => {
          if (busy) return
          setMenuOpen(o => !o)
        }}
        disabled={busy}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border-2 px-5 py-4 text-left text-base outline-none transition hover:bg-white disabled:cursor-default disabled:opacity-70"
        style={{
          borderColor: busy || menuOpen ? brandColor : "#e5e5e5",
          backgroundColor: busy || menuOpen ? `${brandColor}08` : "#fafafa",
        }}
        title="Сфотографируйте или выберите готовое фото"
        aria-label="Фото-распознавание"
      >
        <span className="truncate text-neutral-500">
          {busy ? "Распознаю фото…" : "Сфоткай холодильник"}
        </span>
        {busy ? (
          <span className="flex items-center gap-0.5">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: brandColor }} />
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: brandColor, animationDelay: "0.2s" }} />
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: brandColor, animationDelay: "0.4s" }} />
          </span>
        ) : (
          <Camera size={20} className="shrink-0" style={{ color: brandColor }} />
        )}
      </button>

      {menuOpen && !busy && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-neutral-200">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-neutral-50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
              <Upload size={18} />
            </span>
            <div className="flex flex-col">
              <span className="font-medium text-neutral-900">Загрузить фото</span>
              <span className="text-xs text-neutral-500">Камера или из галереи</span>
            </div>
          </button>

          <div className="border-t border-neutral-100 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Или из последних
          </div>

          <div className="grid grid-cols-3 gap-2 px-3 pb-3">
            {PRESETS.map(p => (
              <button
                key={p.src}
                onClick={() => handlePreset(p.src)}
                className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-neutral-200 transition hover:ring-2"
                style={{ ["--tw-ring-color" as string]: brandColor }}
                title={p.label}
              >
                <img
                  src={p.src}
                  alt={p.label}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  draggable={false}
                />
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-1.5 py-1 text-[10px] font-medium text-white">
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}
