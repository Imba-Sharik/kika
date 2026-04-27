'use client'

import { useState, type FormEvent, type CSSProperties } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

import { STRAPI_API_URL } from '@/shared/api/strapi'
import type { Language } from '@/shared/yukai/persona'
import { t } from '@/shared/yukai/i18n'

type Mode = 'signup' | 'signin'

/**
 * Tooltip-баббл с регистрацией/входом для overlay-приложения.
 * Визуальный паттерн повторяет onboarding-подсказку: pink/violet градиент,
 * стрелочка влево к персонажу, всплывает справа от Yukai.
 *
 * Показывается когда useSession() возвращает null. После успешного логина
 * SessionProvider обновляется → !session становится false → баббл прячется.
 */
export function AuthGateBubble({
  language,
  onLanguageChange,
}: {
  language: Language
  onLanguageChange: (lang: Language) => void
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signup')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function doSignIn(email: string, password: string): Promise<boolean> {
    const result = await signIn('credentials', {
      identifier: email,
      password,
      redirect: false,
    })
    if (!result || result.error) {
      setError(t(language, 'login.error.invalid'))
      return false
    }
    return true
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    const password = fd.get('password') as string
    const username = fd.get('username') as string

    setPending(true)
    try {
      let ok = false
      if (mode === 'signup') {
        const res = await fetch(`${STRAPI_API_URL}/auth/local/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          setError(data?.error?.message ?? t(language, 'register.error.failed'))
          return
        }
        ok = await doSignIn(email, password)
      } else {
        ok = await doSignIn(email, password)
      }
      if (ok) {
        router.refresh()
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        ...noDragStyle,
        position: 'absolute',
        bottom: 30,
        left: 200,
        width: 260,
        padding: '14px 16px',
        background: 'linear-gradient(135deg, rgba(236,72,153,0.95), rgba(139,92,246,0.95))',
        color: 'white',
        borderRadius: 10,
        fontSize: 12,
        lineHeight: 1.4,
        boxShadow: '0 6px 20px rgba(139,92,246,0.4)',
        zIndex: 10,
      }}
    >
      {/* Язык — компактный тоггл в правом верхнем углу. onLanguageChange
          (=selectLanguage из overlay) обновит state, сохранит в localStorage,
          подберёт голос и при необходимости редиректнёт на другой домен. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <div style={{ fontWeight: 600 }}>
          {mode === 'signup' ? t(language, 'register.title') : t(language, 'login.title')} 👋
        </div>
        <div style={{ display: 'flex', gap: 4, fontSize: 10, opacity: 0.85 }}>
          <button type="button" onClick={() => onLanguageChange('ru')} style={langStyle(language === 'ru')}>
            RU
          </button>
          <span style={{ opacity: 0.4 }}>·</span>
          <button type="button" onClick={() => onLanguageChange('en')} style={langStyle(language === 'en')}>
            EN
          </button>
        </div>
      </div>

      {/* Toggle между signup / signin */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => {
            setMode('signup')
            setError(null)
          }}
          style={tabStyle(mode === 'signup')}
        >
          {t(language, 'nav.signup')}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signin')
            setError(null)
          }}
          style={tabStyle(mode === 'signin')}
        >
          {t(language, 'nav.signin')}
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {mode === 'signup' && (
          <input
            type="text"
            name="username"
            placeholder={t(language, 'register.username')}
            required
            autoComplete="username"
            style={inputStyle}
          />
        )}
        <input
          type="email"
          name="email"
          placeholder={t(language, 'login.email')}
          required
          autoComplete="email"
          style={inputStyle}
        />
        <input
          type="password"
          name="password"
          placeholder={t(language, 'login.password')}
          required
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          minLength={mode === 'signup' ? 8 : undefined}
          style={inputStyle}
        />

        {error && (
          <div style={{ fontSize: 11, color: '#fecaca', marginTop: 2 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{
            marginTop: 6,
            padding: '7px 10px',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 6,
            color: 'white',
            fontSize: 12,
            fontWeight: 600,
            cursor: pending ? 'wait' : 'pointer',
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending
            ? mode === 'signup'
              ? t(language, 'register.submitting')
              : t(language, 'login.submitting')
            : mode === 'signup'
              ? t(language, 'register.submit')
              : t(language, 'login.submit')}
        </button>
      </form>

      {/* Стрелочка к персонажу */}
      <div
        style={{
          position: 'absolute',
          left: -8,
          bottom: 80,
          width: 0,
          height: 0,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderRight: '8px solid rgba(236,72,153,0.95)',
        }}
      />
    </div>
  )
}

const noDragStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 4,
  color: 'white',
  fontSize: 12,
  fontFamily: 'inherit',
  outline: 'none',
}

function tabStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    padding: '5px 8px',
    background: active ? 'rgba(255,255,255,0.25)' : 'transparent',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 4,
    color: 'white',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  }
}

function langStyle(active: boolean): CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    color: 'white',
    fontWeight: active ? 700 : 400,
    fontSize: 10,
    cursor: 'pointer',
    padding: 0,
    opacity: active ? 1 : 0.6,
    textDecoration: active ? 'underline' : 'none',
    textUnderlineOffset: 2,
  }
}
