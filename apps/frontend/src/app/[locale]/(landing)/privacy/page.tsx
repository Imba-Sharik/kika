"use client"

import { useLocale } from "next-intl"
import { Link } from "@/i18n/navigation"
import { PrivacyRu } from "./content-ru"
import { PrivacyEn } from "./content-en"

export default function PrivacyPage() {
  const locale = useLocale()
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-white/85">
      <Link href="/" className="mb-8 inline-block text-sm text-white/60 transition hover:text-white">
        ← Yukai
      </Link>
      {locale === "ru" ? <PrivacyRu /> : <PrivacyEn />}
    </main>
  )
}
