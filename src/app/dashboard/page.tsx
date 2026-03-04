'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
    const { user, profile, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login')
            } else if (profile) {
                if (profile.role === 'admin') {
                    router.push('/dashboard/admin')
                } else if (profile.role === 'mentor') {
                    router.push('/dashboard/mentor')
                } else {
                    router.push('/dashboard/student')
                }
            }
        }
    }, [user, profile, loading, router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Loading your dashboard...</h2>
            </div>
        </div>
    )
}
