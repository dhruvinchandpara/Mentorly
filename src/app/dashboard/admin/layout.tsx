'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import {
    LayoutDashboard,
    Users,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Shield,
    Loader2,
} from 'lucide-react'

const navItems = [
    {
        label: 'Dashboard',
        href: '/dashboard/admin',
        icon: LayoutDashboard,
    },
    {
        label: 'Manage Mentors',
        href: '/dashboard/admin/mentors',
        icon: Users,
    },
]

export default function AdminLayout({
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
            } else if (profile && profile.role !== 'admin') {
                router.push('/dashboard')
            }
        }
    }, [user, profile, loading, router])

    if (loading || !profile || profile.role !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        Verifying admin access...
                    </h2>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
            {/* Sidebar */}
            <aside
                className={`${collapsed ? 'w-20' : 'w-72'
                    } transition-all duration-300 ease-in-out bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-20`}
            >
                {/* Brand */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
                    {!collapsed && (
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                                <Shield className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Admin Panel
                            </span>
                        </div>
                    )}
                    {collapsed && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto">
                            <Shield className="w-4 h-4 text-white" />
                        </div>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors ${collapsed ? 'hidden' : ''}`}
                        id="toggle-sidebar"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1">
                    {collapsed && (
                        <button
                            onClick={() => setCollapsed(false)}
                            className="w-full flex items-center justify-center p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors mb-2"
                            id="expand-sidebar"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    )}
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                <item.icon
                                    className={`w-5 h-5 flex-shrink-0 ${isActive
                                            ? 'text-indigo-600 dark:text-indigo-400'
                                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                                        }`}
                                />
                                {!collapsed && (
                                    <span className="text-sm font-medium">
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* User section */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                    {!collapsed && (
                        <div className="flex items-center gap-3 px-3 py-2 mb-2">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                {profile?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {profile?.full_name || 'Admin'}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {profile?.email}
                                </p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={signOut}
                        id="admin-sign-out"
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ${collapsed ? 'justify-center' : ''
                            }`}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && (
                            <span className="text-sm font-medium">Sign Out</span>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main
                className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-72'
                    }`}
            >
                {/* Top bar */}
                <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 flex items-center px-8 sticky top-0 z-10">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Link
                            href="/dashboard/admin"
                            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                            Admin
                        </Link>
                        {pathname !== '/dashboard/admin' && (
                            <>
                                <span>/</span>
                                <span className="text-slate-900 dark:text-white font-medium">
                                    {pathname.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                </span>
                            </>
                        )}
                    </div>
                </header>

                {/* Page content */}
                <div className="p-8">{children}</div>
            </main>
        </div>
    )
}
