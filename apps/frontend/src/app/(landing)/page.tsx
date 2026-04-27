import { headers } from 'next/headers'
import LandingPageRu from './LandingPageRu'
import LandingPageEn from './en/page'

/**
 * Server-side детект языка для лендинга — устраняет SSR-flash.
 * Раньше: страница рендерилась на сервере как RU (default useLanguage),
 * потом client useEffect детектил host yukai.app → переключал на EN.
 * Юзер видел мерцание RU→EN.
 *
 * Теперь: серверь читает host из headers и сразу рендерит правильный язык.
 * Клиентский useLanguage в Header/UserNav остаётся реактивным для
 * последующих переключений через тоггл.
 *
 * Логика хоста:
 * - x-forwarded-host (если идём через Timeweb-прокси) или host
 * - ru.* → RU
 * - yukai.app или *.vercel.app → EN
 * - остальное (localhost) → RU (дефолт для разработки)
 */
export default async function LandingPage() {
  const headersList = await headers()
  const forwarded = headersList.get('x-forwarded-host') || ''
  const host = headersList.get('host') || ''
  const hostname = (forwarded || host).toLowerCase().split(':')[0]

  if (hostname.startsWith('ru.')) return <LandingPageRu />
  if (hostname === 'yukai.app' || hostname.endsWith('.vercel.app')) {
    return <LandingPageEn />
  }
  return <LandingPageRu />
}
