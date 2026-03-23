'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import {
  Home,
  Search,
  BookOpen,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Loader2,
  User,
  Settings,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navItems = [
  {
    label: 'Home',
    href: '/dashboard/student',
    icon: Home,
  },
  {
    label: 'Explore',
    href: '/dashboard/student/explore',
    icon: Search,
  },
  {
    label: 'My Sessions',
    href: '/dashboard/student/sessions',
    icon: BookOpen,
  },
]

export default function StudentLayout({
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
      } else if (profile && profile.role !== 'student') {
        router.push('/dashboard')
      }
    }
  }, [user, profile, loading, router])

  if (loading || !profile || profile.role !== 'student') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900">
            Loading your dashboard...
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
    .slice(0, 2) || 'S'

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Clean white design matching admin/mentor */}
      <aside
        className={`${
          collapsed ? 'w-20' : 'w-64'
        } transition-all duration-300 ease-in-out bg-white border-r border-slate-200 flex flex-col fixed h-full z-20`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200">
          {!collapsed && (
            <Link href="/dashboard/student" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-semibold text-slate-900 tracking-tight">Mentorly</span>
            </Link>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center mx-auto">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
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
              className="w-full flex items-center justify-center p-3 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors mb-2"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard/student' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <item.icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive ? 'text-blue-600' : 'text-slate-500'
                  }`}
                />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-slate-200">
          {!collapsed ? (
            <div className="px-3 py-2">
              <p className="text-xs text-slate-500">Student Portal v1.0</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          collapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/dashboard/student"
              className="text-slate-600 hover:text-slate-900 transition-colors font-medium"
            >
              Student
            </Link>
            {pathname !== '/dashboard/student' && (
              <>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900 font-medium">
                  {pathname
                    .split('/')
                    .pop()
                    ?.replace(/-/g, ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </>
            )}
          </div>

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 hover:bg-slate-50 rounded-lg px-3 py-2 transition-colors">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">{profile?.full_name || 'Student'}</p>
                <p className="text-xs text-slate-500">{profile?.email}</p>
              </div>
              <Avatar className="h-9 w-9 border-2 border-blue-100">
                <AvatarFallback className="gradient-primary text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => router.push('/dashboard/student/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/dashboard/student/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
