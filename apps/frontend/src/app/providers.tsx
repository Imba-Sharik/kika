'use client'

import type { Session } from 'next-auth'
import { SessionProvider } from 'next-auth/react'

// Клиентский провайдер для useSession() в любом компоненте.
// `session` пробрасывается из server-side auth() в root layout — без этого
// после redirect из Server Action клиент несколько секунд показывает старую
// (null) сессию пока не отрефетчит /api/auth/session.
export function Providers({
  children,
  session,
}: {
  children: React.ReactNode
  session: Session | null
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
