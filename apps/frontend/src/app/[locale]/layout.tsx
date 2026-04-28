import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Защита от мусорных URL — /xx где xx не в списке локалей → 404
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  // Включаем static rendering для server components
  setRequestLocale(locale)

  return <NextIntlClientProvider>{children}</NextIntlClientProvider>
}
