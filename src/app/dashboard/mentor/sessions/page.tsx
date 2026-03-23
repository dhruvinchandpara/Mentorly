'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, Clock, Calendar, Video, Radio,
  Loader2, Search, AlertCircle, ExternalLink, BookOpen, User, X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Booking {
  id: string
  student_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: 'scheduled' | 'completed' | 'cancelled'
  meet_link: string | null
  profiles: { full_name: string; email: string }
  students?: { bio: string | null }
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

type TabType = 'upcoming' | 'pending' | 'history'

export default function SessionsPage() {
  const { profile, supabase } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [markingComplete, setMarkingComplete] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<Booking | null>(null)

  // Tick to refresh session states
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const fetchBookings = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      // First fetch bookings
      const { data: bookingData, error } = await supabase
        .from('bookings')
        .select(`
          id,
          student_id,
          start_time,
          end_time,
          duration_minutes,
          status,
          meet_link,
          profiles!bookings_student_id_fkey(full_name, email)
        `)
        .eq('mentor_id', profile.id)
        .order('start_time', { ascending: false })

      if (error) {
        console.error('Error fetching bookings:', error)
        return
      }

      // Then fetch student bios separately
      if (bookingData && bookingData.length > 0) {
        const studentIds = bookingData.map((b: any) => b.student_id)
        const { data: studentsData } = await supabase
          .from('students')
          .select('id, bio')
          .in('id', studentIds)

        // Merge student data with bookings
        const bookingsWithStudents = bookingData.map((booking: any) => ({
          ...booking,
          students: studentsData?.find((s: any) => s.id === booking.student_id) || null
        }))

        console.log('Fetched bookings with students:', bookingsWithStudents)
        setBookings(bookingsWithStudents)
      } else {
        console.log('No bookings found')
        setBookings([])
      }
    } catch (err: any) {
      console.error('Error fetching bookings:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, profile])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const markCompleted = async (bookingId: string) => {
    setMarkingComplete(bookingId)
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId)
      if (error) throw error
      await fetchBookings()
    } catch (err: any) {
      console.error('Error marking completed:', err)
      alert(`Failed to update session: ${err.message || 'Unknown error'}`)
    } finally {
      setMarkingComplete(null)
    }
  }

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

  const pendingApprovals = bookings.filter(b =>
    b.status === 'scheduled' && new Date(b.end_time) < now
  )

  const completedBookings = bookings.filter(b => b.status === 'completed')
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled')
  const historyBookings = [...completedBookings, ...cancelledBookings]

  // Apply search filter
  const filterBySearch = (sessions: Booking[]) => {
    if (!searchQuery) return sessions
    return sessions.filter(s =>
      s.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const filteredUpcoming = filterBySearch(upcomingBookings)
  const filteredPending = filterBySearch(pendingApprovals)
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
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Sessions</h1>
        <p className="text-slate-600 text-sm mt-1">
          View and manage all your mentoring sessions.
        </p>
      </div>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}>
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                  {(selectedStudent.profiles?.full_name || 'S').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">{selectedStudent.profiles?.full_name || 'Unknown Student'}</h2>
                  <p className="text-sm text-slate-600">{selectedStudent.profiles?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Bio Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <User className="w-4 h-4 text-blue-600" />
                  About This Student
                </h3>
                {selectedStudent.students?.bio ? (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {selectedStudent.students.bio}
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-300 text-center">
                    <p className="text-sm text-slate-500 italic">
                      This student hasn't added a bio yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Session Info */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Session Details
                </h3>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-blue-700" />
                    <span className="font-medium text-blue-900">{formatDate(selectedStudent.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-blue-700" />
                    <span className="text-blue-900">
                      {formatTime(selectedStudent.start_time)} – {formatTime(selectedStudent.end_time)} ({selectedStudent.duration_minutes} min)
                    </span>
                  </div>
                  {selectedStudent.meet_link && (
                    <div className="pt-2">
                      <a
                        href={selectedStudent.meet_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        <Video className="w-4 h-4" />
                        Join Meeting
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 flex justify-end">
              <Button onClick={() => setSelectedStudent(null)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

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
              const studentName = session.profiles?.full_name || 'Unknown Student'
              return (
                <div key={session.id} className="p-4 bg-white border border-red-200 rounded-xl shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-blue-950">
                        🎥 Session with {studentName}
                      </p>
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatTime(session.start_time)} – {formatTime(session.end_time)} ({session.duration_minutes} min)
                      </p>
                      <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        ⏰ {getRemainingTime(session.end_time)}
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
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Pending Review ({filteredPending.length})
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
          placeholder="Search by student name..."
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
                  {searchQuery ? 'No sessions match your search.' : 'No upcoming sessions. Students can book you based on your availability.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUpcoming.map(session => {
                  const studentName = session.profiles?.full_name || 'Unknown Student'
                  const state = getSessionState(session.start_time, session.end_time)
                  const isReady = state === 'ready'

                  return (
                    <div key={session.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedStudent(session)}
                            className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm hover:bg-blue-200 transition-colors cursor-pointer"
                          >
                            {studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </button>
                          <div>
                            <button
                              onClick={() => setSelectedStudent(session)}
                              className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              {studentName}
                            </button>
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

      {activeTab === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Review - Mark as Complete</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPending.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  {searchQuery ? 'No sessions match your search.' : '✅ All caught up! No sessions need review.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPending.map(session => {
                  const studentName = session.profiles?.full_name || 'Unknown Student'
                  return (
                    <div key={session.id} className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedStudent(session)}
                            className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm hover:bg-orange-200 transition-colors cursor-pointer"
                          >
                            {studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </button>
                          <div>
                            <button
                              onClick={() => setSelectedStudent(session)}
                              className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              {studentName}
                            </button>
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
                        <Button
                          onClick={() => markCompleted(session.id)}
                          disabled={markingComplete === session.id}
                          size="sm"
                        >
                          {markingComplete === session.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Marking...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Mark as Complete
                            </>
                          )}
                        </Button>
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
                  const studentName = session.profiles?.full_name || 'Unknown Student'
                  const isCompleted = session.status === 'completed'
                  return (
                    <div key={session.id} className="p-4 bg-white border border-slate-200 rounded-lg">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedStudent(session)}
                            className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            {studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </button>
                          <div>
                            <button
                              onClick={() => setSelectedStudent(session)}
                              className="text-sm font-medium text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              {studentName}
                            </button>
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
