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
  const { supabase, user, profile } = useAuth()
  const params = useParams()
  const router = useRouter()
  const mentorId = params.id as string

  // Determine the correct explore URL based on user role
  const exploreUrl = profile?.role === 'student' ? '/dashboard/student/explore' : '/explore'

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
  const [slotCount, setSlotCount] = useState(2) // default: 30 min = 2 slots
  const [bookedSlots, setBookedSlots] = useState<string[]>([])

  // Fetch mentor profile
  useEffect(() => {
    const fetchMentor = async () => {
      try {
        const { data, error } = await supabase
          .from('mentors')
          .select(`
            id,
            bio,
            expertise,
            hourly_rate,
            is_active,
            profiles!inner (
              full_name,
              email
            )
          `)
          .eq('id', mentorId)
          .single()

        if (error) throw error
        setMentor(data as unknown as MentorProfile)
      } catch (err) {
        console.error('Error fetching mentor:', err)
      }
    }
    fetchMentor()
  }, [mentorId, supabase])

  // Fetch availability
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const { data, error } = await supabase
          .from('availability')
          .select('*')
          .eq('mentor_id', mentorId)

        if (!error && data) {
          setAvailability(data)
        }
      } catch (err) {
        console.error('Error fetching availability:', err)
      }
    }
    fetchAvailability()
  }, [mentorId, supabase])

  // Fetch booked slots when date changes
  useEffect(() => {
    if (!selectedDate) return

    const fetchBookedSlots = async () => {
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('start_time, end_time, duration_minutes, slot_count')
          .eq('mentor_id', mentorId)
          .eq('status', 'scheduled')
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString())

        if (!error && data) {
          const slots: string[] = []

          // For each booking, mark ALL 15-minute slots as booked
          data.forEach((booking: { start_time: string; end_time: string; duration_minutes: number; slot_count: number }) => {
            const startTime = new Date(booking.start_time)
            const slotCount = booking.slot_count || Math.floor(booking.duration_minutes / 15)

            // Generate all time slots covered by this booking
            for (let i = 0; i < slotCount; i++) {
              const slotTime = new Date(startTime)
              slotTime.setMinutes(slotTime.getMinutes() + (i * 15))
              const h = String(slotTime.getHours()).padStart(2, '0')
              const m = String(slotTime.getMinutes()).padStart(2, '0')
              slots.push(`${h}:${m}`)
            }
          })

          setBookedSlots(slots)
        }
      } catch (err) {
        console.error('Error fetching booked slots:', err)
      }
    }

    fetchBookedSlots()
  }, [selectedDate, mentorId, supabase])

  useEffect(() => {
    if (mentor && availability) {
      setLoading(false)
    }
  }, [mentor, availability])

  const weekDates = useMemo(() => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() + weekOffset * 7)
    const dates: Date[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }, [weekOffset])

  const isSlotAvailable = (time: string, allSlots: string[], count: number) => {
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
    // Format date as YYYY-MM-DD without timezone conversion
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    const dayOfWeek = date.getDay()

    console.log(`Checking slots for ${dateStr} (Day: ${dayOfWeek})`)

    // 1. Check for specific date override first
    const specificSlots = availability.filter(a => {
      if (!a.specific_date) return false
      // Handle various date formats - normalize to YYYY-MM-DD
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
      // Sort slots chronologically
      return slots.sort((a, b) => {
        const [aH, aM] = a.split(':').map(Number)
        const [bH, bM] = b.split(':').map(Number)
        return (aH * 60 + aM) - (bH * 60 + bM)
      })
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
    // Sort slots chronologically
    return slots.sort((a, b) => {
      const [aH, aM] = a.split(':').map(Number)
      const [bH, bM] = b.split(':').map(Number)
      return (aH * 60 + aM) - (bH * 60 + bM)
    })
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
        endTime: endDateTime.toISOString(), // Stored in UTC
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

  const getAvatarColor = (name: string) => {
    const gradients = [
      'from-blue-500 to-blue-600',
      'from-emerald-500 to-emerald-600',
      'from-violet-500 to-violet-600',
      'from-amber-500 to-amber-600',
      'from-rose-500 to-rose-600',
      'from-cyan-500 to-cyan-600',
      'from-indigo-500 to-indigo-600',
    ]
    const index = (name?.charCodeAt(0) || 0) % gradients.length
    return gradients[index]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!mentor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Mentor Not Found</h2>
          <p className="text-slate-600 mb-6">This mentor profile doesn&apos;t exist or has been removed.</p>
          <Link href={exploreUrl} className="btn-primary">
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="card-modern p-10">
            {/* Success Icon */}
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Session Booked!</h2>
            <p className="text-slate-600 mb-2">
              Your session with <span className="font-semibold text-slate-900">{mentor.profiles?.full_name}</span> has been confirmed.
            </p>

            {/* Session details */}
            <div className="bg-slate-50 rounded-xl p-4 my-6 border border-slate-200 text-left space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="font-medium text-slate-900">
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="font-medium text-slate-900">
                  {selectedTime && formatTime(selectedTime)} ({slotCount * 15} minutes)
                </span>
              </div>
              {bookedInfo.meetLink && (
                <div className="flex items-center gap-3 text-sm">
                  <Video className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <a
                    href={bookedInfo.meetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 font-medium hover:underline truncate"
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
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                <CalendarDays className="w-4 h-4" />
                Add to Google Calendar
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>
              <Link
                href="/dashboard/student"
                className="btn-primary w-full text-center"
              >
                Go to Dashboard
              </Link>
              <Link
                href={exploreUrl}
                className="w-full px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-center"
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
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-slate-900 tracking-tight">Mentorly</span>
          </Link>
          <Link href={exploreUrl} className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Explore
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar — Mentor Profile */}
          <div className="lg:col-span-1">
            <div className="card-modern overflow-hidden sticky top-24">
              <div className={`h-24 bg-gradient-to-br ${getAvatarColor(mentor.profiles?.full_name || '')} relative`}>
                <div className="absolute -bottom-10 left-6">
                  <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${getAvatarColor(mentor.profiles?.full_name || '')} flex items-center justify-center text-white font-bold text-2xl shadow-lg border-4 border-white`}>
                    {getInitials(mentor.profiles?.full_name || '')}
                  </div>
                </div>
              </div>

              <div className="pt-14 px-6 pb-6">
                <h1 className="text-2xl font-semibold text-slate-900 mb-1">{mentor.profiles?.full_name}</h1>
                <div className="flex items-center gap-4 mb-6">
                  {mentor.is_active && (
                    <span className="badge-success">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Available
                    </span>
                  )}
                </div>
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2 uppercase tracking-wider">About</h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {mentor.bio || "This mentor hasn't added a bio yet."}
                  </p>
                </div>
                {mentor.expertise?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Expertise
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {mentor.expertise.map(tag => (
                        <span key={tag} className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
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
            {/* Header Card */}
            <div className="card-modern p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Book a Session</h2>
                  <p className="text-sm text-slate-600">Select a date and time to schedule your 1-on-1</p>
                </div>
              </div>
            </div>

            {/* Date Picker */}
            <div className="card-modern p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Select a Date
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                    disabled={weekOffset === 0}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-700" />
                  </button>
                  <button
                    onClick={() => setWeekOffset(weekOffset + 1)}
                    disabled={weekOffset >= 3}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-700" />
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
                      className={`relative p-3 rounded-lg text-center transition-all border ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                          : hasSlots
                          ? 'bg-white border-slate-200 hover:border-blue-300 cursor-pointer'
                          : 'bg-slate-50 border-slate-100 opacity-60'
                      }`}
                    >
                      <p className={`text-xs font-medium mb-1 ${isSelected ? 'text-blue-100' : 'text-slate-600'}`}>
                        {DAYS_SHORT[date.getDay()]}
                      </p>
                      <p className={`text-lg font-semibold ${isSelected ? 'text-white' : hasSlots ? 'text-slate-900' : 'text-slate-400'}`}>
                        {date.getDate()}
                      </p>
                      <p className={`text-[10px] font-medium ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        {date.toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                      {isToday && (
                        <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                      )}
                      {hasSlots && !isSelected && (
                        <div className="mt-1.5 flex justify-center">
                          <span className="w-1 h-1 rounded-full bg-emerald-500" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div className="card-modern p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Available Times
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>

                {/* Slot Duration Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Session Duration
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setSlotCount(1); setSelectedTime(null); }}
                      className={`py-3 px-4 rounded-lg text-sm font-medium transition-all border ${
                        slotCount === 1
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-base font-semibold">15 min</div>
                      <div className="text-xs opacity-75">Single slot</div>
                    </button>
                    <button
                      onClick={() => { setSlotCount(2); setSelectedTime(null); }}
                      className={`py-3 px-4 rounded-lg text-sm font-medium transition-all border ${
                        slotCount === 2
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-base font-semibold">30 min</div>
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
                            className={`py-2 px-2 rounded-lg text-xs font-medium transition-all border ${
                              isSelectedTime
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                : isDisabled
                                ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 cursor-pointer'
                            }`}
                            title={isBooked ? 'Already booked' : !hasEnoughConsecutiveSlots ? `Need ${slotCount} consecutive slots` : ''}
                          >
                            {formatTime(time)}
                          </button>
                        )
                      })
                    })()
                  ) : (
                    <div className="col-span-full py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      <p className="text-slate-600 text-sm">No available time slots found for this date.</p>
                    </div>
                  )}
                </div>

                {selectedTime && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-600">Selected Session</p>
                        <p className="text-base font-semibold text-slate-900">
                          {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime(selectedTime)}
                        </p>
                        <p className="text-sm text-slate-600">
                          {slotCount * 15} minutes
                        </p>
                      </div>
                      <button
                        onClick={handleBookSession}
                        disabled={booking || !user}
                        className="btn-primary"
                      >
                        {booking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {!user ? 'Sign In to Book' : booking ? 'Booking...' : 'Confirm Booking'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
