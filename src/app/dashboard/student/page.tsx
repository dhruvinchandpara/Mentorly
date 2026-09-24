'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Clock, Video, Radio, ArrowRight, Calendar, Loader2, AlertCircle, XCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { useBookings } from '@/hooks/useBookings'

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
  const { profile } = useAuth()
  const { data: bookings = [], isLoading: loading } = useBookings()
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  // Categorize bookings
  const now = new Date()

  const pendingSessions = bookings.filter(b => b.status === 'pending')
  const rejectedSessions = bookings.filter(b => b.status === 'rejected')

  const scheduledBookings = bookings
    .filter(b => b.status === 'scheduled')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const ongoingSessions = scheduledBookings.filter(b => {
    const state = getCallState(b.start_time, b.end_time)
    return state === 'live'
  })

  const upcomingSessions = scheduledBookings.filter(b => {
    const state = getCallState(b.start_time, b.end_time)
    return state !== 'live' && new Date(b.start_time) > now
  })

  const WIDGET_CAP = 5
  const displayedPending = pendingSessions.slice(0, WIDGET_CAP)
  const displayedRejected = rejectedSessions.slice(0, WIDGET_CAP)
  const displayedOngoing = ongoingSessions.slice(0, WIDGET_CAP)
  const displayedUpcoming = upcomingSessions.slice(0, WIDGET_CAP)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-2">
          Welcome back, {profile?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground">
          Manage your mentorship sessions and connect with expert mentors
        </p>
      </div>

      {/* 1. Pending Admin Approvals Banner */}
      {pendingSessions.length > 0 && (
        <Card className="border-warning/30 bg-warning-bg/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning animate-pulse" />
              <CardTitle className="text-base font-semibold text-warning">
                Session Requests Awaiting Admin Review ({pendingSessions.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayedPending.map((booking) => (
                <div key={booking.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-warning/30 rounded-lg gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Requested session with {booking.mentors.profiles.full_name}
                    </p>
                    <p className="text-xs text-[var(--fg-faint)] mt-0.5">
                      {formatDate(booking.start_time)} · {formatTime(booking.start_time)} – {formatTime(booking.end_time)} ({booking.duration_minutes} min)
                    </p>
                  </div>
                  <StatusBadge variant="pending">
                    Awaiting Approval
                  </StatusBadge>
                </div>
              ))}
            </div>

            {pendingSessions.length > WIDGET_CAP && (
              <Link
                href="/dashboard/student/sessions?tab=pending"
                className="flex items-center justify-center gap-1.5 w-full mt-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                View all {pendingSessions.length} requests
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. Rejected Requests Alert Banner */}
      {rejectedSessions.length > 0 && (
        <Card className="border-destructive/30 bg-[#F5E6DE]/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              <CardTitle className="text-base font-semibold text-destructive">
                Rejected Meeting Requests ({rejectedSessions.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayedRejected.map((booking) => (
                <div key={booking.id} className="p-4 bg-white border border-destructive/30 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-destructive">
                      Meeting request with {booking.mentors.profiles.full_name} was rejected
                    </p>
                    <StatusBadge variant="rejected">Rejected</StatusBadge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(booking.start_time)} at {formatTime(booking.start_time)}
                  </p>
                  {booking.rejection_reason && (
                    <p className="text-xs text-destructive font-medium bg-[#F5E6DE] p-2 rounded mt-1">
                      Reason: {booking.rejection_reason}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {rejectedSessions.length > WIDGET_CAP && (
              <Link
                href="/dashboard/student/sessions?tab=history"
                className="flex items-center justify-center gap-1.5 w-full mt-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                View all {rejectedSessions.length} rejected requests
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Ongoing Sessions */}
      {ongoingSessions.length > 0 && (
        <Card className="border-destructive/30 bg-[#F5E6DE]/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <CardTitle className="text-base font-semibold text-foreground">Ongoing Sessions</CardTitle>
              <Badge variant="destructive" className="ml-auto">
                {ongoingSessions.length} active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayedOngoing.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-white border border-destructive/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F5E6DE] text-destructive flex items-center justify-center">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {booking.mentors.profiles.full_name}
                      </p>
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
                      Join Now
                    </a>
                  )}
                </div>
              ))}
            </div>

            {ongoingSessions.length > WIDGET_CAP && (
              <Link
                href="/dashboard/student/sessions"
                className="flex items-center justify-center gap-1.5 w-full mt-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                View all {ongoingSessions.length} ongoing sessions
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Next Upcoming Sessions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-foreground">Next Upcoming Sessions</CardTitle>
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
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-[var(--fg-faint)]" />
              </div>
              <p className="text-sm text-muted-foreground">No upcoming approved sessions scheduled.</p>
            </div>
          ) : (
            <>
            <div className="space-y-3">
              {displayedUpcoming.map((booking) => {
                const state = getCallState(booking.start_time, booking.end_time)
                const isReady = state === 'ready'

                return (
                  <div key={booking.id} className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    isReady ? 'bg-warning-bg border-warning/30' : 'bg-secondary border-border'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isReady ? 'bg-warning-bg text-warning' : 'bg-white border-2 border-border text-muted-foreground'
                      }`}>
                        {isReady ? <Radio className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {booking.mentors.profiles.full_name}
                        </p>
                        <p className="text-xs text-[var(--fg-faint)] mt-0.5">
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
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-[#FFFBF3] bg-[#0F1919] hover:bg-[#1C2C2C] rounded-full shadow-sm transition-colors"
                          >
                            Get Ready
                          </a>
                        )
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground border-border">
                          <Clock className="w-3 h-3 mr-1" />
                          Approved & Scheduled
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {upcomingSessions.length > WIDGET_CAP && (
              <Link
                href="/dashboard/student/sessions?tab=upcoming"
                className="flex items-center justify-center gap-1.5 w-full mt-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                View all {upcomingSessions.length} sessions
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 5. Find Mentor CTA */}
      <Card className="bg-gradient-to-br from-accent to-secondary border-primary/30">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-[var(--primary-hover)] flex items-center justify-center mx-auto mb-4">
            <ArrowRight className="w-8 h-8 text-white" />
          </div>
          <div className="text-xl font-semibold text-foreground mb-2">
            Ready to learn something new?
          </div>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Browse our expert mentors and book your next session to accelerate your growth
          </p>
          <Link
            href="/dashboard/student/explore"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-[#FFFBF3] bg-[#0F1919] hover:bg-[#1C2C2C] rounded-full shadow-sm transition-colors"
          >
            Find a Mentor
            <ArrowRight className="w-4 h-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
