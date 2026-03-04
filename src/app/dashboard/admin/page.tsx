'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
    Users,
    Clock,
    CalendarCheck,
    TrendingUp,
    UserCheck,
    AlertCircle,
    Loader2,
    Mail,
} from 'lucide-react'
import Link from 'next/link'

type Metrics = {
    totalMentors: number
    pendingApprovals: number
    totalBookings: number
    activeMentors: number
    authorizedStudents: number
}

type RecentMentor = {
    id: string
    full_name: string | null
    email: string | null
    is_active: boolean
    hourly_rate: number | null
}

type RecentSession = {
    id: string
    studentName: string
    mentorName: string
    startTime: string
    duration: number
    status: string
}

export default function AdminDashboard() {
    const { supabase, loading: authLoading } = useAuth()
    const [metrics, setMetrics] = useState<Metrics>({
        totalMentors: 0,
        pendingApprovals: 0,
        totalBookings: 0,
        activeMentors: 0,
        authorizedStudents: 0,
    })
    const [recentMentors, setRecentMentors] = useState<RecentMentor[]>([])
    const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!authLoading) {
            fetchMetrics()
        }
    }, [authLoading])

    const fetchMetrics = async () => {
        try {
            // Fetch total mentors
            const { count: totalMentors } = await supabase
                .from('mentors')
                .select('*', { count: 'exact', head: true })

            // Fetch pending approvals (mentors with is_active = false)
            const { count: pendingApprovals } = await supabase
                .from('mentors')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', false)

            // Fetch active mentors
            const { count: activeMentors } = await supabase
                .from('mentors')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)

            // Fetch total bookings
            const { count: totalBookings } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })

            // Fetch total authorized students
            const { count: authorizedStudents } = await supabase
                .from('authorized_students')
                .select('*', { count: 'exact', head: true })

            // Fetch recent mentors with profile info
            const { data: mentorsList } = await supabase
                .from('mentors')
                .select(`
                    id,
                    is_active,
                    hourly_rate,
                    profiles!inner (
                        full_name,
                        email
                    )
                `)
                .order('is_active', { ascending: true })
                .limit(5)

            setMetrics({
                totalMentors: totalMentors || 0,
                pendingApprovals: pendingApprovals || 0,
                totalBookings: totalBookings || 0,
                activeMentors: activeMentors || 0,
                authorizedStudents: authorizedStudents || 0,
            })

            if (mentorsList) {
                setRecentMentors(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    mentorsList.map((m: any) => ({
                        id: m.id,
                        full_name: m.profiles?.full_name || null,
                        email: m.profiles?.email || null,
                        is_active: m.is_active,
                        hourly_rate: m.hourly_rate,
                    }))
                )
            }

            // Fetch recent sessions
            const { data: sessionsList } = await supabase
                .from('bookings')
                .select(`
                    id,
                    start_time,
                    duration_minutes,
                    status,
                    student_profiles:profiles!bookings_student_id_fkey(full_name),
                    mentor_profiles:mentors(profiles(full_name))
                `)
                .order('start_time', { ascending: false })
                .limit(5)

            if (sessionsList) {
                setRecentSessions(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    sessionsList.map((s: any) => ({
                        id: s.id,
                        studentName: s.student_profiles?.full_name || 'Unknown',
                        mentorName: s.mentor_profiles?.profiles?.full_name || 'Unknown',
                        startTime: s.start_time,
                        duration: s.duration_minutes || 60,
                        status: s.status,
                    }))
                )
            }
        } catch (error) {
            console.error('Error fetching metrics:', error)
        } finally {
            setLoading(false)
        }
    }

    const metricCards = [
        {
            label: 'Total Mentors',
            value: metrics.totalMentors,
            icon: Users,
            color: 'from-indigo-500 to-indigo-600',
            bgLight: 'bg-indigo-50 dark:bg-indigo-950/30',
            textColor: 'text-indigo-600 dark:text-indigo-400',
        },
        {
            label: 'Pending Approvals',
            value: metrics.pendingApprovals,
            icon: Clock,
            color: 'from-amber-500 to-orange-500',
            bgLight: 'bg-amber-50 dark:bg-amber-950/30',
            textColor: 'text-amber-600 dark:text-amber-400',
        },
        {
            label: 'Total Bookings',
            value: metrics.totalBookings,
            icon: CalendarCheck,
            color: 'from-emerald-500 to-green-600',
            bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
            textColor: 'text-emerald-600 dark:text-emerald-400',
        },
        {
            label: 'Active Mentors',
            value: metrics.activeMentors,
            icon: TrendingUp,
            color: 'from-violet-500 to-purple-600',
            bgLight: 'bg-violet-50 dark:bg-violet-950/30',
            textColor: 'text-violet-600 dark:text-violet-400',
        },
        {
            label: 'Authorized Students',
            value: metrics.authorizedStudents,
            icon: Mail,
            color: 'from-blue-500 to-indigo-600',
            bgLight: 'bg-blue-50 dark:bg-blue-950/30',
            textColor: 'text-blue-600 dark:text-blue-400',
            link: '/dashboard/admin/students'
        },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        )
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Dashboard Overview
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Monitor and manage your platform at a glance.
                </p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {metricCards.map((card) => {
                    const CardContent = (
                        <div
                            key={card.label}
                            id={`metric-${card.label.toLowerCase().replace(/\s+/g, '-')}`}
                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 group h-full"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div
                                    className={`w-12 h-12 rounded-xl ${card.bgLight} flex items-center justify-center`}
                                >
                                    <card.icon
                                        className={`w-6 h-6 ${card.textColor}`}
                                    />
                                </div>
                                <div
                                    className={`w-2 h-2 rounded-full bg-gradient-to-r ${card.color} opacity-60 group-hover:opacity-100 transition-opacity`}
                                />
                            </div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                                {card.label}
                            </p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                {card.value}
                            </p>
                        </div>
                    )

                    return card.link ? (
                        <Link href={card.link} key={card.label}>
                            {CardContent}
                        </Link>
                    ) : (
                        <div key={card.label}>{CardContent}</div>
                    )
                })}
            </div>

            {/* Recent Mentors */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Recent Mentors
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Latest mentor registrations
                        </p>
                    </div>
                    <Link
                        href="/dashboard/admin/mentors"
                        id="view-all-mentors"
                        className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                    >
                        View All →
                    </Link>
                </div>

                {recentMentors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <AlertCircle className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                            No mentors yet
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm">
                            When mentors sign up, they&apos;ll appear here for review and approval.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {recentMentors.map((mentor) => (
                            <div
                                key={mentor.id}
                                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                                        {mentor.full_name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {mentor.full_name || 'Unnamed Mentor'}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {mentor.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                        {mentor.hourly_rate ? `₹${mentor.hourly_rate}/hr` : '—'}
                                    </span>
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${mentor.is_active
                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                                            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                                            }`}
                                    >
                                        {mentor.is_active ? (
                                            <>
                                                <UserCheck className="w-3 h-3" />
                                                Active
                                            </>
                                        ) : (
                                            <>
                                                <Clock className="w-3 h-3" />
                                                Pending
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Sessions */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mt-8">
                <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Sessions</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Latest mentee-mentor meetings</p>
                </div>
                {recentSessions.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">No sessions recorded yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">Student / Mentor</th>
                                    <th className="px-6 py-3">Scheduled Date</th>
                                    <th className="px-6 py-3">Duration</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {recentSessions.map((session) => (
                                    <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-900 dark:text-white">{session.studentName}</div>
                                            <div className="text-xs text-slate-500">with {session.mentorName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {new Date(session.startTime).toLocaleDateString()} at {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
                                                <Clock className="w-3.5 h-3.5" />
                                                {session.duration} min
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${session.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {session.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
