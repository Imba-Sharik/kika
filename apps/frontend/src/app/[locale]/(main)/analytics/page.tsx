"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

import { aiFetch } from "@/shared/api/aiFetch"

type Summary = {
  totals: { users: number; totalCostUsd: number; totalTurns: number }
  recent: {
    last7Days: { costUsd: number; count: number }
    last30Days: { costUsd: number; count: number }
  }
  byType: { type: string; count: number; costUsd: number }[]
  topUsers: {
    id: number
    username: string
    email: string
    totalCostUsd: number
    totalTurnsCount: number
    lastUsageAt: string | null
  }[]
}

const TYPE_COLOR: Record<string, string> = {
  chat: "from-pink-500/30 to-pink-700/10",
  tts: "from-violet-500/30 to-violet-700/10",
  stt: "from-blue-500/30 to-blue-700/10",
  vision: "from-emerald-500/30 to-emerald-700/10",
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(n < 1 ? 4 : 2)}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // session reference меняется при каждом рендере → infinite loop если зависеть
  // от объекта. Берём только role + status (string'и со стабильной identity).
  const role = session?.user?.role
  const isAuthed = !!session

  useEffect(() => {
    if (status === "loading") return
    if (!isAuthed) {
      router.replace("/login")
      return
    }
    if (role !== "manager") {
      router.replace("/")
      return
    }

    aiFetch("/analytics/summary")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`${res.status} ${await res.text()}`)
        }
        return res.json() as Promise<Summary>
      })
      .then((json) => setData(json))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [status, isAuthed, role, router])

  if (loading || status === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12 text-white/60">Загрузка...</div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          Ошибка: {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-2 text-3xl font-bold">Аналитика</h1>
      <p className="mb-8 text-sm text-white/60">
        Использование AI и расходы по юзерам. Данные обновляются в реальном времени.
      </p>

      {/* Главные числа */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Всего юзеров" value={String(data.totals.users)} />
        <StatCard label="Потрачено всего" value={fmtUsd(data.totals.totalCostUsd)} accent />
        <StatCard label="Голосовых turn'ов" value={data.totals.totalTurns.toLocaleString("ru-RU")} />
      </div>

      {/* Последние 7/30 дней */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard
          label="Последние 7 дней"
          value={fmtUsd(data.recent.last7Days.costUsd)}
          subValue={`${data.recent.last7Days.count} запросов`}
        />
        <StatCard
          label="Последние 30 дней"
          value={fmtUsd(data.recent.last30Days.costUsd)}
          subValue={`${data.recent.last30Days.count} запросов`}
        />
      </div>

      {/* Разбивка по типу */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">По типу запроса</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {data.byType.map((t) => (
            <div
              key={t.type}
              className={`rounded-xl border border-white/10 bg-linear-to-b ${TYPE_COLOR[t.type] ?? "from-white/10 to-white/5"} p-4`}
            >
              <div className="mb-1 text-xs uppercase text-white/50">{t.type}</div>
              <div className="text-2xl font-bold">{fmtUsd(t.costUsd)}</div>
              <div className="text-xs text-white/60">{t.count.toLocaleString("ru-RU")} запросов</div>
            </div>
          ))}
        </div>
      </div>

      {/* Топ юзеров */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Топ юзеров по тратам</h2>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase text-white/60">
              <tr>
                <th className="px-4 py-3">Юзер</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3 text-right">Потрачено</th>
                <th className="px-4 py-3 text-right">Turn'ов</th>
                <th className="px-4 py-3">Последний раз</th>
              </tr>
            </thead>
            <tbody>
              {data.topUsers.map((u) => (
                <tr key={u.id} className="border-t border-white/5 hover:bg-white/3">
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-white/60">{u.email}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmtUsd(u.totalCostUsd)}</td>
                  <td className="px-4 py-3 text-right font-mono">{u.totalTurnsCount}</td>
                  <td className="px-4 py-3 text-white/60">{fmtDate(u.lastUsageAt)}</td>
                </tr>
              ))}
              {data.topUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/50">
                    Пока нет данных
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  subValue,
  accent,
}: {
  label: string
  value: string
  subValue?: string
  accent?: boolean
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 ${
        accent ? "border-pink-500/30 bg-linear-to-b from-pink-500/15 to-violet-500/5" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="mb-1 text-xs uppercase text-white/50">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
      {subValue && <div className="mt-1 text-xs text-white/60">{subValue}</div>}
    </div>
  )
}
