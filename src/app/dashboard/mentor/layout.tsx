'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  DollarSign,
  User,
  LogOut,
  Loader2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  GraduationCap,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MobileBottomNav } from '@/components/ui/mobile-bottom-nav'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard/mentor',
    icon: LayoutDashboard,
  },
  {
    label: 'Availability',
    href: '/dashboard/mentor/availability',
    icon: CalendarDays,
  },
  {
    label: 'Sessions',
    href: '/dashboard/mentor/sessions',
    icon: BookOpen,
  },
  {
    label: 'Payments',
    href: '/dashboard/mentor/payments',
    icon: DollarSign,
  },
]

export default function MentorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      } else if (profile && profile.role !== 'mentor') {
        router.push('/dashboard')
      }
    }
  }, [user, profile, loading, router])

  if (loading || !profile || profile.role !== 'mentor') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground">
            Loading mentor dashboard...
          </h2>
        </div>
      </div>
    )
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'M'

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Clean white design matching admin */}
      <aside
        className={`${collapsed ? 'w-20' : 'w-64'
          } hidden md:flex transition-all duration-300 ease-in-out bg-card border-r border-border flex-col fixed h-full z-20`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border">
          {!collapsed && (
            <Link href="/dashboard/mentor" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-display font-semibold text-foreground tracking-tight">Mentorly</span>
            </Link>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center mx-auto">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg hover:bg-muted text-[var(--fg-faint)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="w-full flex items-center justify-center p-3 rounded-lg hover:bg-muted text-muted-foreground transition-colors mb-2"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard/mentor' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                  ? 'bg-accent text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted'
                  }`}
              >
                <item.icon
                  className={`w-5 h-5 flex-shrink-0 ${isActive
                    ? 'text-primary'
                    : 'text-[var(--fg-faint)]'
                    }`}
                />
                {!collapsed && (
                  <span className="text-sm">
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-border">
          {!collapsed ? (
            <div className="px-3 py-2">
              <p className="text-xs text-[var(--fg-faint)]">Mentor Portal v1.0</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-2 h-2 rounded-full bg-success" />
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-300 ${collapsed ? 'md:ml-20' : 'md:ml-64'
          }`}
      >
        {/* Top bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/dashboard/mentor"
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Mentor
            </Link>
            {pathname !== '/dashboard/mentor' && (
              <>
                <span className="text-[var(--fg-faint)]">/</span>
                <span className="text-foreground font-medium">
                  {pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </>
            )}
          </div>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 hover:bg-muted rounded-lg px-3 py-2 transition-colors">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{profile?.full_name || 'Mentor'}</p>
                <p className="text-xs text-[var(--fg-faint)]">{profile?.email}</p>
              </div>
              <Avatar className="h-9 w-9 border-2 border-accent">
                <AvatarFallback className="gradient-primary text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => router.push('/dashboard/mentor/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/mentor/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <div className="p-6 lg:p-8 pb-28 md:pb-8">{children}</div>
      </main>

      <MobileBottomNav items={navItems} rootHref="/dashboard/mentor" variant="mentor" />
    </div>
  )
}
