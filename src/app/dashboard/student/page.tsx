'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Calendar, Clock, Video, Search, BookOpen,
    Loader2, CalendarDays, LogOut, Sparkles, ExternalLink, Radio
} from 'lucide-react'

interface Booking {
    id: string
    mentor_id: string
    student_id: string
    start_time: string
    end_time: string
    duration_minutes: number
    slot_count: number
    status: 'scheduled' | 'completed' | 'cancelled'
    meet_link: string | null
    mentors: {
        profiles: { full_name: string }
        expertise: string[]
    }
}

/** Returns the call button state for a given booking */
function getCallState(startTime: string, endTime: string) {
    const now = Date.now()
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()
    const fiveMin = 5 * 60 * 1000

    if (now >= start && now <= end) return 'live'         // inside window → LIVE
    if (now >= start - fiveMin && now < start) return 'ready' // 5min before → READY
    if (now > end) return 'past'
    return 'upcoming'
}

/** Build a Google Calendar "add event" URL */
function buildGoogleCalendarUrl(opts: {
    title: string; startIso: string; endIso: string; meetLink: string; mentorName: string
}) {
    const fmt = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: opts.title,
        dates: `${fmt(opts.startIso)}/${fmt(opts.endIso)}`,
        details: `Join your Mentorly session with ${opts.mentorName}: ${opts.meetLink}`,
        location: opts.meetLink,
    })
    return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export default function StudentDashboard() {
    const { profile, signOut, loading: authLoading, supabase, user } = useAuth()
    const router = useRouter()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    // Tick every 30s so button states update
    const [, setTick] = useState(0)

    const fetchBookings = useCallback(async () => {
        if (!user?.id) return

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    id, mentor_id, student_id, start_time, end_time, duration_minutes, slot_count, status, meet_link,
                    mentors!inner(profiles!inner(full_name), expertise)
                `)
                .eq('student_id', user.id)
                .order('start_time', { ascending: true })

            if (!error) setBookings(data || [])
        } catch (err) {
            console.error('Error fetching bookings:', err)
        } finally {
            setLoading(false)
        }
    }, [supabase, user?.id])

    useEffect(() => {
        if (!authLoading && profile) {
            if (profile.role !== 'student') {
                router.replace('/dashboard')
            } else if (user?.id) {
                fetchBookings()
            }
        }
    }, [profile?.id, profile?.role, authLoading, user?.id, router, fetchBookings])

    // Refresh call states every 30 seconds
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30_000)
        return () => clearInterval(id)
    }, [])

    const upcomingBookings = bookings.filter(
        b => b.status === 'scheduled' && new Date(b.end_time) >= new Date()
    )
    const pastBookings = bookings.filter(
        b => b.status !== 'scheduled' || new Date(b.end_time) < new Date()
    )

    const getInitials = (name: string) =>
        name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

    const getAvatarGradient = (name: string) => {
        const g = [
            'from-indigo-500 to-purple-600', 'from-blue-500 to-cyan-500',
            'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500',
            'from-rose-500 to-pink-500', 'from-violet-500 to-purple-500',
            'from-sky-500 to-indigo-500',
        ]
        return g[(name?.charCodeAt(0) || 0) % g.length]
    }

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

    const formatTime = (d: string) =>
        new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    const getStatusBadge = (status: string, startTime: string, endTime: string) => {
        const state = getCallState(startTime, endTime)
        if (status === 'scheduled' && state === 'live') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    Live Now
                </span>
            )
        }
        if (status === 'scheduled' && (state === 'upcoming' || state === 'ready')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    Upcoming
                </span>
            )
        }
        if (status === 'completed') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                    Completed
                </span>
            )
        }
        if (status === 'cancelled') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                    Cancelled
                </span>
            )
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Past
            </span>
        )
    }

    /** Renders the join/scheduled button based on timing */
    const renderJoinButton = (booking: Booking) => {
        const state = getCallState(booking.start_time, booking.end_time)
        const canJoin = (state === 'live' || state === 'ready') && !!booking.meet_link

        if (state === 'live') {
            return (
                <a
                    href={booking.meet_link!}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-red-500/30 animate-pulse"
                >
                    <Radio className="w-4 h-4" />
                    Join Now
                </a>
            )
        }

        if (state === 'ready') {
            return (
                <a
                    href={booking.meet_link!}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-500/20"
                >
                    <Video className="w-4 h-4" />
                    Join Call
                </a>
            )
        }

        if (state === 'upcoming') {
            return (
                <button
                    disabled
                    title="Available 5 minutes before the session"
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-sm font-medium cursor-not-allowed border border-slate-200 dark:border-slate-700"
                >
                    <Clock className="w-4 h-4" />
                    Scheduled
                </button>
            )
        }

        return null
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-slate-500">Loading your dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Navigation */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Mentorly
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/explore"
                            className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                            <Search className="w-4 h-4" />
                            Explore Mentors
                        </Link>
                        <button
                            onClick={async () => {
                                await signOut()
                                router.push('/login')
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:border-indigo-400 transition-all"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Welcome Header */}
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9zdmc+')] opacity-50" />
                    <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <p className="text-indigo-200 text-sm font-medium mb-1">Welcome back,</p>
                            <h1 className="text-3xl font-bold tracking-tight">{profile?.full_name}</h1>
                            <p className="text-indigo-200 mt-1">
                                {upcomingBookings.length > 0
                                    ? `You have ${upcomingBookings.length} upcoming session${upcomingBookings.length !== 1 ? 's' : ''}`
                                    : 'No upcoming sessions — find a mentor to get started!'}
                            </p>
                        </div>
                        <Link
                            href="/explore"
                            className="flex items-center gap-2 px-6 py-3 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl font-medium text-sm border border-white/20 transition-all"
                        >
                            <Sparkles className="w-4 h-4" />
                            Find a Mentor
                        </Link>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                                <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{upcomingBookings.length}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Upcoming</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{bookings.filter(b => b.status === 'completed').length}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Completed</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/10 rounded-xl flex items-center justify-center">
                                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{bookings.length}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Total Sessions</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upcoming Sessions */}
                <section className="mb-10">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-3">
                        <CalendarDays className="w-5 h-5 text-indigo-500" />
                        My Upcoming Sessions
                    </h2>

                    {upcomingBookings.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center shadow-sm">
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8 text-indigo-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Upcoming Sessions</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                                You don&apos;t have any sessions scheduled. Browse our mentors to book your first session!
                            </p>
                            <Link
                                href="/explore"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/30"
                            >
                                <Search className="w-4 h-4" />
                                Find a Mentor
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {upcomingBookings.map((booking) => {
                                const mentorName = booking.mentors?.profiles?.full_name || 'Unknown Mentor'
                                const state = getCallState(booking.start_time, booking.end_time)
                                const isLive = state === 'live'

                                return (
                                    <div
                                        key={booking.id}
                                        className={`bg-white dark:bg-slate-900 rounded-2xl border p-6 shadow-sm transition-all ${isLive
                                            ? 'border-red-300 dark:border-red-700/50 ring-2 ring-red-500/20 shadow-red-100 dark:shadow-red-900/10'
                                            : 'border-slate-200 dark:border-slate-800 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800'
                                            }`}
                                    >
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarGradient(mentorName)} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                                                    {getInitials(mentorName)}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-slate-900 dark:text-white text-base">{mentorName}</h4>
                                                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                        <span className="flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {formatDate(booking.start_time)}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {formatTime(booking.start_time)} – {formatTime(booking.end_time)} ({booking.duration_minutes || 15} min)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 flex-wrap">
                                                {getStatusBadge(booking.status, booking.start_time, booking.end_time)}
                                                {renderJoinButton(booking)}
                                                {/* Google Calendar add — for upcoming sessions with a meet link */}
                                                {booking.meet_link && state === 'upcoming' && (
                                                    <a
                                                        href={buildGoogleCalendarUrl({
                                                            title: 'Mentorly Session',
                                                            startIso: booking.start_time,
                                                            endIso: booking.end_time,
                                                            meetLink: booking.meet_link,
                                                            mentorName,
                                                        })}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        title="Add to Google Calendar"
                                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                    >
                                                        <CalendarDays className="w-3.5 h-3.5" />
                                                        + Calendar
                                                        <ExternalLink className="w-3 h-3 opacity-60" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>

                {/* Past Sessions */}
                {pastBookings.length > 0 && (
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-3">
                            <Clock className="w-5 h-5 text-slate-400" />
                            Past Sessions
                        </h2>
                        <div className="space-y-3">
                            {pastBookings.map((booking) => {
                                const mentorName = booking.mentors?.profiles?.full_name || 'Unknown Mentor'
                                return (
                                    <div
                                        key={booking.id}
                                        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 opacity-75 hover:opacity-100 transition-opacity"
                                    >
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getAvatarGradient(mentorName)} flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
                                                    {getInitials(mentorName)}
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-slate-900 dark:text-white text-sm">{mentorName}</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        {formatDate(booking.start_time)} • {formatTime(booking.start_time)} – {formatTime(booking.end_time)} ({booking.duration_minutes || 15} min)
                                                    </p>
                                                </div>
                                            </div>
                                            {getStatusBadge(booking.status, booking.start_time, booking.end_time)}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}
