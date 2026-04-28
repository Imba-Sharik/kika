"use client"

import { signOut, useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"

export function UserNav() {
  const { data: session, status } = useSession()
  const t = useTranslations('nav')

  // Пока сессия грузится — не показываем ни кнопки логина, ни аватар.
  if (status === 'loading') {
    return <div className="h-9 w-9" aria-hidden />
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="text-sm text-white/70 hover:text-white transition"
      >
        {t('signin')}
      </Link>
    )
  }

  const name = session.user?.name ?? session.user?.email ?? 'User'
  const initials = name.charAt(0).toUpperCase()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 pr-3 pl-1 text-sm font-medium text-white transition hover:bg-white/10"
          aria-label="User menu"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-pink-500 to-violet-500 text-xs font-semibold">
            {initials}
          </span>
          <span className="hidden sm:inline max-w-35 truncate">{name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 border-white/10 bg-[#0F0E15] text-white"
      >
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-white/50">{session.user?.email}</p>
        </div>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem asChild className="text-white focus:bg-white/10 focus:text-white">
          <Link href="/overlay">{t('openApp')}</Link>
        </DropdownMenuItem>
        {session.user?.role === 'manager' && (
          <DropdownMenuItem asChild className="text-white focus:bg-white/10 focus:text-white">
            <Link href="/analytics">{t('analytics')}</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/' })}
          className="text-white focus:bg-white/10 focus:text-white"
        >
          {t('signout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
