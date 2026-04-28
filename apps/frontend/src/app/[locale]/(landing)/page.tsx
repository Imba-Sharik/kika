import Landing from './Landing'

/**
 * Лендинг рендерится через next-intl. Контент берётся из messages/{locale}.json
 * (namespace 'landing'). Один компонент Landing.tsx с useTranslations() —
 * работает на всех 7 локалях без дублирования файлов.
 */
export default function LandingPage() {
  return <Landing />
}
