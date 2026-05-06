"use client"

import { useEffect, useState } from "react"
import {
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudHail,
  CloudSnow, CloudRainWind, CloudLightning, Globe,
  type LucideIcon,
} from "lucide-react"

const WEATHER_DESC: Record<number, string> = {
  0: "ясно", 1: "почти ясно", 2: "переменная облачность", 3: "пасмурно",
  45: "туман", 48: "иней-туман",
  51: "морось", 53: "морось", 55: "сильная морось", 56: "ледяная морось", 57: "ледяная морось",
  61: "лёгкий дождь", 63: "дождь", 65: "сильный дождь", 66: "ледяной дождь", 67: "сильный ледяной дождь",
  71: "лёгкий снег", 73: "снег", 75: "сильный снег", 77: "снежная крупа",
  80: "ливни", 81: "ливни", 82: "сильные ливни",
  85: "снежные заряды", 86: "сильные снежные заряды",
  95: "гроза", 96: "гроза с градом", 99: "сильная гроза с градом",
}

const WEATHER_ICON: Record<number, LucideIcon> = {
  0: Sun, 1: Sun, 2: CloudSun, 3: Cloud,
  45: CloudFog, 48: CloudFog,
  51: CloudDrizzle, 53: CloudDrizzle, 55: CloudDrizzle, 56: CloudHail, 57: CloudHail,
  61: CloudRain, 63: CloudRain, 65: CloudRain, 66: CloudHail, 67: CloudHail,
  71: CloudSnow, 73: CloudSnow, 75: CloudSnow, 77: CloudSnow,
  80: CloudRainWind, 81: CloudRainWind, 82: CloudLightning,
  85: CloudSnow, 86: CloudSnow,
  95: CloudLightning, 96: CloudLightning, 99: CloudLightning,
}

export type HyperlocalContext = {
  city: string
  country: string
  temperature: number
  weatherCode: number
  weatherDesc: string
  weatherIcon: LucideIcon
  hour: number
  partOfDay: "ночь" | "утро" | "день" | "вечер"
}

function getPartOfDay(hour: number): HyperlocalContext["partOfDay"] {
  if (hour < 6) return "ночь"
  if (hour < 12) return "утро"
  if (hour < 18) return "день"
  return "вечер"
}

const STORAGE_KEY = "retail:hyperlocal:v1"
const TTL_MS = 30 * 60 * 1000

type CachedData = Omit<HyperlocalContext, "weatherIcon">

function rehydrate(data: CachedData): HyperlocalContext {
  return { ...data, weatherIcon: WEATHER_ICON[data.weatherCode] ?? Globe }
}

type GeoResult = { city: string; country_name: string; latitude: number; longitude: number }

async function fromSypexGeo(): Promise<GeoResult> {
  const res = await fetch("https://api.sypexgeo.net/json/")
  if (!res.ok) throw new Error("sypexgeo failed")
  const data = await res.json()
  const city = data?.city?.name_ru || data?.city?.name_en || ""
  const country_name = data?.country?.name_ru || data?.country?.name_en || ""
  const latitude = data?.city?.lat
  const longitude = data?.city?.lon
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("sypexgeo no coords")
  }
  return { city, country_name, latitude, longitude }
}

async function fromIpwhois(): Promise<GeoResult> {
  const res = await fetch("https://ipwho.is/")
  if (!res.ok) throw new Error("ipwho failed")
  const data = await res.json()
  if (data?.success === false) throw new Error("ipwho lookup failed")
  const { city, country, latitude, longitude } = data
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("ipwho no coords")
  }
  return { city: city || "", country_name: country || "", latitude, longitude }
}

async function resolveGeo(): Promise<GeoResult> {
  try {
    return await fromSypexGeo()
  } catch (err) {
    console.warn("[hyperlocal] sypexgeo failed, falling back to ipwho.is", err)
    return await fromIpwhois()
  }
}

export function useHyperlocalContext(): { context: HyperlocalContext | null; loading: boolean } {
  const [context, setContext] = useState<HyperlocalContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const cached = JSON.parse(raw) as { ts: number; data: CachedData }
        if (Date.now() - cached.ts < TTL_MS) {
          setContext(rehydrate(cached.data))
          setLoading(false)
          return
        }
      }
    } catch {}

    ;(async () => {
      try {
        // SypexGeo (РФ-сервис, CORS-friendly, без ключа) — primary.
        // ipwho.is — fallback. ipapi.co зарезан CORS в РФ без VPN.
        const geo = await resolveGeo()
        if (cancelled) return
        const { city, country_name, latitude, longitude } = geo

        const wRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`,
        )
        if (!wRes.ok) throw new Error("weather failed")
        const wData = await wRes.json()
        if (cancelled) return

        const temp = Math.round(wData?.current?.temperature_2m ?? 0)
        const code = wData?.current?.weather_code ?? 0
        const hour = new Date().getHours()

        const cached: CachedData = {
          city: city || "Россия",
          country: country_name || "",
          temperature: temp,
          weatherCode: code,
          weatherDesc: WEATHER_DESC[code] ?? "погода не определена",
          hour,
          partOfDay: getPartOfDay(hour),
        }

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ts: Date.now(), data: cached }))
        } catch {}

        setContext(rehydrate(cached))
      } catch (err) {
        console.warn("[hyperlocal] failed", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { context, loading }
}
