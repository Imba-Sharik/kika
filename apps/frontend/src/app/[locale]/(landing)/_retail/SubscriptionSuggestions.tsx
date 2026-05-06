"use client"

import { useMemo } from "react"
import { Check, RotateCw } from "lucide-react"

export type SubProduct = {
  id: string
  name: string
  emoji: string
  price: number
  unit: string
  category: string
}

type RecurringHint = { productHint: string; everyDays: number }

type Suggestion = {
  product: SubProduct
  everyDays: number
  discount: number
  reason: string
}

const DEFAULT_HINTS: Array<{ idMatch: RegExp; everyDays: number; reason: string }> = [
  { idMatch: /^milk$/, everyDays: 7, reason: "обычно покупают раз в неделю" },
  { idMatch: /^bread$/, everyDays: 5, reason: "свежий хлеб каждые 5 дней" },
  { idMatch: /^eggs$/, everyDays: 14, reason: "стандартная упаковка на 2 недели" },
  { idMatch: /^kefir$/, everyDays: 7, reason: "недельная норма для здорового кишечника" },
  { idMatch: /^yogurt$/, everyDays: 7, reason: "обычно берут раз в неделю" },
  { idMatch: /^coffee$/, everyDays: 30, reason: "пачки хватает на месяц" },
  { idMatch: /^water$/, everyDays: 14, reason: "при ежедневном потреблении" },
]

function matchProduct(hint: string, products: SubProduct[]): SubProduct | null {
  const stem = hint.toLowerCase().slice(0, Math.min(5, hint.length))
  return (
    products.find(p => p.name.toLowerCase().includes(stem)) ?? null
  )
}

type Props = {
  brandColor: string
  products: SubProduct[]
  recurring?: RecurringHint[]
  subscribed: Record<string, number>
  onToggleSubscribe: (productId: string, everyDays: number) => void
  onSubscribeAll: (items: { id: string; everyDays: number }[]) => void
}

export function SubscriptionSuggestions({
  brandColor,
  products,
  recurring = [],
  subscribed,
  onToggleSubscribe,
  onSubscribeAll,
}: Props) {
  const suggestions = useMemo<Suggestion[]>(() => {
    const out: Suggestion[] = []
    const used = new Set<string>()

    for (const r of recurring) {
      const product = matchProduct(r.productHint, products)
      if (!product || used.has(product.id)) continue
      out.push({
        product,
        everyDays: r.everyDays,
        discount: 10,
        reason: `вы указали в профиле`,
      })
      used.add(product.id)
    }

    if (out.length < 4) {
      for (const hint of DEFAULT_HINTS) {
        if (out.length >= 5) break
        const product = products.find(p => hint.idMatch.test(p.id))
        if (!product || used.has(product.id)) continue
        out.push({
          product,
          everyDays: hint.everyDays,
          discount: 10,
          reason: hint.reason,
        })
        used.add(product.id)
      }
    }

    return out.slice(0, 5)
  }, [products, recurring])

  if (suggestions.length === 0) return null

  const totalPerWeek = suggestions.reduce((sum, s) => {
    const perWeek = (s.product.price * (1 - s.discount / 100) * 7) / s.everyDays
    return sum + perWeek
  }, 0)

  const totalSaving = suggestions.reduce((sum, s) => {
    const original = s.product.price
    const discounted = s.product.price * (1 - s.discount / 100)
    const perMonth = ((original - discounted) * 30) / s.everyDays
    return sum + perMonth
  }, 0)

  const handleSubscribeAll = () => {
    onSubscribeAll(suggestions.map(s => ({ id: s.product.id, everyDays: s.everyDays })))
  }

  return (
    <section
      className="mb-8 overflow-hidden rounded-2xl border-2 p-5 sm:p-6"
      style={{ borderColor: brandColor, backgroundColor: `${brandColor}08` }}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: brandColor }}
        >
          AI · подписка
        </span>
        <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Subscribe & Save
        </span>
      </div>
      <h2 className="mt-2 text-xl font-bold text-neutral-900 sm:text-2xl">
        Регулярная доставка со скидкой
      </h2>
      <p className="mt-1 text-sm text-neutral-600">
        AI прочитала профиль и подобрала {suggestions.length} товаров для авто-доставки. Экономия ~{Math.round(totalSaving)}₽ в месяц.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {suggestions.map(s => {
          const isActive = subscribed[s.product.id] !== undefined
          return (
            <div
              key={s.product.id}
              className="flex flex-col rounded-xl border bg-white p-3 transition"
              style={{
                borderColor: isActive ? brandColor : "#e5e5e5",
                boxShadow: isActive ? `0 0 0 1px ${brandColor}` : undefined,
              }}
            >
              <div className="mb-2 flex h-16 items-center justify-center rounded-lg bg-neutral-50 text-3xl">
                {s.product.emoji}
              </div>
              <div className="line-clamp-2 min-h-[2.5em] text-sm font-medium leading-tight text-neutral-900">
                {s.product.name}
              </div>
              <div className="mt-1 text-[11px] text-neutral-500">
                каждые {s.everyDays} {s.everyDays === 1 ? "день" : s.everyDays < 5 ? "дня" : "дней"}
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
                <span className="text-sm font-bold text-neutral-900">
                  {Math.round(s.product.price * (1 - s.discount / 100))} ₽
                </span>
                <span className="text-[11px] text-neutral-400 line-through">{s.product.price}</span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  -{s.discount}%
                </span>
              </div>
              <button
                onClick={() => onToggleSubscribe(s.product.id, s.everyDays)}
                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
                style={{
                  backgroundColor: isActive ? "#fff" : brandColor,
                  color: isActive ? brandColor : "#fff",
                  border: isActive ? `1px solid ${brandColor}` : "none",
                }}
              >
                {isActive ? (
                  <><Check size={12} className="shrink-0" />В подписке</>
                ) : (
                  <><RotateCw size={12} className="shrink-0" />Подписаться</>
                )}
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={handleSubscribeAll}
          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          style={{ backgroundColor: brandColor }}
        >
          <RotateCw size={14} className="shrink-0" />
          Подписаться на все · {Math.round(totalPerWeek)} ₽/нед
        </button>
        <span className="text-xs text-neutral-500">
          Можно отменить или изменить частоту в любой момент
        </span>
      </div>
    </section>
  )
}
