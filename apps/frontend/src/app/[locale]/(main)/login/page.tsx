"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"

import { LoginForm } from "@/features/auth/ui/LoginForm"

export default function LoginPage() {
  const t = useTranslations('login')

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <Image
          src="/yukai/emotions/happy.png"
          alt="Yukai"
          width={928}
          height={1232}
          className="h-32 w-auto"
          priority
          unoptimized
        />
        <div>
          <h1 className="text-3xl font-bold">
            {t('title')}{" "}
            <span className="bg-linear-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
              ✨
            </span>
          </h1>
          <p className="mt-2 text-sm text-white/60">{t('subtitle')}</p>
        </div>
      </div>
      <div className="relative w-full">
        <div className="absolute -inset-1 rounded-2xl bg-linear-to-r from-pink-500/40 to-violet-500/40 opacity-60 blur-lg" />
        <div className="relative w-full rounded-2xl border border-white/10 bg-[#0F0E15] p-6 backdrop-blur md:p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
