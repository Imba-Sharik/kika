'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Bitcoin, CreditCard, Loader2 } from 'lucide-react'
import { aiFetch } from '@/shared/api/aiFetch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/shared/ui/drawer'

const MOBILE_BREAKPOINT = 768

/**
 * Кнопка «Оформить подписку» на лендинге.
 * Desktop → shadcn Dialog, mobile → Drawer.
 *
 * USDT/Card пока заглушки (alert) — заменим на реальный CryptoCloud invoice
 * когда подключим API. Пока интеграции нет, кнопка остаётся в UI как placeholder
 * чтобы юзеры видели что подписка уже планируется.
 */
export function SubscribeButton({ children }: { children: ReactNode }) {
  const t = useTranslations('subscribe')
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent className="bg-[#0F0E15] text-white">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-2xl font-bold">{t('title')}</DrawerTitle>
            <DrawerDescription className="text-white/60">{t('subtitle')}</DrawerDescription>
          </DrawerHeader>
          <SubscribeBody />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="border-white/10 bg-[#0F0E15] text-white">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold">{t('title')}</DialogTitle>
          <DialogDescription className="text-white/60">{t('subtitle')}</DialogDescription>
        </DialogHeader>
        <SubscribeBody />
      </DialogContent>
    </Dialog>
  )
}

function SubscribeBody() {
  const t = useTranslations('subscribe')
  const { data: session } = useSession()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUsdt() {
    setError(null)

    // Не залогинен — отправляем на регистрацию, после неё юзер вернётся
    // и кликнет ещё раз. Использовать window.location чтобы перейти из лендинга.
    if (!session) {
      window.location.href = '/register?next=/%23pricing'
      return
    }

    setPending(true)
    try {
      const res = await aiFetch('/billing/checkout', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error?.message ?? t('checkoutError'))
        return
      }
      const { url } = (await res.json()) as { url: string }
      // В Electron открываем во внешнем браузере (электрон-окно прозрачное),
      // в web — обычная новая вкладка.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI
      if (api?.openExternal) api.openExternal(url)
      else window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      setError(t('checkoutError'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="px-4 pb-4 md:px-0 md:pb-0">
      <div className="my-6 flex items-baseline gap-2">
        <span className="text-5xl font-bold">$19</span>
        <span className="text-white/60">{t('perMonth')}</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-pink-500/20 px-3 py-1 text-xs font-medium text-pink-300">
          ✨ {t('badge')}
        </span>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleUsdt}
          disabled={pending}
          className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-left transition hover:border-pink-400/40 hover:bg-white/10 disabled:opacity-60"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/20 text-orange-300">
            <Bitcoin className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">{t('usdtTitle')}</div>
            <div className="text-xs text-white/60">{t('usdtSubtitle')}</div>
          </div>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-white/60" />
          ) : (
            <span className="text-white/40">→</span>
          )}
        </button>
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <div
          aria-disabled
          className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl border border-white/10 bg-white/3 px-5 py-4 text-left opacity-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300/70">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">{t('cardTitle')}</div>
            <div className="text-xs text-white/50">{t('cardSubtitle')}</div>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
            {t('cardSoon')}
          </span>
        </div>
      </div>

      <p className="mt-6 text-xs text-white/40">{t('terms')}</p>
    </div>
  )
}
