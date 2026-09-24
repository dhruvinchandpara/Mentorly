'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'

export interface MobileBottomNavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

const VARIANT_STYLES = {
  student: { activeBg: 'bg-accent', activeText: 'text-primary' },
  mentor: { activeBg: 'bg-accent', activeText: 'text-primary' },
  admin: { activeBg: 'bg-[#F5E6DE]', activeText: 'text-[#702327]' },
} as const

export function MobileBottomNav({
  items,
  rootHref,
  variant,
}: {
  items: MobileBottomNavItem[]
  rootHref: string
  variant: keyof typeof VARIANT_STYLES
}) {
  const pathname = usePathname()
  const styles = VARIANT_STYLES[variant]

  return (
    <nav
      className="md:hidden fixed bottom-4 left-4 right-4 z-30 bg-white border border-border rounded-full shadow-lg flex items-center justify-between px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      aria-label="Primary"
    >
      {items.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== rootHref && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 rounded-full transition-colors ${
              isActive ? `${styles.activeBg} ${styles.activeText}` : 'text-muted-foreground'
            }`}
          >
            <item.icon
              className={`w-5 h-5 ${isActive ? '' : 'text-[var(--fg-faint)]'}`}
            />
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
            {item.badge ? (
              <span className="absolute top-0.5 right-3 min-w-[16px] h-4 px-1 rounded-full bg-[#BA3B41] text-white text-[9px] font-semibold flex items-center justify-center">
                {item.badge}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
