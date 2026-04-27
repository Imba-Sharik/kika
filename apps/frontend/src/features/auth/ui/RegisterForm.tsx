"use client"

import { useState, type FormEvent } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { cn } from "@/shared/lib/utils"
import { STRAPI_API_URL } from "@/shared/api/strapi"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { PasswordInput } from "@/shared/ui/password-input"
import { useLanguage } from "@/shared/yukai/useLanguage"
import { t } from "@/shared/yukai/i18n"

export function RegisterForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const router = useRouter()
  const lang = useLanguage()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const fd = new FormData(e.currentTarget)
    const username = fd.get("username") as string
    const email = fd.get("email") as string
    const password = fd.get("password") as string
    const confirmPassword = fd.get("confirmPassword") as string

    if (password !== confirmPassword) {
      setError(t(lang, 'register.error.passwordMismatch'))
      return
    }

    setPending(true)
    try {
      // 1) Регистрация в Strapi напрямую — endpoint публичный, не нужен JWT
      const res = await fetch(`${STRAPI_API_URL}/auth/local/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error?.message ?? t(lang, 'register.error.failed'))
        return
      }

      // 2) Сразу логиним юзера client-side signIn'ом — это синхронно обновит
      // SessionProvider, иначе после редиректа на главной хедер останется анонимным
      const result = await signIn("credentials", {
        identifier: email,
        password,
        redirect: false,
      })
      if (!result || result.error) {
        setError(t(lang, 'register.error.loginAfter'))
        return
      }

      router.refresh()
      router.push("/")
    } finally {
      setPending(false)
    }
  }

  const inputClass =
    "border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-pink-400/50 focus-visible:ring-pink-400/30"

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      {...props}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="username" className="text-white/80">
            {t(lang, 'register.username')}
          </FieldLabel>
          <Input
            id="username"
            name="username"
            type="text"
            placeholder="johndoe"
            autoComplete="username"
            className={inputClass}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="email" className="text-white/80">
            {t(lang, 'register.email')}
          </FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="m@example.com"
            autoComplete="email"
            className={inputClass}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password" className="text-white/80">
            {t(lang, 'register.password')}
          </FieldLabel>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            className={inputClass}
            required
          />
          <FieldDescription className="text-white/40">
            {t(lang, 'register.password.hint')}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmPassword" className="text-white/80">
            {t(lang, 'register.confirmPassword')}
          </FieldLabel>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            className={inputClass}
            required
          />
        </Field>
        <Field>
          {error && <FieldError className="text-pink-400">{error}</FieldError>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-linear-to-r from-pink-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:shadow-pink-500/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? t(lang, 'register.submitting') : t(lang, 'register.submit')}
          </button>
        </Field>
        <FieldDescription className="text-center text-white/60">
          {t(lang, 'register.haveAccount')}{" "}
          <Link
            href="/login"
            className="text-pink-300 underline-offset-4 hover:text-pink-200 hover:underline"
          >
            {t(lang, 'register.haveAccount.cta')}
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
