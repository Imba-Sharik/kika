import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

// Локализованные обёртки над Next.js navigation. Используй ИМЕННО эти
// импорты вместо next/link и next/navigation в компонентах с переводами:
//   import { Link, useRouter, usePathname } from '@/i18n/navigation'
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
