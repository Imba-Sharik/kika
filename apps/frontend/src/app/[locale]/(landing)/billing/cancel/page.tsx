'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { XCircle } from 'lucide-react'

export default function BillingCancel() {
  const t = useTranslations('billingPage')
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-400/15">
        <XCircle className="h-10 w-10 text-rose-400" />
      </div>
      <h1 className="mb-3 text-4xl font-bold">{t('cancelTitle')}</h1>
      <p className="mb-8 max-w-md text-white/70">{t('cancelBody')}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/#pricing"
          className="rounded-xl bg-linear-to-r from-pink-500 to-violet-500 px-6 py-3 text-sm font-semibold shadow-lg shadow-pink-500/30 transition hover:shadow-pink-500/50"
        >
          {t('cancelTryAgain')}
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          {t('cancelBackHome')}
        </Link>
      </div>
    </main>
  )
}
