'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Clock, Video, Radio, ArrowRight, Calendar, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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

  if (now >= start && now <= end) return 'live'
  if (now >= start - fiveMin && now < start) return 'ready'
  if (now > end) return 'past'
  return 'upcoming'
}

export default function StudentHome() {
  const { profile, supabase, user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
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
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true })

      if (!error) setBookings(data || [])
    } catch (err) {
      console.error('Error fetching bookings:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, user?.id])

  useEffect(() => {
    if (user?.id) {
      fetchBookings()
    }
  }, [user?.id, fetchBookings])

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Categorize bookings
  const now = new Date()
  const ongoingSessions = bookings.filter(b => {
    const state = getCallState(b.start_time, b.end_time)
    return state === 'live'
  })

  const upcomingSessions = bookings.filter(b => {
    const state = getCallState(b.start_time, b.end_time)
    return state !== 'live' && new Date(b.start_time) > now
  }).slice(0, 3)

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-2">
          Welcome back, {profile?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-slate-600">
          Manage your mentorship sessions and connect with expert mentors
        </p>
      </div>

      {/* 1. Ongoing Sessions */}
      {ongoingSessions.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <CardTitle className="text-base font-semibold text-slate-900">Ongoing Sessions</CardTitle>
              <Badge variant="destructive" className="ml-auto">
                {ongoingSessions.length} active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ongoingSessions.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-white border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {booking.mentors.profiles.full_name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatTime(booking.start_time)} – {formatTime(booking.end_time)} · {booking.duration_minutes} min
                      </p>
                    </div>
                  </div>
                  {booking.meet_link && (
                    <a
                      href={booking.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                    >
                      Join Now
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Next Upcoming Sessions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">Next Upcoming Sessions</CardTitle>
            {upcomingSessions.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {upcomingSessions.length} scheduled
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-600">No upcoming sessions scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((booking) => {
                const state = getCallState(booking.start_time, booking.end_time)
                const isReady = state === 'ready'

                return (
                  <div key={booking.id} className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    isReady ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isReady ? 'bg-amber-100 text-amber-600' : 'bg-white border-2 border-slate-200 text-slate-600'
                      }`}>
                        {isReady ? <Radio className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {booking.mentors.profiles.full_name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDate(booking.start_time)} · {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isReady ? (
                        booking.meet_link && (
                          <a
                            href={booking.meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary"
                          >
                            Get Ready
                          </a>
                        )
                      ) : (
                        <Badge variant="outline" className="text-slate-600 border-slate-300">
                          <Clock className="w-3 h-3 mr-1" />
                          Scheduled
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Find Mentor CTA */}
      <Card className="bg-gradient-to-br from-blue-50 to-violet-50 border-blue-200">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mx-auto mb-4">
            <ArrowRight className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            Ready to learn something new?
          </h3>
          <p className="text-slate-600 max-w-md mx-auto mb-6">
            Browse our expert mentors and book your next session to accelerate your growth
          </p>
          <Link href="/dashboard/student/explore" className="btn-primary inline-flex items-center gap-2">
            Find a Mentor
            <ArrowRight className="w-4 h-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
