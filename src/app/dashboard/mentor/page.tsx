'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, Clock, Calendar, Video, Radio,
  Loader2, TrendingUp, BookOpen, CalendarDays, ArrowRight, ArrowUpRight, Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useMentorBookings } from '@/hooks/useMentorBookings'

function getSessionState(startTime: string, endTime: string) {
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
  const { profile } = useAuth()
  const { data: bookings = [], isLoading: loading, markComplete, isMarkingComplete } = useMentorBookings()
  const [markingCompleteId, setMarkingCompleteId] = useState<string | null>(null)
  const [, setTick] = useState(0)

  // Tick to refresh session states
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const markCompleted = async (bookingId: string) => {
    setMarkingCompleteId(bookingId)
    try {
      markComplete(bookingId)
    } catch (err: any) {
      console.error('Error marking completed:', err)
      alert(`Failed to update booking status: ${err.message || 'Unknown error'}`)
    } finally {
      // Reset after a delay to allow the mutation to complete
      setTimeout(() => setMarkingCompleteId(null), 1000)
    }
  }

  // Categorize bookings
  const liveBookings = bookings.filter(b =>
    b.status === 'scheduled' && getSessionState(b.start_time, b.end_time) === 'live'
  )
  const readyBookings = bookings.filter(b =>
    b.status === 'scheduled' && getSessionState(b.start_time, b.end_time) === 'ready'
  )
  const upcomingBookings = bookings.filter(b =>
    b.status === 'scheduled' && getSessionState(b.start_time, b.end_time) === 'upcoming'
  ).slice(0, 5)
  const pendingCompletionBookings = bookings.filter(b =>
    b.status === 'scheduled' && getSessionState(b.start_time, b.end_time) === 'past'
  )

  const totalSessions = bookings.length
  const completedSessions = bookings.filter(b => b.status === 'completed').length
  const scheduledSessions = bookings.filter(b => b.status === 'scheduled').length

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const metricCards = [
    { label: 'Total Sessions', value: totalSessions, icon: BookOpen, color: 'blue' },
    { label: 'Completed', value: completedSessions, icon: CheckCircle2, color: 'emerald' },
    { label: 'Scheduled', value: scheduledSessions, icon: CalendarDays, color: 'violet' },
  ]

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-2">Dashboard</h1>
        <p className="text-slate-600">
          Welcome back, {profile?.full_name}. Here's an overview of your mentorship sessions.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((card) => (
          <div key={card.label} className="card-modern p-5 hover-lift">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${
                card.color === 'blue' ? 'bg-blue-50' :
                card.color === 'emerald' ? 'bg-emerald-50' :
                'bg-violet-50'
              } flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${
                  card.color === 'blue' ? 'text-blue-600' :
                  card.color === 'emerald' ? 'text-emerald-600' :
                  'text-violet-600'
                }`} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-slate-900 mb-1">{card.value}</p>
            <p className="text-sm text-slate-600">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Live Sessions */}
      {liveBookings.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <CardTitle className="text-base font-semibold text-slate-900">Live Sessions</CardTitle>
              <Badge variant="destructive" className="ml-auto">
                {liveBookings.length} active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {liveBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-white border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{booking.profiles.full_name}</p>
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
                      Join Call
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ready Sessions (Starting in 5 min) */}
      {readyBookings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-base font-semibold text-slate-900">Starting Soon</CardTitle>
              <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700 border-amber-200">
                {readyBookings.length} ready
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {readyBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-white border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{booking.profiles.full_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Starts at {formatTime(booking.start_time)} · {booking.duration_minutes} min
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
                      Get Ready
                    </a>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Sessions and Mark as Completed - Side by Side */}
      <div className={`grid gap-4 ${pendingCompletionBookings.length > 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Upcoming Sessions */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Upcoming Sessions</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {upcomingBookings.length} scheduled
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-600">No upcoming sessions.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 text-slate-600 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{booking.profiles.full_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDate(booking.start_time)} · {formatTime(booking.start_time)} – {formatTime(booking.end_time)} · {booking.duration_minutes} min
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-slate-600 border-slate-300">
                      <Clock className="w-3 h-3 mr-1" />
                      Scheduled
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions Needing Review - Mark as Completed */}
        {pendingCompletionBookings.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <CardTitle className="text-base font-semibold text-slate-900">Mark as Completed</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                  {pendingCompletionBookings.length} to review
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                {pendingCompletionBookings.slice(0, 3).map((booking) => (
                  <div key={booking.id} className="flex flex-col gap-3 p-4 bg-white border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {booking.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{booking.profiles.full_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDate(booking.start_time)} · {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => markCompleted(booking.id)}
                      disabled={markingCompleteId === booking.id}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {markingCompleteId === booking.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Mark Completed
                    </button>
                  </div>
                ))}
              </div>
              
              {pendingCompletionBookings.length > 3 && (
                <Link href="/dashboard/mentor/sessions?tab=pending" className="btn-secondary w-full justify-center">
                  View {pendingCompletionBookings.length - 3} more awaiting review
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/mentor/sessions" className="btn-secondary justify-between p-5 h-auto">
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">View All Sessions</h3>
            <p className="text-sm text-slate-600">Manage your complete session history</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400" />
        </Link>
        <Link href="/dashboard/mentor/availability" className="btn-secondary justify-between p-5 h-auto">
          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">Manage Availability</h3>
            <p className="text-sm text-slate-600">Update your schedule and time slots</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400" />
        </Link>
      </div>
    </div>
  )
}
