import LandingPageRu from './LandingPageRu'
import LandingPageEn from './LandingPageEn'

/**
 * Лендинг рендерится по locale из URL. /ru → русская версия, всё остальное
 * (en/ja/ko/de/fr/pt) — пока английская. Полная локализация лендинга на
 * 5 новых языков идёт в следующей фазе (требует разнести ~80 строк по JSON).
 */
export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (locale === 'ru') return <LandingPageRu />
  return <LandingPageEn />
}
