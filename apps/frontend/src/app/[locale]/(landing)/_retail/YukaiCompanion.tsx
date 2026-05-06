"use client"

import { useEffect, useRef, useState } from "react"
import { getAiBaseUrl } from "@/shared/api/strapi"
import type { Emotion } from "@/shared/yukai/persona"

function emotionPng(e: Emotion): string {
  return `/yukai/emotions/${e}.png`
}

type Message = {
  role: "user" | "assistant"
  content: string
  emotion?: Emotion
}

const GREETING: Message = {
  role: "assistant",
  content:
    "Привет! Давай поговорим — я автоматически заполню твои предпочтения или подберу продукты для блюда. Скажи, что любишь, или что хочешь приготовить.",
  emotion: "happy",
}

type Props = {
  brandKey: string
  brandColor: string
  onProfileAppend?: (text: string) => void
  onRecipeQuery?: (query: string) => void
}

export function YukaiCompanion({ brandKey, brandColor, onProfileAppend, onRecipeQuery }: Props) {
  const soundKey = `${brandKey}:companion:sound`
  const [open, setOpen] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [busy, setBusy] = useState(false)
  const [emotion, setEmotion] = useState<Emotion>("neutral")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const [micSupported, setMicSupported] = useState(false)
  const [micBlocked, setMicBlocked] = useState(false)
  const autoListenRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const greetingUrlRef = useRef<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const sendRef = useRef<(text: string) => void>(() => {})

  useEffect(() => {
    const a = new Audio()
    a.preload = "auto"
    audioRef.current = a
    const onPlay = () => setIsSpeaking(true)
    const onEnd = () => setIsSpeaking(false)
    a.addEventListener("play", onPlay)
    a.addEventListener("pause", onEnd)
    a.addEventListener("ended", onEnd)
    return () => {
      a.removeEventListener("play", onPlay)
      a.removeEventListener("pause", onEnd)
      a.removeEventListener("ended", onEnd)
      a.pause()
      a.src = ""
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await Promise.resolve()
      if (cancelled) return
      const saved = localStorage.getItem(soundKey)
      if (saved === "0") setSoundEnabled(false)
    })()
    return () => { cancelled = true }
  }, [soundKey])

  useEffect(() => {
    if (!audioRef.current) return
    let cancelled = false
    let resolved = false

    fetch("/yukai/companion-greeting.mp3", { method: "HEAD" })
      .then(r => {
        if (cancelled || resolved || !r.ok || !audioRef.current) return
        resolved = true
        audioRef.current.src = "/yukai/companion-greeting.mp3"
        audioRef.current.load()
        greetingUrlRef.current = "/yukai/companion-greeting.mp3"
      })
      .catch(() => {})

    fetch(`${getAiBaseUrl()}/vkusvill/say`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: GREETING.content }),
    })
      .then(r => (r.ok ? r.blob() : null))
      .then(blob => {
        if (cancelled || resolved || !blob || !audioRef.current) return
        resolved = true
        const url = URL.createObjectURL(blob)
        greetingUrlRef.current = url
        audioRef.current.src = url
        audioRef.current.load()
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (greetingUrlRef.current && greetingUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(greetingUrlRef.current)
        greetingUrlRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(soundKey, soundEnabled ? "1" : "0")
  }, [soundEnabled, soundKey])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = "ru-RU"
    rec.continuous = false
    rec.interimResults = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = (e.results?.[0]?.[0]?.transcript ?? "").trim()
      if (transcript) {
        sendRef.current(transcript)
      }
    }
    rec.onend = () => {
      setListening(false)
      if (autoListenRef.current && !micBlocked) {
        window.setTimeout(() => {
          if (autoListenRef.current && !micBlocked) {
            try {
              rec.start()
              setListening(true)
            } catch {}
          }
        }, 300)
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      console.warn("[companion-mic]", e?.error)
      setListening(false)
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        autoListenRef.current = false
        setMicBlocked(true)
      }
    }
    recognitionRef.current = rec

    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setMicSupported(true)
    })

    return () => {
      cancelled = true
      try { rec.stop() } catch {}
    }
  }, [micBlocked])

  const speak = async (text: string) => {
    if (!soundEnabled || !audioRef.current) return
    try {
      const res = await fetch(`${getAiBaseUrl()}/vkusvill/say`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      audioRef.current.src = url
      audioRef.current.onended = () => URL.revokeObjectURL(url)
      await audioRef.current.play().catch(() => {})
    } catch {}
  }

  const send = async (rawText: string) => {
    const text = rawText.trim()
    if (!text || busy) return
    setBusy(true)
    setEmotion("thinking")

    const next: Message[] = [...messages, { role: "user", content: text }]
    setMessages(next)

    try {
      const res = await fetch(`${getAiBaseUrl()}/vkusvill/companion-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          brand: brandKey,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      })
      if (!res.ok) throw new Error("chat failed")
      const data = await res.json()
      const reply: Message = {
        role: "assistant",
        content: typeof data.reply === "string" ? data.reply : "Не получилось ответить, попробуйте ещё раз",
        emotion: typeof data.emotion === "string" ? (data.emotion as Emotion) : "neutral",
      }
      setMessages([...next, reply])
      setEmotion(reply.emotion ?? "neutral")

      if (typeof data.profileAppend === "string" && data.profileAppend.trim()) {
        onProfileAppend?.(data.profileAppend.trim())
      }
      if (typeof data.recipeQuery === "string" && data.recipeQuery.trim()) {
        onRecipeQuery?.(data.recipeQuery.trim())
      }
      setIsSpeaking(true)
      window.setTimeout(() => setIsSpeaking(false), 2500)
      speak(reply.content)
    } catch {
      setMessages([...next, {
        role: "assistant",
        content: "Что-то пошло не так. Попробуйте ещё раз?",
        emotion: "confused",
      }])
      setEmotion("confused")
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    sendRef.current = send
  })

  useEffect(() => {
    if (!micSupported || micBlocked) {
      autoListenRef.current = false
      return
    }
    autoListenRef.current = open
    if (!open) {
      const rec = recognitionRef.current
      if (rec) try { rec.stop() } catch {}
    }
  }, [open, micSupported, micBlocked])

  useEffect(() => {
    if (!micSupported || micBlocked) return
    if (!open || isSpeaking || busy || listening) return
    const rec = recognitionRef.current
    if (!rec) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      try {
        rec.start()
        setListening(true)
      } catch {}
    })
    return () => { cancelled = true }
  }, [open, isSpeaking, busy, listening, micSupported, micBlocked])

  useEffect(() => {
    if (!listening) return
    if (isSpeaking || busy) {
      const rec = recognitionRef.current
      if (rec) try { rec.stop() } catch {}
    }
  }, [isSpeaking, busy, listening])

  const displayEmotion: Emotion = busy
    ? "thinking"
    : emotion !== "neutral"
    ? emotion
    : listening
    ? "listening"
    : "neutral"

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-40 flex items-end gap-3">
      <div className="pointer-events-auto relative">
        {(isSpeaking || !hasInteracted) && (
          <span
            className="absolute inset-0 -m-2 animate-ping rounded-full"
            style={{
              backgroundColor: brandColor,
              opacity: !hasInteracted ? 0.3 : 0.4,
              animationDuration: !hasInteracted ? "2s" : undefined,
            }}
          />
        )}
        <button
          onClick={() => {
            if (!hasInteracted) {
              setHasInteracted(true)
              setOpen(true)
              setEmotion(GREETING.emotion ?? "happy")
              setIsSpeaking(true)
              if (
                soundEnabled &&
                audioRef.current &&
                greetingUrlRef.current &&
                audioRef.current.src
              ) {
                audioRef.current.currentTime = 0
                audioRef.current.play().catch(err => {
                  console.warn("[companion] greeting play failed", err)
                  speak(GREETING.content)
                })
              } else {
                window.setTimeout(() => setIsSpeaking(false), 2500)
                speak(GREETING.content)
              }
              return
            }
            setOpen(o => !o)
          }}
          className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl ring-2 transition hover:scale-105"
          style={{
            borderColor: brandColor,
            boxShadow: isSpeaking
              ? `0 0 0 3px ${brandColor}, 0 0 30px ${brandColor}80`
              : !hasInteracted
              ? `0 0 0 2px ${brandColor}, 0 0 20px ${brandColor}60`
              : undefined,
          }}
          aria-label="Кохана — AI-компаньон"
        >
          <img
            src={emotionPng(displayEmotion)}
            alt="Кохана"
            className={`h-24 w-24 select-none object-contain transition-all duration-300 ${
              isSpeaking ? "scale-110" : busy ? "scale-95" : "scale-100"
            }`}
            style={{
              animation: isSpeaking ? "yukaiBob 0.6s ease-in-out infinite alternate" : undefined,
            }}
            draggable={false}
          />
          <span
            className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow"
            style={{ backgroundColor: brandColor }}
          >
            AI
          </span>
        </button>

        {listening && (
          <span
            className="absolute -left-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full"
            style={{
              backgroundColor: "#ef4444",
              animation: "yukaiMicPulse 1s ease-in-out infinite",
            }}
            title="Слушаю"
          />
        )}
      </div>

      {micBlocked && open && (
        <div className="pointer-events-auto mb-3 rounded-2xl bg-white px-4 py-3 text-xs text-amber-600 shadow-xl ring-1 ring-neutral-200">
          микрофон заблокирован — разрешите в браузере
        </div>
      )}

      <style jsx>{`
        @keyframes yukaiBob {
          0% { transform: translateY(0) scale(1.1); }
          100% { transform: translateY(-0.25rem) scale(1.12); }
        }
        @keyframes yukaiMicPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  )
}
