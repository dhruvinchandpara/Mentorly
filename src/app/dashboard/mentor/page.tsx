'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    CheckCircle2, Clock, IndianRupee, Tag, User, Save, X,
    AlertCircle, Calendar, Video, Radio, BookOpen,
    TrendingUp, Loader2, ExternalLink, ChevronLeft, ChevronRight, ChevronDown, ChevronUp
} from 'lucide-react'

interface MentorProfile {
    id: string
    bio: string
    background: string
    expertise: string[]
    is_active: boolean
    hourly_rate: number
}

interface AvailabilitySlot {
    id?: string
    day_of_week: number | null
    start_time: string
    end_time: string
    specific_date: string | null
}

interface Booking {
    id: string
    student_id: string
    start_time: string
    end_time: string
    duration_minutes: number
    slot_count: number
    status: 'scheduled' | 'completed' | 'cancelled'
    meet_link: string | null
    profiles: { full_name: string }
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function getCallState(startTime: string, endTime: string) {
    const now = Date.now()
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()
    const fiveMin = 5 * 60 * 1000
    if (now >= start && now <= end) return 'live'
    if (now >= start - fiveMin && now < start) return 'ready'
    if (now > end) return 'past'
    return 'upcoming'
}

export default function MentorDashboard() {
    const { profile, signOut, loading: authLoading, supabase } = useAuth()
    const router = useRouter()

    const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null)
    const [availability, setAvailability] = useState<Record<number, AvailabilitySlot>>({})
    const [customAvailability, setCustomAvailability] = useState<AvailabilitySlot[]>([])
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [savingProfile, setSavingProfile] = useState(false)
    const [savingAvailability, setSavingAvailability] = useState(false)
    const [markingComplete, setMarkingComplete] = useState<string | null>(null)
    const [showCompletedBookings, setShowCompletedBookings] = useState(false)
    const [showOlderPastBookings, setShowOlderPastBookings] = useState(false)

    const [bio, setBio] = useState('')
    const [background, setBackground] = useState('')
    const [expertiseInput, setExpertiseInput] = useState('')
    const [expertiseList, setExpertiseList] = useState<string[]>([])
    const [hourlyRate, setHourlyRate] = useState<number>(0)

    // Tick to refresh call states
    const [, setTick] = useState(0)

    useEffect(() => {
        if (!authLoading && profile) {
            if (profile.role !== 'mentor') {
                router.replace('/dashboard')
            } else if (profile.id) {
                fetchMentorData()
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.id, profile?.role, authLoading, router])

    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 30_000)
        return () => clearInterval(id)
    }, [])

    const fetchMentorData = useCallback(async () => {
        setLoading(true)
        try {
            const { data: mentorData } = await supabase
                .from('mentors')
                .select('*')
                .eq('id', profile!.id)
                .single()

            if (mentorData) {
                setMentorProfile(mentorData)
                setBio(mentorData.bio || '')
                setBackground(mentorData.background || '')
                setExpertiseList(mentorData.expertise || [])
                setHourlyRate(mentorData.hourly_rate || 0)
            }

            const { data: availData } = await supabase
                .from('availability')
                .select('*')
                .eq('mentor_id', profile!.id)

            if (availData) {
                const weekly: Record<number, AvailabilitySlot> = {}
                const custom: AvailabilitySlot[] = []
                availData.forEach((slot: any) => {
                    const parsed = {
                        id: slot.id,
                        day_of_week: slot.day_of_week,
                        start_time: slot.start_time.substring(0, 5),
                        end_time: slot.end_time.substring(0, 5),
                        specific_date: slot.specific_date
                    }
                    if (slot.specific_date) {
                        custom.push(parsed)
                    } else if (slot.day_of_week !== null) {
                        weekly[slot.day_of_week] = {
                            ...parsed,
                            specific_date: null
                        }
                    }
                })
                setAvailability(weekly)
                setCustomAvailability(custom)
            }

            // Fetch bookings for this mentor, joined with student profile
            const { data: bookingData } = await supabase
                .from('bookings')
                .select(`
                    id, student_id, start_time, end_time, duration_minutes, slot_count, status, meet_link,
                    profiles!bookings_student_id_fkey(full_name)
                `)
                .eq('mentor_id', profile!.id)
                .order('start_time', { ascending: true })

            setBookings(bookingData || [])
        } catch (err: any) {
            console.error('Error fetching data:', err.message || err, '| Details:', err.details)
        } finally {
            setLoading(false)
        }
    }, [supabase, profile])

    const handleAddExpertise = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && expertiseInput.trim()) {
            e.preventDefault()
            if (!expertiseList.includes(expertiseInput.trim())) {
                setExpertiseList([...expertiseList, expertiseInput.trim()])
            }
            setExpertiseInput('')
        }
    }

    const handleRemoveExpertise = (tag: string) =>
        setExpertiseList(expertiseList.filter(t => t !== tag))

    const saveProfile = async () => {
        if (!profile?.id) return
        setSavingProfile(true)
        try {
            const { error } = await supabase
                .from('mentors')
                .update({ bio, background, expertise: expertiseList })
                .eq('id', profile.id)
            if (error) throw error
            await fetchMentorData()
            alert('Profile updated successfully!')
        } catch (err: any) {
            console.error('Error updating profile:', err.message || err, '| Details:', err.details)
            alert(`Failed to update profile: ${err.message || 'Unknown error'}`)
        } finally {
            setSavingProfile(false)
        }
    }

    const toggleDay = (dayIndex: number) => {
        const newAvail = { ...availability }
        if (newAvail[dayIndex]) delete newAvail[dayIndex]
        else newAvail[dayIndex] = { day_of_week: dayIndex, start_time: '09:00', end_time: '17:00', specific_date: null }
        setAvailability(newAvail)
    }

    const updateTime = (dayIndex: number, field: 'start_time' | 'end_time', value: string) => {
        if (!availability[dayIndex]) return
        setAvailability({ ...availability, [dayIndex]: { ...availability[dayIndex], [field]: value } })
    }

    const saveAvailability = async () => {
        if (!profile?.id) return
        setSavingAvailability(true)
        try {
            // Delete all current availability and re-insert (simple sync)
            const { error: deleteError } = await supabase.from('availability').delete().eq('mentor_id', profile.id)
            if (deleteError) throw deleteError

            const recurring = Object.values(availability).map(slot => ({
                mentor_id: profile.id,
                day_of_week: slot.day_of_week,
                start_time: `${slot.start_time}:00`,
                end_time: `${slot.end_time}:00`,
                specific_date: null
            }))

            const custom = customAvailability.map(slot => ({
                mentor_id: profile.id,
                day_of_week: null,
                start_time: `${slot.start_time}:00`,
                end_time: `${slot.end_time}:00`,
                specific_date: slot.specific_date
            }))

            const slotsToInsert = [...recurring, ...custom]

            if (slotsToInsert.length > 0) {
                const { error } = await supabase.from('availability').insert(slotsToInsert)
                if (error) throw error
            }

            alert('Schedule saved successfully!')
            await fetchMentorData()
        } catch (err: any) {
            console.error('Error saving availability:', err.message || err, '| Details:', err.details, '| Hint:', err.hint)
            alert(`Failed to save schedule: ${err.message || 'Unknown error'}`)
        } finally {
            setSavingAvailability(false)
        }
    }

    // Calendar logic
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const [viewMonth, setViewMonth] = useState(new Date().getMonth())
    const [viewYear, setViewYear] = useState(new Date().getFullYear())

    const addCustomSlot = (dateStr: string) => {
        const newSlot: AvailabilitySlot = {
            day_of_week: null,
            start_time: '09:00',
            end_time: '10:00',
            specific_date: dateStr
        }
        setCustomAvailability([...customAvailability, newSlot])
    }

    const removeCustomSlot = (index: number) => {
        setCustomAvailability(customAvailability.filter((_, i) => i !== index))
    }

    const updateCustomTime = (index: number, field: 'start_time' | 'end_time', value: string) => {
        const updated = [...customAvailability]
        updated[index] = { ...updated[index], [field]: value }
        setCustomAvailability(updated)
    }

    const markCompleted = async (bookingId: string) => {
        setMarkingComplete(bookingId)
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'completed' })
                .eq('id', bookingId)
            if (error) throw error
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'completed' } : b))
        } catch (err: any) {
            console.error('Error marking completed:', err.message || err, '| Details:', err.details)
            alert(`Failed to update booking status: ${err.message || 'Unknown error'}`)
        } finally {
            setMarkingComplete(null)
        }
    }

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

    const formatTime = (d: string) =>
        new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    // Derived stats
    const upcomingBookings = bookings.filter(b => b.status === 'scheduled' && new Date(b.end_time) >= new Date())
    const completedBookings = bookings.filter(b => b.status === 'completed')

    // Calculate total earned based on actual booking durations
    const totalEarned = completedBookings.reduce((sum, booking) => {
        const duration = booking.duration_minutes || 60
        const earned = ((mentorProfile?.hourly_rate || 0) * duration) / 60
        return sum + earned
    }, 0)

    const pastScheduled = bookings.filter(b => b.status === 'scheduled' && new Date(b.end_time) < new Date())

    // Split past scheduled into recent (show 3 most recent) and older (collapsible)
    const RECENT_PAST_LIMIT = 3
    const recentPastBookings = pastScheduled.slice(0, RECENT_PAST_LIMIT)
    const olderPastBookings = pastScheduled.slice(RECENT_PAST_LIMIT)

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 pt-24 font-sans text-slate-900 dark:text-slate-100">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* ── Header ──────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold tracking-tight">Welcome, {profile?.full_name}</h1>
                            {mentorProfile?.is_active ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                    <CheckCircle2 className="w-4 h-4" /> Active
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                                    <AlertCircle className="w-4 h-4" /> Pending Approval
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400">Manage your professional presence and scheduling</p>
                    </div>
                    <button
                        onClick={async () => {
                            await signOut()
                            router.push('/login')
                        }}
                        className="px-5 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 hover:border-slate-300 transition-all font-medium"
                    >
                        Sign Out
                    </button>
                </div>

                {/* ── Stats Strip ──────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-500/10 rounded-lg flex items-center justify-center mb-3">
                            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <p className="text-2xl font-bold">{upcomingBookings.length}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Upcoming</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg flex items-center justify-center mb-3">
                            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-2xl font-bold">{completedBookings.length}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Completed</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="w-9 h-9 bg-purple-100 dark:bg-purple-500/10 rounded-lg flex items-center justify-center mb-3">
                            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <p className="text-2xl font-bold">{bookings.length}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Total Sessions</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-4 shadow-sm shadow-emerald-500/30">
                        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center mb-3">
                            <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-2xl font-bold text-white">₹{Math.round(totalEarned).toLocaleString('en-IN')}</p>
                        <p className="text-xs text-emerald-100 mt-0.5">Total Earned</p>
                    </div>
                </div>

                {/* ── My Bookings ──────────────────────────────────── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-500" />
                            My Bookings
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Upcoming sessions with your students
                        </p>
                    </div>

                    {bookings.filter(b => b.status !== 'cancelled').length === 0 ? (
                        <div className="p-10 text-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400">No bookings yet. Once students book you, they&apos;ll appear here.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {/* Upcoming / Active Bookings - Always shown */}
                            {upcomingBookings.map((booking) => {
                                const state = getCallState(booking.start_time, booking.end_time)
                                const isLive = state === 'live'
                                const isReady = state === 'ready'
                                const isPastScheduled = state === 'past'
                                const studentName = booking.profiles?.full_name || 'Unknown Student'

                                return (
                                    <div
                                        key={booking.id}
                                        className={`px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${isLive ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                                                {studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{studentName}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {formatDate(booking.start_time)}
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatTime(booking.start_time)} – {formatTime(booking.end_time)} ({booking.duration_minutes || 15} min)
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 flex-wrap">
                                            {/* Status badge */}
                                            {isLive && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                                                    <Radio className="w-3.5 h-3.5 animate-pulse" /> Live Now
                                                </span>
                                            )}
                                            {!isLive && !isPastScheduled && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                    Upcoming
                                                </span>
                                            )}

                                            {/* Join call */}
                                            {(isLive || isReady) && booking.meet_link && (
                                                <a
                                                    href={booking.meet_link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${isLive
                                                        ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-500/30 animate-pulse'
                                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20'
                                                        }`}
                                                >
                                                    {isLive ? <Radio className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                                                    {isLive ? 'Join Now' : 'Join Call'}
                                                </a>
                                            )}
                                            {!isLive && !isReady && !isPastScheduled && booking.meet_link && (
                                                <a
                                                    href={booking.meet_link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    title="Copy meeting link"
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                                                >
                                                    <Video className="w-3.5 h-3.5" />
                                                    Meeting Link
                                                    <ExternalLink className="w-3 h-3 opacity-60" />
                                                </a>
                                            )}

                                            {/* Mark as completed — for past/live scheduled sessions */}
                                            {(isPastScheduled || isLive) && (
                                                <button
                                                    onClick={() => markCompleted(booking.id)}
                                                    disabled={markingComplete === booking.id}
                                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-emerald-500/20"
                                                >
                                                    {markingComplete === booking.id
                                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                                        : <CheckCircle2 className="w-4 h-4" />
                                                    }
                                                    Mark as Completed
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Recent Past Bookings (not marked completed yet) - Show 3 most recent */}
                            {recentPastBookings.map((booking) => {
                                const state = getCallState(booking.start_time, booking.end_time)
                                const isLive = state === 'live'
                                const isReady = state === 'ready'
                                const isPastScheduled = state === 'past'
                                const studentName = booking.profiles?.full_name || 'Unknown Student'

                                return (
                                    <div
                                        key={booking.id}
                                        className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-amber-50/30 dark:bg-amber-950/10 border-l-2 border-amber-400 dark:border-amber-600"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                                                {studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{studentName}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {formatDate(booking.start_time)}
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatTime(booking.start_time)} – {formatTime(booking.end_time)} ({booking.duration_minutes || 15} min)
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                Needs Review
                                            </span>
                                            <button
                                                onClick={() => markCompleted(booking.id)}
                                                disabled={markingComplete === booking.id}
                                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-emerald-500/20"
                                            >
                                                {markingComplete === booking.id
                                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                                    : <CheckCircle2 className="w-4 h-4" />
                                                }
                                                Mark as Completed
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Older Past Bookings - Collapsible */}
                            {olderPastBookings.length > 0 && (
                                <>
                                    <button
                                        onClick={() => setShowOlderPastBookings(!showOlderPastBookings)}
                                        className="w-full px-6 py-4 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <AlertCircle className="w-4 h-4 text-amber-500" />
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                Older Sessions Needing Review ({olderPastBookings.length})
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                {showOlderPastBookings ? 'Hide' : 'Show'}
                                            </span>
                                            {showOlderPastBookings ? (
                                                <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                                            )}
                                        </div>
                                    </button>
                                    {showOlderPastBookings && olderPastBookings.map(booking => {
                                        const studentName = booking.profiles?.full_name || 'Unknown Student'
                                        return (
                                            <div
                                                key={booking.id}
                                                className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-50/20 dark:bg-amber-950/10 border-l-2 border-amber-300 dark:border-amber-700"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                                                        {studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white text-sm">{studentName}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            {formatDate(booking.start_time)} • {formatTime(booking.start_time)} – {formatTime(booking.end_time)} ({booking.duration_minutes || 15} min)
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => markCompleted(booking.id)}
                                                    disabled={markingComplete === booking.id}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-xs font-semibold transition-colors"
                                                >
                                                    {markingComplete === booking.id
                                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        : <CheckCircle2 className="w-3.5 h-3.5" />
                                                    }
                                                    Mark Completed
                                                </button>
                                            </div>
                                        )
                                    })}
                                </>
                            )}

                            {/* Completed sessions - Collapsible */}
                            {completedBookings.length > 0 && (
                                <>
                                    <button
                                        onClick={() => setShowCompletedBookings(!showCompletedBookings)}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                Completed Sessions ({completedBookings.length})
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                {showCompletedBookings ? 'Hide' : 'Show'}
                                            </span>
                                            {showCompletedBookings ? (
                                                <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                                            )}
                                        </div>
                                    </button>
                                    {showCompletedBookings && completedBookings.map(booking => {
                                        const studentName = booking.profiles?.full_name || 'Unknown Student'
                                        const duration = booking.duration_minutes || 60
                                        const earned = Math.round(((mentorProfile?.hourly_rate || 0) * duration) / 60)
                                        return (
                                            <div
                                                key={booking.id}
                                                className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 opacity-80 hover:opacity-100 transition-opacity border-l-2 border-emerald-200 dark:border-emerald-800"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                                                        {studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white text-sm">{studentName}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            {formatDate(booking.start_time)} • {formatTime(booking.start_time)} – {formatTime(booking.end_time)} ({booking.duration_minutes || 15} min)
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                                        Completed
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                                                        <IndianRupee className="w-3 h-3" />
                                                        +₹{earned} Earned
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Profile & Availability side-by-side ──────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Profile Editor */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <User className="w-5 h-5 text-indigo-500" />
                                Profile Information
                            </h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Professional Bio</label>
                                <textarea
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                                    rows={4}
                                    placeholder="Tell students about your background..."
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Work Experience / Background</label>
                                <textarea
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                                    rows={4}
                                    placeholder="Briefly describe your professional background and achievements..."
                                    value={background}
                                    onChange={(e) => setBackground(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-slate-400" />
                                    Areas of Expertise
                                </label>
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        placeholder="Type a skill and press Enter (e.g. React)"
                                        value={expertiseInput}
                                        onChange={(e) => setExpertiseInput(e.target.value)}
                                        onKeyDown={handleAddExpertise}
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {expertiseList.map((tag) => (
                                            <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm border border-indigo-100 dark:border-indigo-500/20">
                                                {tag}
                                                <button onClick={() => handleRemoveExpertise(tag)} className="hover:bg-indigo-200 dark:hover:bg-indigo-500/30 rounded-full p-0.5 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <IndianRupee className="w-4 h-4 text-slate-400" />
                                    Hourly Rate
                                </label>
                                <div className="relative max-w-xs">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-slate-500 sm:text-sm">₹</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                        {hourlyRate || '0.00'}
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                        Hourly rate can only be adjusted by an administrator.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={saveProfile}
                                    disabled={savingProfile}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-xl font-medium transition-colors shadow-sm shadow-indigo-600/20"
                                >
                                    {savingProfile ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                                    Update Profile
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Availability Manager */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-500" />
                                Weekly Schedule
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Set your standard working hours for bookings.</p>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="space-y-4 flex-1">
                                {DAYS_OF_WEEK.map((day, index) => {
                                    const isAvailable = !!availability[index]
                                    return (
                                        <div key={day} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${isAvailable ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' : 'bg-transparent border-slate-100 dark:border-slate-800/50'}`}>
                                            <div className="w-32 flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    id={`day-${index}`}
                                                    checked={isAvailable}
                                                    onChange={() => toggleDay(index)}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 transition-all cursor-pointer"
                                                />
                                                <label htmlFor={`day-${index}`} className={`text-sm font-medium cursor-pointer ${isAvailable ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                                                    {day}
                                                </label>
                                            </div>
                                            <div className={`flex items-center gap-2 flex-1 transition-opacity duration-200 ${isAvailable ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                                <input
                                                    type="time"
                                                    value={availability[index]?.start_time || '09:00'}
                                                    onChange={(e) => updateTime(index, 'start_time', e.target.value)}
                                                    className="w-32 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                />
                                                <span className="text-slate-400 text-sm">to</span>
                                                <input
                                                    type="time"
                                                    value={availability[index]?.end_time || '17:00'}
                                                    onChange={(e) => updateTime(index, 'end_time', e.target.value)}
                                                    className="w-32 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={saveAvailability}
                                    disabled={savingAvailability}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-xl font-medium transition-colors shadow-sm shadow-indigo-600/20"
                                >
                                    {savingAvailability ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                                    Save Availability
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Date-Specific Calendar Availability */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-indigo-500" />
                                Date-Specific Slots
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Add one-off availability for specific dates.</p>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Simple Mini Calendar */}
                            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/30 dark:bg-slate-950/20">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-slate-900 dark:text-white">{monthNames[viewMonth]} {viewYear}</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1) } else setViewMonth(v => v - 1) }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                            < ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1) } else setViewMonth(v => v + 1) }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                            < ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="text-[10px] font-bold text-slate-400 uppercase">{d}</div>)}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: getFirstDayOfMonth(viewYear, viewMonth) }).map((_, i) => <div key={`empty-${i}`} />)}
                                    {Array.from({ length: getDaysInMonth(viewYear, viewMonth) }).map((_, i) => {
                                        const day = i + 1
                                        const dateObj = new Date(viewYear, viewMonth, day)
                                        const dateStr = dateObj.toISOString().split('T')[0]
                                        const isSelected = selectedDate.toISOString().split('T')[0] === dateStr
                                        const hasSlots = customAvailability.some(s => s.specific_date === dateStr)
                                        return (
                                            <button
                                                key={day}
                                                onClick={() => setSelectedDate(dateObj)}
                                                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all relative ${isSelected ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                            >
                                                {day}
                                                {hasSlots && <div className={`w-1 h-1 rounded-full absolute bottom-1 ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Selected Day Slots */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        Slots for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </h4>
                                    <button
                                        onClick={() => addCustomSlot(selectedDate.toISOString().split('T')[0])}
                                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                        + Add Slot
                                    </button>
                                </div>

                                {customAvailability.filter(s => s.specific_date === selectedDate.toISOString().split('T')[0]).length === 0 ? (
                                    <p className="text-xs text-slate-500 text-center py-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                        No specific slots for this date.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {customAvailability.map((slot, index) => {
                                            if (slot.specific_date !== selectedDate.toISOString().split('T')[0]) return null
                                            return (
                                                <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 transition-all group">
                                                    <Clock className="w-4 h-4 text-slate-400" />
                                                    <input
                                                        type="time"
                                                        value={slot.start_time}
                                                        onChange={(e) => updateCustomTime(index, 'start_time', e.target.value)}
                                                        className="bg-transparent border-none p-0 text-sm focus:ring-0 w-24"
                                                    />
                                                    <span className="text-slate-400 text-xs">to</span>
                                                    <input
                                                        type="time"
                                                        value={slot.end_time}
                                                        onChange={(e) => updateCustomTime(index, 'end_time', e.target.value)}
                                                        className="bg-transparent border-none p-0 text-sm focus:ring-0 w-24"
                                                    />
                                                    <button onClick={() => removeCustomSlot(index)} className="ml-auto opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 transition-opacity">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={saveAvailability}
                                    disabled={savingAvailability}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-xl font-medium transition-colors shadow-sm shadow-indigo-600/20"
                                >
                                    {savingAvailability ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                                    Save All Schedule
                                </button>
                                <p className="mt-3 text-[10px] text-slate-500 text-center">
                                    Saving will update both your weekly schedule and specific date slots.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
