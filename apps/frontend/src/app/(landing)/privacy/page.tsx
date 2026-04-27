"use client"

import Link from "next/link"
import { useLanguage } from "@/shared/yukai/useLanguage"
import { PrivacyRu } from "./content-ru"
import { PrivacyEn } from "./content-en"

export default function PrivacyPage() {
  const lang = useLanguage()
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-white/85">
      <Link href="/" className="mb-8 inline-block text-sm text-white/60 transition hover:text-white">
        ← Yukai
      </Link>
      {lang === "en" ? <PrivacyEn /> : <PrivacyRu />}
    </main>
  )
}
