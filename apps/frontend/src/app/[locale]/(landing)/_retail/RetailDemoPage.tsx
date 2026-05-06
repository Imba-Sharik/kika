"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  BarChart3, Gem, ShoppingCart, FileText, Users, Star, Ban, Clock, Search, ChefHat, X, Sparkles,
  Camera, CreditCard, DoorOpen, Check,
  Target, Dumbbell, Scale, Salad, Beef, Leaf, Utensils, Zap,
  type LucideIcon,
} from "lucide-react"
import { getAiBaseUrl } from "@/shared/api/strapi"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog"
import { YukaiCompanion } from "./YukaiCompanion"
import { PersonalizedBanner } from "./PersonalizedBanner"
import { PhotoCartButton } from "./PhotoCartButton"
import { SubscriptionSuggestions } from "./SubscriptionSuggestions"
import { PRODUCTS as PRODUCTS_GROCERY } from "./catalog"
import { PRODUCTS_OZON } from "./catalog-ozon"
import { parseWithClaude, searchRecipe } from "./api"
import {
  EMPTY_RESULT,
  type Product,
  type ParseResult,
  type RecipeResult,
  type DietGoal,
  type CookingPreference,
  type BannerFilter,
} from "./types"
import { BRANDS, type Brand } from "./brands"

const DIET_GOAL_META: Record<DietGoal, { icon: LucideIcon | null; label: string }> = {
  "none": { icon: null, label: "" },
  "lose-weight": { icon: Target, label: "Похудение" },
  "gain-muscle": { icon: Dumbbell, label: "Набор массы" },
  "balanced": { icon: Scale, label: "Сбалансированное" },
  "low-carb": { icon: Salad, label: "Низкоуглеводка" },
  "keto": { icon: Beef, label: "Кето" },
  "detox": { icon: Leaf, label: "Детокс" },
}

const COOKING_META: Record<CookingPreference, { icon: LucideIcon | null; label: string }> = {
  "none": { icon: null, label: "" },
  "ready": { icon: Utensils, label: "Только готовое" },
  "quick": { icon: Zap, label: "Минимум готовки" },
  "scratch": { icon: ChefHat, label: "Готовлю с нуля" },
}

type Props = { brandKey: Brand["key"] }

export function RetailDemoPage({ brandKey }: Props) {
  const brand = BRANDS[brandKey]
  const COLOR = brand.color
  // Каталог переключается по domain бренда: marketplace (Ozon) → товары маркетплейса,
  // иначе — продуктовый. Бэк параметризован тем же brand.key (см. vkusvill/controllers).
  const PRODUCTS = brand.domain === "marketplace" ? PRODUCTS_OZON : PRODUCTS_GROCERY
  const profileKey = `${brand.key}:profile:v3`

  const [query, setQuery] = useState("")
  const [recipeQuery, setRecipeQuery] = useState("")
  const [bannerFilter, setBannerFilter] = useState<BannerFilter | null>(null)
  const [photoToast, setPhotoToast] = useState<{
    summary: string
    found: number
    missing: string[]
  } | null>(null)
  const [subscriptions, setSubscriptions] = useState<Record<string, number>>({})

  const toggleSubscribe = (productId: string, everyDays: number) => {
    setSubscriptions(prev => {
      const next = { ...prev }
      if (next[productId]) delete next[productId]
      else next[productId] = everyDays
      return next
    })
  }
  const subscribeAll = (items: { id: string; everyDays: number }[]) => {
    setSubscriptions(prev => {
      const next = { ...prev }
      items.forEach(it => { next[it.id] = it.everyDays })
      return next
    })
  }
  const subscribedCount = Object.keys(subscriptions).length
  const [primeOpen, setPrimeOpen] = useState(false)
  const [primeScanBusy, setPrimeScanBusy] = useState(false)
  const [scannedItems, setScannedItems] = useState<{ id: string; qty: number }[]>([])
  const primeScanInputRef = useRef<HTMLInputElement | null>(null)

  const scannedTotal = scannedItems.reduce((sum, it) => {
    const p = PRODUCTS.find(x => x.id === it.id)
    return p ? sum + p.price * it.qty : sum
  }, 0)

  const handlePrimeScan = async (file: File) => {
    setPrimeScanBusy(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result ?? ""))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch(`${getAiBaseUrl()}/vkusvill/photo-cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: dataUrl,
          brand: brand.key,
          products: PRODUCTS.map(p => ({ id: p.id, name: p.name, category: p.category })),
        }),
      })
      if (!res.ok) throw new Error("scan failed")
      const data = (await res.json()) as { foundIds: string[]; missing: string[]; summary: string }
      if (data.foundIds.length > 0) {
        setScannedItems(prev => {
          const next = [...prev]
          data.foundIds.forEach(id => {
            const existing = next.find(it => it.id === id)
            if (existing) existing.qty += 1
            else next.push({ id, qty: 1 })
          })
          return next
        })
      }
      setPhotoToast({ summary: data.summary, found: data.foundIds.length, missing: data.missing })
      window.setTimeout(() => setPhotoToast(null), 4000)
    } catch (err) {
      console.warn("[prime-scan]", err)
      setPhotoToast({ summary: "Не удалось распознать товар", found: 0, missing: [] })
      window.setTimeout(() => setPhotoToast(null), 4000)
    } finally {
      setPrimeScanBusy(false)
    }
  }

  const [recipeResult, setRecipeResult] = useState<RecipeResult | null>(null)
  const [recipeStatus, setRecipeStatus] = useState<"idle" | "thinking" | "ready" | "error">("idle")
  const [cart, setCart] = useState<Record<string, number>>({})
  const [profileText, setProfileText] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await Promise.resolve()
      if (cancelled) return
      const saved = localStorage.getItem(profileKey)
      if (saved) setProfileText(saved)
    })()
    return () => { cancelled = true }
  }, [profileKey])

  useEffect(() => {
    localStorage.setItem(profileKey, profileText)
  }, [profileText, profileKey])

  const [aiResult, setAiResult] = useState<ParseResult>(EMPTY_RESULT)
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking" | "ready" | "error">("idle")

  const updateProfile = (next: string | ((prev: string) => string)) => {
    setProfileText(prevText => {
      const value = typeof next === "function" ? next(prevText) : next
      const trimmed = value.trim()
      if (!trimmed) {
        setAiResult(EMPTY_RESULT)
        setAiStatus("idle")
      } else {
        setAiStatus("thinking")
      }
      return value
    })
  }

  useEffect(() => {
    const trimmed = profileText.trim()
    if (!trimmed) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      const result = await parseWithClaude(trimmed, PRODUCTS, controller.signal, brand.key)
      if (controller.signal.aborted) return
      if (result) {
        setAiResult(result)
        setAiStatus("ready")
      } else {
        setAiStatus("error")
      }
    }, 800)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [profileText])

  const updateRecipeQuery = (next: string) => {
    setRecipeQuery(next)
    const trimmed = next.trim()
    if (!trimmed) {
      setRecipeResult(null)
      setRecipeStatus("idle")
    } else {
      setRecipeStatus("thinking")
    }
  }

  useEffect(() => {
    const trimmed = recipeQuery.trim()
    if (!trimmed) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      const result = await searchRecipe(trimmed, PRODUCTS, controller.signal, brand.key)
      if (controller.signal.aborted) return
      if (result) {
        setRecipeResult(result)
        setRecipeStatus("ready")
      } else {
        setRecipeStatus("error")
      }
    }, 700)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [recipeQuery])

  const { excludeIngredients, hideIds, favorIds, priceCaps, household, dietGoal, cookingPreference, recurring } = aiResult
  const hasKids = household.kidsAges.length > 0
  const exclude = useMemo(
    () => (hasKids && !excludeIngredients.includes("алкоголь") ? [...excludeIngredients, "алкоголь"] : excludeIngredients),
    [excludeIngredients, hasKids],
  )
  const favor = favorIds

  const violatesPriceCap = (p: Product): boolean =>
    priceCaps.some(cap => cap.category === p.category && p.price > cap.maxPrice)

  const violatesCookingPref = (p: Product): boolean => {
    if (cookingPreference === "ready") return !p.tags.includes("ready")
    if (cookingPreference === "quick") return !p.tags.includes("ready") && !p.tags.includes("quick")
    return false
  }

  const violatesDietGoal = (p: Product): boolean => {
    if (dietGoal === "low-carb" || dietGoal === "keto") return p.tags.includes("high-carb")
    if (dietGoal === "lose-weight") return p.tags.includes("high-carb") || p.ingredients.includes("сахар") || p.ingredients.includes("алкоголь")
    if (dietGoal === "detox") return p.ingredients.includes("алкоголь") || p.ingredients.includes("сахар") || p.ingredients.includes("кофеин")
    return false
  }

  const dietBoost = (p: Product): boolean => {
    if (dietGoal === "gain-muscle") return p.tags.includes("high-protein")
    if (dietGoal === "lose-weight" || dietGoal === "detox") return p.tags.includes("low-cal")
    return false
  }

  const recipeMode = recipeStatus === "ready" && recipeResult !== null && recipeResult.neededIds.length > 0

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = PRODUCTS.filter(p => {
      if (q && !p.name.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) {
        return false
      }
      if (recipeMode && !recipeResult!.neededIds.includes(p.id)) return false
      if (bannerFilter && !bannerFilter.productIds.includes(p.id)) return false
      if (hideIds.includes(p.id)) return false
      if (exclude.some(ex => p.ingredients.includes(ex))) return false
      if (violatesPriceCap(p)) return false
      if (violatesCookingPref(p)) return false
      if (violatesDietGoal(p)) return false
      return true
    })
    return list.sort((a, b) => {
      if (recipeMode) {
        const aIdx = recipeResult!.neededIds.indexOf(a.id)
        const bIdx = recipeResult!.neededIds.indexOf(b.id)
        return aIdx - bIdx
      }
      const aFav = favor.includes(a.id) ? 0 : 1
      const bFav = favor.includes(b.id) ? 0 : 1
      if (aFav !== bFav) return aFav - bFav
      const aBoost = dietBoost(a) ? 0 : 1
      const bBoost = dietBoost(b) ? 0 : 1
      return aBoost - bBoost
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, exclude, favor, hideIds, priceCaps, dietGoal, cookingPreference, recipeMode, recipeResult, bannerFilter])

  const hiddenByProfile = useMemo(
    () =>
      PRODUCTS.filter(
        p =>
          hideIds.includes(p.id) ||
          exclude.some(ex => p.ingredients.includes(ex)) ||
          violatesPriceCap(p) ||
          violatesCookingPref(p) ||
          violatesDietGoal(p),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exclude, hideIds, priceCaps, dietGoal, cookingPreference],
  )

  const favoredProducts = useMemo(
    () => PRODUCTS.filter(p => favor.includes(p.id)),
    [favor]
  )

  // Memo для children чтобы ref не менялся каждый рендер.
  // Иначе их useEffect пересрабатывают и баннер с фетчем не успевает закончить.
  const bannerProducts = useMemo(
    () => PRODUCTS.map(p => ({ id: p.id, name: p.name, category: p.category })),
    []
  )
  const subProducts = useMemo(
    () => PRODUCTS.map(p => ({
      id: p.id, name: p.name, emoji: p.emoji, price: p.price, unit: p.unit, category: p.category,
    })),
    []
  )

  const addToCart = (id: string) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }
  const removeFromCart = (id: string) => {
    setCart(prev => {
      const next = { ...prev }
      if (next[id] && next[id] > 1) next[id] -= 1
      else delete next[id]
      return next
    })
  }
  const cartTotal = useMemo(
    () =>
      Object.entries(cart).reduce((sum, [id, qty]) => {
        const p = PRODUCTS.find(x => x.id === id)
        return p ? sum + p.price * qty : sum
      }, 0),
    [cart]
  )
  const cartCount = useMemo(
    () => Object.values(cart).reduce((s, q) => s + q, 0),
    [cart]
  )

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? "")
      if (file.name.endsWith(".json")) {
        try {
          const data = JSON.parse(text)
          if (Array.isArray(data.exclude)) {
            const lines = data.exclude.map((e: string) => `- не ем ${e}`).join("\n")
            updateProfile(`# Мои предпочтения\n\n${lines}\n`)
          }
        } catch {}
      } else {
        updateProfile(text)
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="fixed inset-0 overflow-y-auto bg-white text-neutral-900">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="flex w-full items-center gap-4 px-8 py-4">
          <div className="text-2xl font-black tracking-tight" style={{ color: brand.logoColor ?? COLOR }}>
            {brand.nameLogo}
          </div>
          <a
            href="#business-impact"
            onClick={e => {
              e.preventDefault()
              document.getElementById("business-impact")?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
            className="hidden items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 md:flex"
          >
            <BarChart3 size={16} className="shrink-0" />
            <span>Business Impact</span>
          </a>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPrimeOpen(true)}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: COLOR }}
            >
              <Gem size={16} className="shrink-0" />
              <span>{brand.prime.name}</span>
              {subscribedCount > 0 && (
                <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold" style={{ color: COLOR }}>
                  {subscribedCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-sm">
              <ShoppingCart size={16} className="shrink-0" />
              <span className="font-medium">{cartCount}</span>
              <span className="text-neutral-500">·</span>
              <span className="font-semibold">{cartTotal} ₽</span>
            </div>
          </div>
        </div>
      </header>

      <main className="grid w-full gap-8 px-8 py-10 lg:grid-cols-[minmax(320px,28rem)_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-neutral-200">
            <div className="flex items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                  <FileText size={14} className="shrink-0" />
                  Мои предпочтения
                </span>
                {aiStatus === "thinking" && (
                  <span className="hidden items-center gap-1 text-xs text-neutral-500 sm:inline-flex">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
                    Claude думает…
                  </span>
                )}
                {aiStatus === "ready" && (
                  <span
                    className="hidden rounded-full px-2 py-0.5 text-[10px] font-bold text-white sm:inline"
                    style={{ backgroundColor: COLOR }}
                  >
                    Claude Sonnet 4.6
                  </span>
                )}
                {aiStatus === "error" && (
                  <span className="hidden text-xs text-red-500 sm:inline">
                    AI недоступен — попробуйте позже
                  </span>
                )}
                {aiStatus === "idle" && (
                  <span className="hidden text-xs text-neutral-500 sm:inline">
                    — фильтр обновляется по мере набора
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.json,.txt"
                onChange={handleLoad}
                className="hidden"
              />
            </div>

            <textarea
              value={profileText}
              onChange={e => updateProfile(e.target.value)}
              spellCheck={false}
              className="block h-[60vh] min-h-75 w-full resize-y bg-white px-5 py-4 font-mono text-sm leading-relaxed outline-none"
              placeholder={brand.profilePlaceholder}
            />

            {(favor.length > 0
              || exclude.length > 0
              || hideIds.length > 0
              || priceCaps.length > 0
              || household.householdSize > 0
              || household.kidsAges.length > 0
              || dietGoal !== "none"
              || cookingPreference !== "none"
              || recurring.length > 0) && (
              <div
                className="flex flex-col gap-2 px-5 py-3 text-sm"
                style={{ backgroundColor: `${COLOR}10` }}
              >
                {(household.householdSize > 0 || household.kidsAges.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Users size={14} className="shrink-0" />
                      Семья:
                    </span>
                    {household.householdSize > 0 && (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium ring-1 ring-neutral-200">
                        {household.householdSize} чел.
                      </span>
                    )}
                    {household.kidsAges.length > 0 && (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium ring-1 ring-neutral-200">
                        дети: {household.kidsAges.join(", ")} {household.kidsAges.length === 1 ? "год" : "лет"}
                      </span>
                    )}
                    {hasKids && (
                      <span className="text-xs text-neutral-600">
                        → алкоголь скрыт автоматически
                      </span>
                    )}
                  </div>
                )}
                {dietGoal !== "none" && (() => {
                  const { icon: DietIcon, label } = DIET_GOAL_META[dietGoal]
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">Цель:</span>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: COLOR }}
                      >
                        {DietIcon && <DietIcon size={14} className="shrink-0" />}
                        {label}
                      </span>
                    </div>
                  )
                })()}
                {cookingPreference !== "none" && (() => {
                  const { icon: CookIcon, label } = COOKING_META[cookingPreference]
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">Готовка:</span>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: COLOR }}
                      >
                        {CookIcon && <CookIcon size={14} className="shrink-0" />}
                        {label}
                      </span>
                    </div>
                  )
                })()}
                {recurring.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Clock size={14} className="shrink-0" />
                      Регулярно:
                    </span>
                    {recurring.map(r => (
                      <span
                        key={r.productHint}
                        className="rounded-full bg-white px-3 py-1 text-xs font-medium ring-1 ring-neutral-200"
                      >
                        {r.productHint} · каждые {r.everyDays} дн.
                      </span>
                    ))}
                  </div>
                )}
                {favor.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Star size={14} className="shrink-0 fill-current" style={{ color: COLOR }} />
                      Любимое:
                    </span>
                    {favoredProducts.map(p => (
                      <span
                        key={p.id}
                        className="rounded-full bg-white px-3 py-1 text-xs font-medium ring-1"
                        style={{ color: COLOR }}
                      >
                        {p.name}
                      </span>
                    ))}
                    <span className="ml-auto text-xs text-neutral-600">
                      ↑ {favor.length} в топ
                    </span>
                  </div>
                )}
                {(exclude.length > 0 || hideIds.length > 0 || priceCaps.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Ban size={14} className="shrink-0" />
                      Скрыто:
                    </span>
                    {exclude.map(ex => (
                      <span
                        key={`ing-${ex}`}
                        className="rounded-full px-3 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: COLOR }}
                      >
                        {ex}
                      </span>
                    ))}
                    {hideIds.map(id => {
                      const p = PRODUCTS.find(x => x.id === id)
                      if (!p) return null
                      return (
                        <span
                          key={`prod-${id}`}
                          className="rounded-full px-3 py-1 text-xs font-medium text-white"
                          style={{ backgroundColor: COLOR }}
                        >
                          {p.name}
                        </span>
                      )
                    })}
                    {priceCaps.map(cap => (
                      <span
                        key={`cap-${cap.category}`}
                        className="rounded-full px-3 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: COLOR }}
                      >
                        {cap.category} &gt; {cap.maxPrice}₽
                      </span>
                    ))}
                    <span className="ml-auto text-xs text-neutral-600">
                      −{hiddenByProfile.length}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          {!recipeMode && (
            <div
              className={`mb-8 grid gap-4 ${
                profileText.trim() ? "lg:grid-cols-2" : "lg:grid-cols-1"
              }`}
            >
              {profileText.trim() && (
                <PersonalizedBanner
                  mode="profile"
                  brandKey={brand.key}
                  brandColor={COLOR}
                  profileText={profileText}
                  products={bannerProducts}
                  onApplyFilter={setBannerFilter}
                />
              )}
              <PersonalizedBanner
                mode="hyperlocal"
                brandKey={brand.key}
                brandColor={COLOR}
                products={bannerProducts}
                onApplyFilter={setBannerFilter}
              />
            </div>
          )}

          {bannerFilter && (
            <div
              className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 text-sm"
              style={{ backgroundColor: `${COLOR}15` }}
            >
              <span className="font-medium">Фильтр от баннера:</span>
              <span
                className="rounded-full px-3 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: COLOR }}
              >
                {bannerFilter.title} · {bannerFilter.productIds.length} товаров
              </span>
              <button
                onClick={() => setBannerFilter(null)}
                className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200 transition hover:ring-neutral-400"
              >
                Сбросить ×
              </button>
            </div>
          )}

          <h1 className="mb-2 text-3xl font-bold">{brand.hero.title}</h1>
          <p className="mb-6 text-neutral-500">{brand.hero.subtitle}</p>

          <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_2.5fr_1.2fr]">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Найти товар…"
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-base outline-none transition focus:border-neutral-900 focus:bg-white"
              />
              <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-neutral-400">
                <Search size={18} />
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={recipeQuery}
                onChange={e => updateRecipeQuery(e.target.value)}
                placeholder={brand.recipePlaceholder ?? "Что готовите? AI подберёт продукты — например, «хочу приготовить блины»"}
                className="w-full rounded-2xl border-2 px-5 py-4 text-base outline-none transition focus:bg-white"
                style={{
                  borderColor: recipeQuery ? COLOR : "#e5e5e5",
                  backgroundColor: recipeQuery ? `${COLOR}08` : "#fafafa",
                }}
              />
              {recipeQuery && (
                <button
                  onClick={() => updateRecipeQuery("")}
                  className="absolute right-5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-200 hover:bg-neutral-300"
                  aria-label="Очистить"
                >
                  <X size={12} />
                </button>
              )}
              {!recipeQuery && (
                <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-neutral-400">
                  <Sparkles size={18} />
                </span>
              )}
            </div>

            <PhotoCartButton
              brandColor={COLOR}
              brand={brand.key}
              label={brand.photoCart?.label}
              presets={brand.photoCart?.presets}
              products={bannerProducts}
              onResult={result => {
                if (result.foundIds.length > 0) {
                  setCart(prev => {
                    const next = { ...prev }
                    result.foundIds.forEach(id => {
                      next[id] = (next[id] ?? 0) + 1
                    })
                    return next
                  })
                }
                setPhotoToast({
                  summary: result.summary,
                  found: result.foundIds.length,
                  missing: result.missing,
                })
                window.setTimeout(() => setPhotoToast(null), 6000)
              }}
            />
          </div>

          {recipeStatus === "thinking" && (
            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-3 text-sm text-neutral-500">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
              Claude подбирает продукты под ваш запрос…
            </div>
          )}

          {recipeStatus === "ready" && recipeResult && (
            <div
              className="mb-6 flex flex-col gap-2 rounded-2xl border-2 px-5 py-4 text-sm"
              style={{ borderColor: COLOR, backgroundColor: `${COLOR}10` }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 text-base font-bold">
                  <ChefHat size={18} className="shrink-0" />
                  {recipeResult.recipeName || "Подобрано по запросу"}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium ring-1 ring-neutral-200">
                  {recipeResult.neededIds.length} товаров в наличии
                </span>
                {recipeResult.missingItems.length > 0 && (
                  <span className="text-xs text-neutral-600">
                    нет в магазине: {recipeResult.missingItems.join(", ")}
                  </span>
                )}
              </div>
              {recipeResult.neededIds.length > 0 && (
                <button
                  onClick={() => {
                    recipeResult.neededIds.forEach(id => addToCart(id))
                  }}
                  className="self-start rounded-full px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: COLOR }}
                >
                  Добавить всё в корзину →
                </button>
              )}
            </div>
          )}

          {recipeStatus === "error" && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600">
              Не удалось подобрать. Попробуйте переформулировать.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filtered.map(p => {
              const qty = cart[p.id] ?? 0
              const isFavored = favor.includes(p.id)
              return (
                <div
                  key={p.id}
                  className="group relative flex flex-col rounded-2xl border bg-white p-4 transition hover:shadow-sm"
                  style={{
                    borderColor: isFavored ? COLOR : undefined,
                    boxShadow: isFavored ? `0 0 0 1px ${COLOR}` : undefined,
                  }}
                >
                  {isFavored && (
                    <span
                      className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: COLOR }}
                    >
                      <Star size={12} className="fill-current" />
                    </span>
                  )}
                  <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-neutral-50 text-5xl">
                    {p.emoji}
                  </div>
                  <div className="mb-1 text-xs uppercase tracking-wide text-neutral-400">
                    {p.category}
                  </div>
                  <div className="mb-1 line-clamp-2 text-sm font-medium leading-tight">
                    {p.name}
                  </div>
                  <div className="mb-3 text-xs text-neutral-500">{p.unit}</div>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <div className="text-lg font-bold">{p.price} ₽</div>
                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(p.id)}
                        className="rounded-full px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
                        style={{ backgroundColor: COLOR }}
                      >
                        +
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-1">
                        <button
                          onClick={() => removeFromCart(p.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-700 hover:bg-white"
                        >
                          −
                        </button>
                        <span className="min-w-[1ch] text-center text-sm font-semibold">
                          {qty}
                        </span>
                        <button
                          onClick={() => addToCart(p.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-white"
                          style={{ backgroundColor: COLOR }}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-neutral-300 py-16 text-center text-neutral-500">
              Ничего не нашлось
            </div>
          )}

          <section id="business-impact" className="mt-16">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ backgroundColor: COLOR }}
              >
                AI · ROI
              </span>
              <span className="text-xs font-medium text-neutral-700">
                {brand.benchmarksLabel}
              </span>
            </div>
            <h2 className="flex items-center gap-2 text-3xl font-bold leading-tight">
              <BarChart3 size={28} className="shrink-0" />
              Business Impact
            </h2>
            <p className="mt-2 max-w-3xl text-base text-neutral-700">
              Ожидаемое влияние каждой AI-фичи на ключевые метрики ритейла —
              на основе production-данных международных компаний (2024-2026).
              Полная ROI-модель по запросу.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {brand.businessImpact.map(item => (
                <div
                  key={item.feature}
                  className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:shadow-sm"
                >
                  <div
                    className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${COLOR}15`, color: COLOR }}
                  >
                    <item.Icon size={22} />
                  </div>
                  <div className="text-sm font-bold text-neutral-900">{item.feature}</div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black" style={{ color: COLOR }}>
                      {item.metric}
                    </span>
                    <span className="text-sm font-semibold text-neutral-700">
                      {item.metricLabel}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">{item.desc}</p>
                  <div className="mt-3 border-t border-neutral-100 pt-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Источник
                    </div>
                    <div className="mt-0.5 text-[11px] leading-snug text-neutral-500">
                      {item.source}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="mt-6 grid gap-4 rounded-2xl border-2 p-6 sm:grid-cols-[1fr_auto]"
              style={{ borderColor: COLOR, backgroundColor: `${COLOR}08` }}
            >
              <div>
                <div className="mb-1 text-xs font-bold uppercase tracking-wider" style={{ color: COLOR }}>
                  Совокупный эффект на годовом масштабе
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
                  {brand.totalImpact.headline}
                </h3>
                <p className="mt-2 text-base text-neutral-700">
                  Расчёт: {brand.totalImpact.calculation}.
                  Включает <b>±50% доверительный интервал</b> на benchmark-зависимости.
                </p>
                <p className="mt-2 text-sm text-neutral-600">
                  Производственные A/B-тесты у конкурентов показывают 60-90% от прогнозных uplift'ов в первые 6 месяцев.
                </p>
              </div>
              <div className="flex flex-col items-start justify-center gap-2 sm:items-end">
                <div className="text-sm font-medium text-neutral-600">Payback period</div>
                <div className="text-2xl font-bold text-neutral-900">{brand.totalImpact.payback}</div>
                <div className="text-sm font-medium text-neutral-600">Implementation cost</div>
                <div className="text-2xl font-bold text-neutral-900">{brand.totalImpact.cost}</div>
              </div>
            </div>
          </section>
        </section>
      </main>

      <YukaiCompanion
        brandKey={brand.key}
        brandColor={COLOR}
        onProfileAppend={text => {
          updateProfile(prev => {
            const trimmed = prev.trimEnd()
            return trimmed ? `${trimmed}\n${text}` : text
          })
        }}
        onRecipeQuery={q => updateRecipeQuery(q)}
      />

      <Dialog open={primeOpen} onOpenChange={setPrimeOpen}>
        <DialogContent
          showCloseButton
          className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
        >
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2 text-xl">
              <Gem size={22} className="shrink-0" style={{ color: COLOR }} />
              {brand.prime.name}
              <span
                className="rounded-full px-3 py-1 text-xs font-bold text-white"
                style={{ backgroundColor: COLOR }}
              >
                {brand.prime.price} ₽/мес
              </span>
              <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                {brand.prime.badge}
              </span>
            </DialogTitle>
            <p className="mt-1 text-xs font-normal text-neutral-500">
              {brand.prime.subtitle}
            </p>
          </DialogHeader>

          <div
            className="mb-2 grid gap-3 rounded-2xl p-4 sm:grid-cols-3"
            style={{ backgroundColor: `${COLOR}10` }}
          >
            {brand.prime.benefits.map(b => (
              <div key={b.title} className="flex items-start gap-2">
                <b.Icon size={20} className="mt-0.5 shrink-0" style={{ color: COLOR }} />
                <div>
                  <div className="text-sm font-bold text-neutral-900">{b.title}</div>
                  <div className="text-xs text-neutral-600">{b.subtitle}</div>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mb-4 overflow-hidden rounded-2xl border-2"
            style={{ borderColor: COLOR, backgroundColor: `${COLOR}05` }}
          >
            <div className="flex flex-wrap items-center gap-3 px-4 pt-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{ backgroundColor: COLOR }}>
                <Camera size={22} />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-neutral-900">Scan &amp; Go</span>
                  <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                    Prime exclusive
                  </span>
                </div>
                <div className="text-xs text-neutral-600">Самостоятельная оплата в магазине</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1 border-t border-b px-4 py-2 text-[11px] text-neutral-600" style={{ borderColor: `${COLOR}30` }}>
              <div className="flex items-center gap-1.5">
                <span className="font-bold" style={{ color: COLOR }}>1.</span>
                <span className="inline-flex items-center gap-1">
                  Сканируй с полки <Camera size={12} className="shrink-0" />
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold" style={{ color: COLOR }}>2.</span>
                <span className="inline-flex items-center gap-1">
                  Оплачивай в приложении <CreditCard size={12} className="shrink-0" />
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold" style={{ color: COLOR }}>3.</span>
                <span className="inline-flex items-center gap-1">
                  Выходи мимо касс <DoorOpen size={12} className="shrink-0" />
                </span>
              </div>
            </div>

            {scannedItems.length > 0 && (
              <div className="border-b px-4 py-3" style={{ borderColor: `${COLOR}30` }}>
                <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  В пакете ({scannedItems.reduce((s, it) => s + it.qty, 0)})
                </div>
                <div className="flex flex-col gap-1.5">
                  {scannedItems.map(it => {
                    const p = PRODUCTS.find(x => x.id === it.id)
                    if (!p) return null
                    return (
                      <div key={it.id} className="flex items-center gap-2 text-sm">
                        <span className="text-lg">{p.emoji}</span>
                        <span className="flex-1 truncate">{p.name}</span>
                        {it.qty > 1 && <span className="text-xs text-neutral-500">×{it.qty}</span>}
                        <span className="font-medium">{p.price * it.qty} ₽</span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm" style={{ borderColor: `${COLOR}30` }}>
                  <span className="text-neutral-600">Итого</span>
                  <span className="text-base font-bold">{scannedTotal} ₽</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 p-4">
              <button
                onClick={() => primeScanInputRef.current?.click()}
                disabled={primeScanBusy}
                className="flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-default disabled:opacity-70"
                style={{ backgroundColor: COLOR }}
              >
                {primeScanBusy ? (
                  "Распознаю…"
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Camera size={16} className="shrink-0" />
                    {scannedItems.length > 0 ? "Сканировать ещё" : "Начать сканирование"}
                  </span>
                )}
              </button>
              {scannedItems.length > 0 && (
                <button
                  onClick={() => {
                    setPhotoToast({
                      summary: `Оплачено ${scannedTotal}₽ — выходите мимо касс`,
                      found: scannedItems.reduce((s, it) => s + it.qty, 0),
                      missing: [],
                    })
                    window.setTimeout(() => setPhotoToast(null), 6000)
                    setScannedItems([])
                    setPrimeOpen(false)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-neutral-700"
                >
                  <Check size={16} className="shrink-0" />
                  Оплатить · {scannedTotal} ₽
                </button>
              )}
            </div>
          </div>
          <input
            ref={primeScanInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={e => {
              const file = e.target.files?.[0]
              e.target.value = ""
              if (file) handlePrimeScan(file)
            }}
            className="hidden"
          />

          <SubscriptionSuggestions
            brandColor={COLOR}
            products={subProducts}
            recurring={recurring}
            subscribed={subscriptions}
            onToggleSubscribe={toggleSubscribe}
            onSubscribeAll={subscribeAll}
          />
        </DialogContent>
      </Dialog>

      {photoToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-neutral-200">
          <div className="mb-1 flex items-center gap-2">
            <Camera size={18} className="shrink-0" style={{ color: COLOR }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: COLOR }}>
              AI · фото-распознавание
            </span>
            <button
              onClick={() => setPhotoToast(null)}
              className="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-neutral-900">{photoToast.summary}</p>
          {photoToast.found > 0 && (
            <p className="mt-1 text-xs text-neutral-500">
              ↓ Добавлено {photoToast.found} {photoToast.found === 1 ? "товар" : "товаров"} в корзину
            </p>
          )}
          {photoToast.missing.length > 0 && (
            <p className="mt-1 text-xs text-neutral-500">
              Нет в магазине: {photoToast.missing.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
