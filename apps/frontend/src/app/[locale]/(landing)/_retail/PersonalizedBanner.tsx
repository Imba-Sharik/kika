"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin } from "lucide-react"
import { getAiBaseUrl, getAssetBaseUrl } from "@/shared/api/strapi"
import { useHyperlocalContext, type HyperlocalContext } from "./useHyperlocalContext"

type BannerMode = "profile" | "hyperlocal"

type BannerData = {
  imageUrl: string
  headline: string
  subheadline: string
  cta: string
  productIds: string[]
}

type CacheEntry = { hash: string; data: BannerData; ts: number }
type CacheStore = Record<string, CacheEntry>

function hashText(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
  }
  return hash.toString(36)
}

function buildCacheKey(mode: BannerMode, profile: string, ctx: HyperlocalContext | null): string {
  if (mode === "profile") return `p::${hashText(profile)}`
  if (!ctx) return ""
  const tempBucket = Math.round(ctx.temperature / 5) * 5
  return `h::${hashText(`${ctx.city}|${tempBucket}|${ctx.weatherCode}|${ctx.partOfDay}`)}`
}

function loadCached(cacheKey: string, key: string): BannerData | null {
  if (!key) return null
  try {
    const raw = localStorage.getItem(cacheKey)
    if (!raw) return null
    const store: CacheStore = JSON.parse(raw)
    const entry = store[key]
    if (!entry) return null
    if (Date.now() - entry.ts > 7 * 24 * 60 * 60 * 1000) return null
    return entry.data
  } catch {
    return null
  }
}

function saveCached(cacheKey: string, key: string, data: BannerData) {
  if (!key) return
  try {
    const raw = localStorage.getItem(cacheKey)
    const store: CacheStore = raw ? JSON.parse(raw) : {}
    store[key] = { hash: key, data, ts: Date.now() }
    localStorage.setItem(cacheKey, JSON.stringify(store))
  } catch {}
}

export type BannerProduct = { id: string; name: string; category?: string }

type Props = {
  mode: BannerMode
  brandKey: string
  brandColor: string
  profileText?: string
  products?: BannerProduct[]
  onApplyFilter?: (filter: { source: BannerMode; title: string; productIds: string[] }) => void
}

export function PersonalizedBanner({ mode, brandKey, brandColor, profileText = "", products, onApplyFilter }: Props) {
  // v4: бэк теперь возвращает imageUrl как `/api/img?url=...` (proxy для fal.media).
  // Прежние v3-кэши с прямыми fal-ссылками не грузятся в РФ без VPN — инвалидируем.
  const cacheKey = `${brandKey}:banner:v4`
  const [banner, setBanner] = useState<BannerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const lastHashRef = useRef<string | null>(null)
  const { context: hyperlocal } = useHyperlocalContext()

  const trimmedProfile = profileText.trim()
  const hasInput =
    mode === "profile" ? trimmedProfile.length > 0 : hyperlocal !== null

  useEffect(() => {
    if (!hasInput) {
      setBanner(null)
      setError(false)
      return
    }

    const hash = buildCacheKey(mode, trimmedProfile, hyperlocal)
    if (!hash) return
    if (hash === lastHashRef.current) return

    const cached = loadCached(cacheKey, hash)
    if (cached) {
      setBanner(cached)
      setError(false)
      lastHashRef.current = hash
      return
    }

    setLoading(true)
    setError(false)
    const controller = new AbortController()
    // Debounce: для profile нужно 1.5с (юзер печатает), для hyperlocal — почти сразу.
    const debounceMs = mode === "profile" ? 1500 : 200
    const timer = window.setTimeout(async () => {
      try {
        const body: Record<string, unknown> = { mode }
        if (mode === "profile") {
          body.profile = trimmedProfile
        } else if (hyperlocal) {
          body.context = {
            city: hyperlocal.city,
            country: hyperlocal.country,
            temperature: hyperlocal.temperature,
            weatherDesc: hyperlocal.weatherDesc,
            partOfDay: hyperlocal.partOfDay,
            hour: hyperlocal.hour,
          }
        }
        if (products && products.length > 0) {
          body.products = products
        }

        const res = await fetch(`${getAiBaseUrl()}/vkusvill/banner`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error("banner failed")
        const raw = await res.json()
        const data: BannerData = {
          imageUrl: raw.imageUrl,
          headline: raw.headline,
          subheadline: raw.subheadline,
          cta: raw.cta,
          productIds: Array.isArray(raw.productIds) ? raw.productIds : [],
        }
        if (controller.signal.aborted) return
        setBanner(data)
        saveCached(cacheKey, hash, data)
        lastHashRef.current = hash
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(true)
          console.warn("[banner]", err)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, debounceMs)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [mode, trimmedProfile, hyperlocal, hasInput, cacheKey, products])

  if (!hasInput) return null

  if (loading && !banner) {
    return (
      <div
        className="flex aspect-video w-full max-h-64 items-center justify-center overflow-hidden rounded-2xl"
        style={{ backgroundColor: `${brandColor}10` }}
      >
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" style={{ animationDelay: "0.2s" }} />
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" style={{ animationDelay: "0.4s" }} />
          <span className="ml-1">
            {mode === "profile" ? "Подбираем под ваш профиль…" : "Подбираем под погоду…"}
          </span>
        </div>
      </div>
    )
  }

  if (error || !banner) return null

  const modeBadge = mode === "profile" ? "AI · персональный" : "AI · гиперлокальный"
  // Бэк отдаёт относительный `/api/img?url=...` — префиксим origin'ом бэка.
  // Старые v3-кэши уже инвалидированы (cacheKey bump), но абсолютный URL обрабатываем
  // на всякий случай, чтобы не моргнуло на проде в момент деплоя.
  const imgSrc = banner.imageUrl.startsWith("/")
    ? `${getAssetBaseUrl()}${banner.imageUrl}`
    : banner.imageUrl

  return (
    <section className="relative overflow-hidden rounded-2xl shadow-sm">
      <img
        src={imgSrc}
        alt={banner.headline}
        className="aspect-video w-full max-h-72 object-cover"
        draggable={false}
      />
      <div className="absolute inset-y-4 right-4 flex max-w-md flex-col justify-center gap-3 rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-black/5 backdrop-blur-sm sm:inset-y-6 sm:right-6 sm:p-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: brandColor }}
          >
            {modeBadge}
          </span>
          <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            fal.ai
          </span>
          {mode === "hyperlocal" && hyperlocal && (() => {
            const WeatherIcon = hyperlocal.weatherIcon
            return (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-700 ring-1 ring-neutral-200">
                <MapPin size={11} className="shrink-0" />
                {hyperlocal.city}
                <span className="mx-0.5 text-neutral-300">·</span>
                <WeatherIcon size={11} className="shrink-0" />
                {hyperlocal.temperature > 0 ? `+${hyperlocal.temperature}` : hyperlocal.temperature}°
              </span>
            )
          })()}
        </div>
        <h2 className="text-xl font-bold leading-tight text-neutral-900 sm:text-2xl">
          {banner.headline}
        </h2>
        <p className="text-sm leading-relaxed text-neutral-700">
          {banner.subheadline}
        </p>
        {(banner.productIds?.length ?? 0) > 0 && onApplyFilter && (
          <button
            onClick={() =>
              onApplyFilter({
                source: mode,
                title: banner.headline,
                productIds: banner.productIds ?? [],
              })
            }
            className="mt-1 self-start rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: brandColor }}
          >
            {banner.cta || "Выбрать"}
          </button>
        )}
      </div>
    </section>
  )
}
