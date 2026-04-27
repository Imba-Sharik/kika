"use client"

import { useState, type FormEvent } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { cn } from "@/shared/lib/utils"
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

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const router = useRouter()
  const lang = useLanguage()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Client-side signIn — единственный способ синхронно обновить SessionProvider'ный
  // SessionContext без F5. Server Action + redirect не сработает: SessionProvider
  // принимает session prop только как initial value, последующие изменения игнорит.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const fd = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      identifier: fd.get("identifier") as string,
      password: fd.get("password") as string,
      redirect: false,
    })
    setPending(false)
    if (!result || result.error) {
      setError(t(lang, 'login.error.invalid'))
      return
    }
    router.refresh()
    router.push("/")
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      {...props}
      onSubmit={handleSubmit}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email" className="text-white/80">
            {t(lang, 'login.email')}
          </FieldLabel>
          <Input
            id="email"
            name="identifier"
            type="email"
            placeholder="m@example.com"
            autoComplete="email"
            className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-pink-400/50 focus-visible:ring-pink-400/30"
            required
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password" className="text-white/80">
              {t(lang, 'login.password')}
            </FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm text-white/50 underline-offset-4 hover:text-white hover:underline"
            >
              {t(lang, 'login.forgot')}
            </a>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            className="border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-pink-400/50 focus-visible:ring-pink-400/30"
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
            {pending ? t(lang, 'login.submitting') : t(lang, 'login.submit')}
          </button>
        </Field>
        <FieldDescription className="text-center text-white/60">
          {t(lang, 'login.noAccount')}{" "}
          <Link
            href="/register"
            className="text-pink-300 underline-offset-4 hover:text-pink-200 hover:underline"
          >
            {t(lang, 'login.noAccount.cta')}
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
