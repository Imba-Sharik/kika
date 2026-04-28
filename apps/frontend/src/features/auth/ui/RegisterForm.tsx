"use client"

import { useState, type FormEvent } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"

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

export function RegisterForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const router = useRouter()
  const t = useTranslations('register')
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
      setError(t('error.passwordMismatch'))
      return
    }

    setPending(true)
    try {
      const res = await fetch(`${STRAPI_API_URL}/auth/local/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error?.message ?? t('error.failed'))
        return
      }

      const result = await signIn("credentials", {
        identifier: email,
        password,
        redirect: false,
      })
      if (!result || result.error) {
        setError(t('error.loginAfter'))
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
            {t('username')}
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
            {t('email')}
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
            {t('password')}
          </FieldLabel>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            className={inputClass}
            required
          />
          <FieldDescription className="text-white/40">
            {t('passwordHint')}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmPassword" className="text-white/80">
            {t('confirmPassword')}
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
            {pending ? t('submitting') : t('submit')}
          </button>
        </Field>
        <FieldDescription className="text-center text-white/60">
          {t('haveAccount')}{" "}
          <Link
            href="/login"
            className="text-pink-300 underline-offset-4 hover:text-pink-200 hover:underline"
          >
            {t('haveAccountCta')}
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
