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
import { StatusBadge } from '@/components/ui/status-badge'
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
  const { data: bookings = [], isLoading: loading } = useMentorBookings()
  const [, setTick] = useState(0)

  // Tick to refresh session states
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])


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
  const sessionsNeedingReportBookings = bookings.filter(b =>
    (b.status === 'scheduled' && getSessionState(b.start_time, b.end_time) === 'past') || b.status === 'revise'
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
        <h1 className="text-3xl font-display font-semibold text-foreground tracking-tight mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {profile?.full_name}. Here's an overview of your mentorship sessions.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((card) => (
          <div key={card.label} className="card-modern p-5 hover-lift">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${
                card.color === 'blue' ? 'bg-accent' :
                card.color === 'emerald' ? 'bg-success-bg' :
                'bg-info-bg'
              } flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${
                  card.color === 'blue' ? 'text-primary' :
                  card.color === 'emerald' ? 'text-success' :
                  'text-info'
                }`} />
              </div>
            </div>
            <p className="text-2xl font-semibold text-foreground mb-1">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Live Sessions */}
      {liveBookings.length > 0 && (
        <Card className="border-destructive/30 bg-accent/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <CardTitle className="text-base font-semibold text-foreground">Live Sessions</CardTitle>
              <Badge variant="secondary" className="ml-auto">
                {liveBookings.length} active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {liveBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-card border border-destructive/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent text-destructive flex items-center justify-center">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{booking.profiles.full_name}</p>
                      <p className="text-xs text-[var(--fg-faint)] mt-0.5">
                        {formatTime(booking.start_time)} – {formatTime(booking.end_time)} · {booking.duration_minutes} min
                      </p>
                    </div>
                  </div>
                  {booking.meet_link && (
                    <a
                      href={booking.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-[#FFFBF3] bg-[#0F1919] hover:bg-[#1C2C2C] rounded-full shadow-sm transition-colors"
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
        <Card className="border-warning/30 bg-warning-bg/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              <CardTitle className="text-base font-semibold text-foreground">Starting Soon</CardTitle>
              <Badge variant="secondary" className="ml-auto bg-warning-bg text-warning border-warning/30">
                {readyBookings.length} ready
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {readyBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-card border border-warning/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-warning-bg text-warning flex items-center justify-center">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{booking.profiles.full_name}</p>
                      <p className="text-xs text-[var(--fg-faint)] mt-0.5">
                        Starts at {formatTime(booking.start_time)} · {booking.duration_minutes} min
                      </p>
                    </div>
                  </div>
                  {booking.meet_link && (
                    <a
                      href={booking.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-[#FFFBF3] bg-[#0F1919] hover:bg-[#1C2C2C] rounded-full shadow-sm transition-colors"
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
      <div className={`grid gap-4 ${sessionsNeedingReportBookings.length > 0 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Upcoming Sessions */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-foreground">Upcoming Sessions</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {upcomingBookings.length} scheduled
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-[var(--fg-faint)]" />
                </div>
                <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 bg-muted border border-border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-card border-2 border-border text-muted-foreground flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{booking.profiles.full_name}</p>
                        <p className="text-xs text-[var(--fg-faint)] mt-0.5">
                          {formatDate(booking.start_time)} · {formatTime(booking.start_time)} – {formatTime(booking.end_time)} · {booking.duration_minutes} min
                        </p>
                      </div>
                    </div>
                    <StatusBadge variant="upcoming" size="sm">
                      Scheduled
                    </StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions Needing a Report */}
        {sessionsNeedingReportBookings.length > 0 && (
          <Card className="border-warning/30 bg-warning-bg/30">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warning" />
                  <CardTitle className="text-base font-semibold text-foreground">Session Reports Needed</CardTitle>
                </div>
                <Badge variant="secondary" className="bg-warning-bg text-warning border-warning/30">
                  {sessionsNeedingReportBookings.length} to submit
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                {sessionsNeedingReportBookings.slice(0, 3).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between gap-3 p-4 bg-card border border-warning/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warning-bg text-warning flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {booking.profiles.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{booking.profiles.full_name}</p>
                        <p className="text-xs text-[var(--fg-faint)] mt-0.5">
                          {formatDate(booking.start_time)} · {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                        </p>
                      </div>
                    </div>
                    {booking.status === 'revise' && (
                      <StatusBadge variant="revise" size="sm">
                        Needs revision
                      </StatusBadge>
                    )}
                  </div>
                ))}
              </div>

              <Link href="/dashboard/mentor/sessions?tab=pending" className="btn-secondary w-full justify-center">
                Fill in session reports
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/mentor/sessions" className="btn-secondary justify-between p-5 h-auto">
          <div>
            <p className="text-base font-semibold text-foreground mb-1">View All Sessions</p>
            <p className="text-sm text-muted-foreground">Manage your complete session history</p>
          </div>
          <ArrowRight className="w-5 h-5 text-[var(--fg-faint)]" />
        </Link>
        <Link href="/dashboard/mentor/availability" className="btn-secondary justify-between p-5 h-auto">
          <div>
            <p className="text-base font-semibold text-foreground mb-1">Manage Availability</p>
            <p className="text-sm text-muted-foreground">Update your schedule and time slots</p>
          </div>
          <ArrowRight className="w-5 h-5 text-[var(--fg-faint)]" />
        </Link>
      </div>
    </div>
  )
}
