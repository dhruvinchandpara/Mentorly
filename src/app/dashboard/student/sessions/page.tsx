'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, Clock, Calendar, Video, Radio,
  Loader2, Search, BookOpen, AlertCircle, ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface Booking {
  id: string
  mentor_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: 'scheduled' | 'completed' | 'cancelled'
  meet_link: string | null
  mentors: {
    profiles: { full_name: string }
  }
}

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

type TabType = 'upcoming' | 'history'

export default function MySessionsPage() {
  const { profile, supabase, user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')

  // Tick to refresh session states
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const fetchBookings = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data: bookingData } = await supabase
        .from('bookings')
        .select(`
          id, mentor_id, start_time, end_time, duration_minutes, status, meet_link,
          mentors!inner(profiles!inner(full_name))
        `)
        .eq('student_id', user.id)
        .order('start_time', { ascending: false })

      setBookings(bookingData || [])
    } catch (err: any) {
      console.error('Error fetching bookings:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, user?.id])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  const getRemainingTime = (endTime: string) => {
    const now = Date.now()
    const end = new Date(endTime).getTime()
    const diff = end - now
    const minutes = Math.floor(diff / 60000)
    return minutes > 0 ? `${minutes} min remaining` : 'Ending soon'
  }

  // Categorize bookings
  const now = new Date()

  const ongoingSessions = bookings.filter(b => {
    const state = getSessionState(b.start_time, b.end_time)
    return state === 'live' && b.status === 'scheduled'
  })

  const upcomingBookings = bookings.filter(b => {
    const state = getSessionState(b.start_time, b.end_time)
    return b.status === 'scheduled' && new Date(b.start_time) > now && state !== 'live'
  })

  const completedBookings = bookings.filter(b => b.status === 'completed')
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled')
  const historyBookings = [...completedBookings, ...cancelledBookings]

  // Apply search filter
  const filterBySearch = (sessions: Booking[]) => {
    if (!searchQuery) return sessions
    return sessions.filter(s =>
      s.mentors?.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const filteredUpcoming = filterBySearch(upcomingBookings)
  const filteredHistory = filterBySearch(historyBookings)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">My Sessions</h1>
        <p className="text-slate-600 text-sm mt-1">
          View and manage all your mentoring sessions.
        </p>
      </div>

      {/* Ongoing Sessions (Always at top if exists) */}
      {ongoingSessions.length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-500 animate-pulse" />
              <CardTitle className="text-base text-blue-950">Live Now - Ongoing Session</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {ongoingSessions.map(session => {
              const mentorName = session.mentors?.profiles?.full_name || 'Unknown Mentor'
              return (
                <div key={session.id} className="p-4 bg-white border border-red-200 rounded-xl shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-blue-950">
                        Session with {mentorName}
                      </p>
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatTime(session.start_time)} – {formatTime(session.end_time)} ({session.duration_minutes} min)
                      </p>
                      <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {getRemainingTime(session.end_time)}
                      </p>
                    </div>
                    {session.meet_link && (
                      <a
                        href={session.meet_link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-base font-bold shadow-lg shadow-green-500/30 animate-pulse transition-all"
                      >
                        <Video className="w-5 h-5" />
                        Join Call Now
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'upcoming'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Upcoming ({filteredUpcoming.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          History ({filteredHistory.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by mentor name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'upcoming' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUpcoming.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  {searchQuery ? 'No sessions match your search.' : 'No upcoming sessions. Browse mentors to book your next session.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUpcoming.map(session => {
                  const mentorName = session.mentors?.profiles?.full_name || 'Unknown Mentor'
                  const state = getSessionState(session.start_time, session.end_time)
                  const isReady = state === 'ready'

                  return (
                    <div key={session.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                            {mentorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{mentorName}</p>
                            <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(session.start_time)}
                            </p>
                            <p className="text-xs text-slate-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(session.start_time)} – {formatTime(session.end_time)} ({session.duration_minutes} min)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isReady && session.meet_link && (
                            <a
                              href={session.meet_link}
                              target="_blank"
                              rel="noreferrer"
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                            >
                              <Video className="w-4 h-4 inline mr-1" />
                              Join Call
                            </a>
                          )}
                          {!isReady && session.meet_link && (
                            <a
                              href={session.meet_link}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 border border-slate-300 text-slate-600 hover:border-slate-400 rounded-lg text-xs font-medium flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Meet Link
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session History</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  {searchQuery ? 'No sessions match your search.' : 'No session history yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map(session => {
                  const mentorName = session.mentors?.profiles?.full_name || 'Unknown Mentor'
                  const isCompleted = session.status === 'completed'
                  return (
                    <div key={session.id} className="p-4 bg-white border border-slate-200 rounded-lg">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                            {mentorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{mentorName}</p>
                            <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(session.start_time)}
                            </p>
                            <p className="text-xs text-slate-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(session.start_time)} – {formatTime(session.end_time)} ({session.duration_minutes} min)
                            </p>
                          </div>
                        </div>
                        <Badge variant={isCompleted ? 'default' : 'destructive'} className={isCompleted ? 'bg-emerald-100 text-emerald-700' : ''}>
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Completed
                            </>
                          ) : (
                            'Cancelled'
                          )}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
