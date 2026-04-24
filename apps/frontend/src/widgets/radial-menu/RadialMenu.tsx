'use client'

const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

export type RadialItem = {
  icon: string
  angle: number        // в градусах от 3 часов (0 = справа, -90 = сверху)
  title: string
  action: () => void
}

type Props = {
  items: RadialItem[]
  open: boolean
  radius?: number
}

// Радиальное меню вокруг персонажа — 6 иконок по окружности.
// Раскрывается кликом правой кнопкой по персонажу (setMenuOpen в родителе).
export function RadialMenu({ items, open, radius = 95 }: Props) {
  return (
    <>
      {items.map((it) => {
        const rad = (it.angle * Math.PI) / 180
        const dx = Math.cos(rad) * radius
        const dy = Math.sin(rad) * radius
        return (
          <button
            key={it.icon}
            onClick={(e) => { e.stopPropagation(); it.action() }}
            title={it.title}
            style={{
              ...noDragStyle,
              position: 'absolute',
              left: `calc(50% + ${dx}px - 20px)`,
              top: `calc(50% + ${dy}px - 20px)`,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(15,14,21,0.95)',
              border: '1px solid rgba(236,72,153,0.3)',
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(236,72,153,0.25)',
              opacity: open ? 1 : 0,
              transform: open ? 'scale(1)' : 'scale(0.5)',
              pointerEvents: open ? 'auto' : 'none',
              transition: 'opacity 180ms ease-out, transform 180ms cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {it.icon}
          </button>
        )
      })}
    </>
  )
}
