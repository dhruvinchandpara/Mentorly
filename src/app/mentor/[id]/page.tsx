'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { processBooking } from '@/app/actions/booking'
import {
    ArrowLeft, Calendar, Clock, Tag, CheckCircle,
    Sparkles, CalendarDays, ChevronLeft, ChevronRight, Loader2,
    BookOpen, Video, ExternalLink
} from 'lucide-react'

interface MentorProfile {
    id: string
    bio: string
    expertise: string[]
    hourly_rate: number
    is_active: boolean
    profiles: {
        full_name: string
        email: string
    }
}

interface AvailabilitySlot {
    id: string
    day_of_week: number | null
    start_time: string
    end_time: string
    specific_date: string | null
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function generateTimeSlots(startTime: string, endTime: string): string[] {
    const slots: string[] = []
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)

    // Convert to total minutes for easier calculation
    let currentMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    // Generate 15-minute slots
    while (currentMinutes < endMinutes) {
        const hours = Math.floor(currentMinutes / 60)
        const minutes = currentMinutes % 60
        const hourStr = String(hours).padStart(2, '0')
        const minStr = String(minutes).padStart(2, '0')
        slots.push(`${hourStr}:${minStr}`)
        currentMinutes += 15 // Increment by 15 minutes
    }
    return slots
}

function formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}


/** Build a Google Calendar "add event" URL */
function buildGoogleCalendarUrl(opts: {
    title: string
    startIso: string
    endIso: string
    meetLink: string
    mentorName: string
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

export default function MentorBookingPage() {
    const { supabase, user } = useAuth()
    const params = useParams()
    const router = useRouter()
    const mentorId = params.id as string

    const [mentor, setMentor] = useState<MentorProfile | null>(null)
    const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
    const [loading, setLoading] = useState(true)
    const [booking, setBooking] = useState(false)
    const [bookedInfo, setBookedInfo] = useState<{
        startIso: string
        endIso: string
        meetLink: string
    } | null>(null)

    const [weekOffset, setWeekOffset] = useState(0)
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedTime, setSelectedTime] = useState<string | null>(null)
    const [slotCount, setSlotCount] = useState(1) // 1 = 15min, 2 = 30min
    const [bookedSlots, setBookedSlots] = useState<string[]>([])

    useEffect(() => {
        if (mentorId) fetchMentorData()
    }, [mentorId])

    // Fetch booked slots when date is selected
    useEffect(() => {
        if (selectedDate && mentorId) {
            fetchBookedSlotsForDate(selectedDate)
        }
    }, [selectedDate, mentorId])

    const fetchMentorData = async () => {
        setLoading(true)
        try {
            const { data: mentorData } = await supabase
                .from('mentors')
                .select(`id, bio, expertise, hourly_rate, is_active, profiles!inner(full_name, email)`)
                .eq('id', mentorId)
                .single()

            if (mentorData) setMentor(mentorData)

            const { data: availData } = await supabase
                .from('availability')
                .select('*')
                .eq('mentor_id', mentorId)

            setAvailability(availData || [])
        } catch (err) {
            console.error('Error fetching mentor data:', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchBookedSlotsForDate = async (date: Date) => {
        try {
            // Get start and end of the selected day in local time, then convert to UTC
            const startOfDay = new Date(date)
            startOfDay.setHours(0, 0, 0, 0)
            const endOfDay = new Date(date)
            endOfDay.setHours(23, 59, 59, 999)

            const { data: bookings } = await supabase
                .from('bookings')
                .select('start_time, end_time, duration_minutes')
                .eq('mentor_id', mentorId)
                .eq('status', 'scheduled')
                .gte('start_time', startOfDay.toISOString())
                .lte('start_time', endOfDay.toISOString())

            if (!bookings) {
                setBookedSlots([])
                return
            }

            // Convert bookings to 15-minute slot strings (HH:MM format)
            const slots: string[] = []
            bookings.forEach(booking => {
                const start = new Date(booking.start_time)
                const durationMinutes = booking.duration_minutes || 15

                // Generate all 15-min slots covered by this booking
                for (let i = 0; i < durationMinutes; i += 15) {
                    const slotTime = new Date(start.getTime() + i * 60 * 1000)
                    const hours = String(slotTime.getHours()).padStart(2, '0')
                    const minutes = String(slotTime.getMinutes()).padStart(2, '0')
                    slots.push(`${hours}:${minutes}`)
                }
            })

            setBookedSlots(slots)
        } catch (err) {
            console.error('Error fetching booked slots:', err)
            setBookedSlots([])
        }
    }

    const weekDates = useMemo(() => {
        const today = new Date()
        const startOfWeek = new Date(today)
        startOfWeek.setDate(today.getDate() + weekOffset * 7)
        const start = weekOffset === 0 ? today : startOfWeek
        const dates: Date[] = []
        for (let i = 0; i < 7; i++) {
            const d = new Date(start)
            d.setDate(start.getDate() + i)
            dates.push(d)
        }
        return dates
    }, [weekOffset])

    // Check if a slot and the next (slotCount - 1) consecutive slots are all available
    const isSlotAvailable = (time: string, allSlots: string[], count: number): boolean => {
        const timeIndex = allSlots.indexOf(time)
        if (timeIndex === -1) return false

        // Check if we have enough consecutive slots
        if (timeIndex + count > allSlots.length) return false

        // Check if all required slots are not booked
        for (let i = 0; i < count; i++) {
            const slotToCheck = allSlots[timeIndex + i]
            if (bookedSlots.includes(slotToCheck)) {
                return false
            }
        }
        return true
    }

    const getSlotsForDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`
        const dayOfWeek = date.getDay()

        console.log(`Checking slots for ${dateStr} (Day: ${dayOfWeek})`)

        // 1. Check for specific date override first
        const specificSlots = availability.filter(a => {
            if (!a.specific_date) return false
            // Handle various date formats (string, ISO string, etc)
            const ruleDate = String(a.specific_date).split('T')[0]
            return ruleDate === dateStr
        })

        if (specificSlots.length > 0) {
            const slots: string[] = []
            specificSlots.forEach(s => {
                if (s.start_time && s.end_time) {
                    slots.push(...generateTimeSlots(String(s.start_time).substring(0, 5), String(s.end_time).substring(0, 5)))
                }
            })
            return slots
        }

        // 2. Fallback to weekly recurring
        const weeklySlots = availability.filter(a => {
            if (a.specific_date) return false
            // Handle day of week as number or string, and handle Sun=0 or Sun=7
            const ruleDay = Number(a.day_of_week)
            return ruleDay === dayOfWeek || (dayOfWeek === 0 && ruleDay === 7)
        })

        if (weeklySlots.length === 0) return []
        const slots: string[] = []
        weeklySlots.forEach(a => {
            if (a.start_time && a.end_time) {
                slots.push(...generateTimeSlots(String(a.start_time).substring(0, 5), String(a.end_time).substring(0, 5)))
            }
        })
        return slots
    }

    const handleBookSession = async () => {
        if (!selectedDate || !selectedTime || !user) {
            if (!user) router.push('/login')
            return
        }

        setBooking(true)
        try {
            const [h, m] = selectedTime.split(':').map(Number)
            const startDateTime = new Date(selectedDate)
            startDateTime.setHours(h, m, 0, 0)

            // Calculate end time based on slot count (each slot is 15 minutes)
            const durationMinutes = slotCount * 15
            const endDateTime = new Date(startDateTime)
            endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes)

            // Convert to ISO/UTC format for storage
            // The user's browser timezone is preserved in the Date object,
            // and toISOString() converts it to UTC for consistent storage
            const result = await processBooking({
                mentorId,
                studentId: user.id,
                startTime: startDateTime.toISOString(), // Stored in UTC
                endTime: endDateTime.toISOString(),     // Stored in UTC
                durationMinutes: durationMinutes,
                slotCount: slotCount,
            })

            if (!result.success) {
                console.error('Booking error:', result.error)
                alert('Failed to book session: ' + result.error)
                return
            }

            setBookedInfo({
                startIso: startDateTime.toISOString(),
                endIso: endDateTime.toISOString(),
                meetLink: result.meetLink || '',
            })
        } catch (err) {
            console.error('Unexpected error:', err)
            alert('An unexpected error occurred.')
        } finally {
            setBooking(false)
        }
    }

    const getInitials = (name: string) =>
        name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

    const getAvatarGradient = (name: string) => {
        const gradients = [
            'from-indigo-500 to-purple-600', 'from-blue-500 to-cyan-500',
            'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500',
            'from-rose-500 to-pink-500', 'from-violet-500 to-purple-500',
            'from-sky-500 to-indigo-500',
        ]
        return gradients[(name?.charCodeAt(0) || 0) % gradients.length]
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        )
    }

    if (!mentor) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BookOpen className="w-10 h-10 text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Mentor Not Found</h2>
                    <p className="text-slate-500 mb-6">This mentor profile doesn&apos;t exist or has been removed.</p>
                    <Link href="/explore" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
                        Browse Mentors
                    </Link>
                </div>
            </div>
        )
    }

    // ── Booking Confirmed ──────────────────────────────────────────────────────
    if (bookedInfo) {
        const calUrl = buildGoogleCalendarUrl({
            title: 'Mentorly Session',
            startIso: bookedInfo.startIso,
            endIso: bookedInfo.endIso,
            meetLink: bookedInfo.meetLink,
            mentorName: mentor.profiles?.full_name,
        })

        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-8">
                <div className="max-w-md w-full text-center">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-10 shadow-xl">
                        {/* Success Icon */}
                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Session Booked!</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-2">
                            Your session with <span className="font-semibold text-slate-900 dark:text-white">{mentor.profiles?.full_name}</span> has been confirmed.
                        </p>

                        {/* Session details */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 my-6 border border-slate-100 dark:border-slate-700 text-left space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Clock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {selectedTime && formatTime(selectedTime)} ({slotCount * 15} minutes)
                                </span>
                            </div>
                            {bookedInfo.meetLink && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Video className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                    <a
                                        href={bookedInfo.meetLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline truncate"
                                    >
                                        Join Meeting Room
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col gap-3">
                            <a
                                href={calUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border-2 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-xl font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                            >
                                <CalendarDays className="w-4 h-4" />
                                Add to Google Calendar
                                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                            </a>
                            <Link
                                href="/dashboard/student"
                                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/30 text-center"
                            >
                                Go to Dashboard
                            </Link>
                            <Link
                                href="/explore"
                                className="w-full px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:border-indigo-400 transition-colors text-center"
                            >
                                Browse More Mentors
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ── Main Booking UI ────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Mentorly
                    </Link>
                    <Link href="/explore" className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Explore
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Sidebar — Mentor Profile */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className={`h-24 bg-gradient-to-br ${getAvatarGradient(mentor.profiles?.full_name || '')} relative`}>
                                <div className="absolute -bottom-10 left-6">
                                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${getAvatarGradient(mentor.profiles?.full_name || '')} flex items-center justify-center text-white font-bold text-2xl shadow-xl border-4 border-white dark:border-slate-900`}>
                                        {getInitials(mentor.profiles?.full_name || '')}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-14 px-6 pb-6">
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{mentor.profiles?.full_name}</h1>
                                <div className="flex items-center gap-4 mb-6">
                                    {mentor.is_active && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Available
                                        </span>
                                    )}
                                </div>
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">About</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                                        {mentor.bio || "This mentor hasn't added a bio yet."}
                                    </p>
                                </div>
                                {mentor.expertise?.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                                            <Tag className="w-4 h-4" />
                                            Expertise
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {mentor.expertise.map(tag => (
                                                <span key={tag} className="px-3 py-1.5 text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content — Booking */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                                    <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Book a Session</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Select a date and time to schedule your 1-on-1</p>
                                </div>
                            </div>
                        </div>

                        {/* Date Picker */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-indigo-500" />
                                    Select a Date
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                                        disabled={weekOffset === 0}
                                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                    </button>
                                    <button
                                        onClick={() => setWeekOffset(weekOffset + 1)}
                                        disabled={weekOffset >= 3}
                                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-2">
                                {weekDates.map((date) => {
                                    const slots = getSlotsForDate(date)
                                    const hasSlots = slots.length > 0
                                    const isSelected = selectedDate?.toDateString() === date.toDateString()
                                    const isToday = date.toDateString() === new Date().toDateString()
                                    return (
                                        <button
                                            key={date.toISOString()}
                                            onClick={() => {
                                                setSelectedDate(date);
                                                setSelectedTime(null);
                                            }}
                                            className={`relative p-3 rounded-xl text-center transition-all duration-200 border-2 ${isSelected
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                : hasSlots
                                                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer'
                                                    : 'bg-white/5 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-60 hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                        >
                                            <p className={`text-xs font-medium mb-1 ${isSelected ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {DAYS_SHORT[date.getDay()]}
                                            </p>
                                            <p className={`text-lg font-bold ${isSelected ? 'text-white' : hasSlots ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                                {date.getDate()}
                                            </p>
                                            <p className={`text-[10px] font-medium ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                {date.toLocaleDateString('en-US', { month: 'short' })}
                                            </p>
                                            {isToday && (
                                                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'} border-2 border-white dark:border-slate-900`} />
                                            )}
                                            {hasSlots && !isSelected && (
                                                <div className="mt-1.5 flex justify-center">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Time Slots */}
                        {selectedDate && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-500" />
                                    Available Times
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>

                                {/* Slot Duration Selector */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                        Session Duration
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setSlotCount(1); setSelectedTime(null); }}
                                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                                                slotCount === 1
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500'
                                            }`}
                                        >
                                            <div className="text-base font-bold">15 min</div>
                                            <div className="text-xs opacity-75">Single slot</div>
                                        </button>
                                        <button
                                            onClick={() => { setSlotCount(2); setSelectedTime(null); }}
                                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                                                slotCount === 2
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500'
                                            }`}
                                        >
                                            <div className="text-base font-bold">30 min</div>
                                            <div className="text-xs opacity-75">Double slot</div>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                    {getSlotsForDate(selectedDate).length > 0 ? (
                                        (() => {
                                            const allSlots = getSlotsForDate(selectedDate)
                                            return allSlots.map(time => {
                                                const isSelectedTime = selectedTime === time
                                                const isBooked = bookedSlots.includes(time)
                                                const hasEnoughConsecutiveSlots = isSlotAvailable(time, allSlots, slotCount)
                                                const isDisabled = isBooked || !hasEnoughConsecutiveSlots

                                                return (
                                                    <button
                                                        key={time}
                                                        onClick={() => !isDisabled && setSelectedTime(time)}
                                                        disabled={isDisabled}
                                                        className={`py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 border-2 ${
                                                            isSelectedTime
                                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                                                : isDisabled
                                                                    ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer'
                                                        }`}
                                                        title={isBooked ? 'Already booked' : !hasEnoughConsecutiveSlots ? `Need ${slotCount} consecutive slots` : ''}
                                                    >
                                                        {formatTime(time)}
                                                    </button>
                                                )
                                            })
                                        })()
                                    ) : (
                                        <div className="col-span-full py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                            <p className="text-slate-500 dark:text-slate-400 text-sm">No available time slots found for this date.</p>
                                        </div>
                                    )}
                                </div>

                                {selectedTime && (
                                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">Selected Session</p>
                                                <p className="text-base font-semibold text-slate-900 dark:text-white">
                                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime(selectedTime)}
                                                </p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                                    {slotCount * 15} minutes
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleBookSession}
                                                disabled={booking || !user}
                                                className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-xl font-semibold transition-all shadow-xl shadow-indigo-500/30 text-base"
                                            >
                                                {booking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                                {!user ? 'Sign In to Book' : booking ? 'Booking...' : 'Confirm Booking'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {availability.length === 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center shadow-sm">
                                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Clock className="w-8 h-8 text-amber-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Availability Set</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
                                    This mentor hasn&apos;t set their availability yet. Check back later!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
