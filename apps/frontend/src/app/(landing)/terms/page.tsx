"use client"

import Link from "next/link"
import { useLanguage } from "@/shared/yukai/useLanguage"
import { TermsRu } from "./content-ru"
import { TermsEn } from "./content-en"

export default function TermsPage() {
  const lang = useLanguage()
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-white/85">
      <Link href="/" className="mb-8 inline-block text-sm text-white/60 transition hover:text-white">
        ← Yukai
      </Link>
      {lang === "en" ? <TermsEn /> : <TermsRu />}
    </main>
  )
}
