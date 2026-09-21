'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, Clock, Calendar, Video, Radio,
  Loader2, Search, AlertCircle, ExternalLink, BookOpen, User, X, ChevronLeft, ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SessionNotePanel } from '@/components/ui/session-note-panel'
import { lockSessionNote } from '@/app/dashboard/admin/actions'

const ITEMS_PER_PAGE = 10

interface Booking {
  id: string
  student_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'pending' | 'rejected'
  meet_link: string | null
  profiles: { full_name: string; email: string }
  students?: { bio: string | null }
  session_notes?: Array<{
    content: string | null
    is_locked: boolean
    last_edited_by: string | null
    last_edited_at: string | null
    editor_profile?: { full_name: string } | null
  }> | null
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
  const [currentPage, setCurrentPage] = useState(1)

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
          profiles!bookings_student_id_fkey(full_name, email),
          session_notes(content, is_locked, last_edited_by, last_edited_at, editor_profile:profiles!session_notes_last_edited_by_fkey(full_name))
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
      await lockSessionNote(bookingId)
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

  // Reset to page 1 when changing tabs or search
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  // Pagination logic
  const getCurrentPageData = (data: Booking[]) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return data.slice(startIndex, endIndex)
  }

  const getTotalPages = (data: Booking[]) => Math.ceil(data.length / ITEMS_PER_PAGE)

  const paginatedUpcoming = getCurrentPageData(filteredUpcoming)
  const paginatedPending = getCurrentPageData(filteredPending)
  const paginatedHistory = getCurrentPageData(filteredHistory)

  const upcomingTotalPages = getTotalPages(filteredUpcoming)
  const pendingTotalPages = getTotalPages(filteredPending)
  const historyTotalPages = getTotalPages(filteredHistory)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-display font-semibold text-foreground tracking-tight">Sessions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View and manage all your mentoring sessions.
        </p>
      </div>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}>
          <div className="relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-[var(--primary-hover)] flex items-center justify-center text-white font-bold text-xl">
                  {(selectedStudent.profiles?.full_name || 'S').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{selectedStudent.profiles?.full_name || 'Unknown Student'}</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.profiles?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Bio Section */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <User className="w-4 h-4 text-primary" />
                  About This Student
                </p>
                {selectedStudent.students?.bio ? (
                  <div className="bg-muted rounded-xl p-4 border border-border">
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {selectedStudent.students.bio}
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted rounded-xl p-4 border border-dashed border-[var(--line-strong)] text-center">
                    <p className="text-sm text-muted-foreground italic">
                      This student hasn't added a bio yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Session Info */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-primary" />
                  Session Details
                </p>
                <div className="bg-accent rounded-xl p-4 border border-accent space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="font-medium text-accent-foreground">{formatDate(selectedStudent.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-accent-foreground">
                      {formatTime(selectedStudent.start_time)} – {formatTime(selectedStudent.end_time)} ({selectedStudent.duration_minutes} min)
                    </span>
                  </div>
                  {selectedStudent.meet_link && (
                    <div className="pt-2">
                      <a
                        href={selectedStudent.meet_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F1919] hover:bg-[#1C2C2C] text-[#FFFBF3] rounded-full text-sm font-semibold transition-colors"
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
            <div className="p-6 border-t border-border flex justify-end">
              <Button onClick={() => setSelectedStudent(null)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ongoing Sessions (Always at top if exists) */}
      {ongoingSessions.length > 0 && (
        <Card className="border-destructive/30 bg-accent/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-destructive animate-pulse" />
              <CardTitle className="text-base text-foreground">Live Now - Ongoing Session</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {ongoingSessions.map(session => {
              const studentName = session.profiles?.full_name || 'Unknown Student'
              const note = session.session_notes?.[0] ?? null
              return (
                <div key={session.id} className="p-4 bg-card border border-destructive/30 rounded-xl shadow-sm space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-foreground">
                        🎥 Session with {studentName}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatTime(session.start_time)} – {formatTime(session.end_time)} ({session.duration_minutes} min)
                      </p>
                      <p className="text-sm text-destructive font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        ⏰ {getRemainingTime(session.end_time)}
                      </p>
                    </div>
                    {session.meet_link && (
                      <a
                        href={session.meet_link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-success hover:opacity-90 text-white rounded-xl text-base font-bold shadow-lg shadow-success/30 animate-pulse transition-all"
                      >
                        <Video className="w-5 h-5" />
                        Join Call Now
                      </a>
                    )}
                  </div>
                  {/* Live Session Note Panel */}
                  <SessionNotePanel
                    bookingId={session.id}
                    isLocked={false}
                    canEdit={true}
                    editorId={profile?.id}
                    initialContent={note?.content ?? null}
                    lastEditedByName={note?.editor_profile?.full_name ?? null}
                    lastEditedAt={note?.last_edited_at ?? null}
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-border">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'upcoming'
              ? 'border-[#0F1919] text-[#0F1919]'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Upcoming ({filteredUpcoming.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-[#0F1919] text-[#0F1919]'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Pending Review ({filteredPending.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-[#0F1919] text-[#0F1919]'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          History ({filteredHistory.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-faint)]" />
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
                <Calendar className="w-12 h-12 text-[var(--fg-faint)] mx-auto mb-3" />
                <p className="text-sm text-[var(--fg-faint)]">
                  {searchQuery ? 'No sessions match your search.' : 'No upcoming sessions. Students can book you based on your availability.'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedUpcoming.map(session => {
                    const studentName = session.profiles?.full_name || 'Unknown Student'
                    const state = getSessionState(session.start_time, session.end_time)
                    const isReady = state === 'ready'

                    return (
                      <div key={session.id} className="p-4 bg-muted border border-border rounded-lg hover:bg-accent transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setSelectedStudent(session)}
                              className="w-10 h-10 rounded-full bg-accent text-primary flex items-center justify-center font-bold text-sm hover:opacity-80 transition-colors cursor-pointer"
                            >
                              {studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </button>
                            <div>
                              <button
                                onClick={() => setSelectedStudent(session)}
                                className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                              >
                                {studentName}
                              </button>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(session.start_time)}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
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
                                className="px-4 py-2 bg-success hover:opacity-90 text-white rounded-lg text-sm font-semibold shadow-sm"
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
                                className="px-3 py-1.5 border border-[var(--line-strong)] text-muted-foreground hover:border-primary/40 rounded-lg text-xs font-medium flex items-center gap-1"
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

                {/* Pagination */}
                {upcomingTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredUpcoming.length)} of {filteredUpcoming.length} sessions
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-[var(--line-strong)] rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: upcomingTotalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-[#0F1919] text-[#FFFBF3]'
                                : 'text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(upcomingTotalPages, p + 1))}
                        disabled={currentPage === upcomingTotalPages}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-[var(--line-strong)] rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
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
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                <p className="text-sm text-[var(--fg-faint)]">
                  {searchQuery ? 'No sessions match your search.' : '✅ All caught up! No sessions need review.'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedPending.map(session => {
                    const studentName = session.profiles?.full_name || 'Unknown Student'
                    return (
                      <div key={session.id} className="p-4 bg-warning-bg border border-warning/30 rounded-lg">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setSelectedStudent(session)}
                              className="w-10 h-10 rounded-full bg-warning-bg text-warning flex items-center justify-center font-bold text-sm hover:opacity-80 transition-colors cursor-pointer"
                            >
                              {studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </button>
                            <div>
                              <button
                                onClick={() => setSelectedStudent(session)}
                                className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                              >
                                {studentName}
                              </button>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(session.start_time)}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(session.start_time)} – {formatTime(session.end_time)} ({session.duration_minutes} min)
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => markCompleted(session.id)}
                            disabled={markingComplete === session.id}
                            size="sm"
                            className="bg-[#0F1919] text-[#FFFBF3] hover:bg-[#1C2C2C] shadow-none"
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

                {/* Pagination */}
                {pendingTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredPending.length)} of {filteredPending.length} sessions
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-[var(--line-strong)] rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: pendingTotalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-[#0F1919] text-[#FFFBF3]'
                                : 'text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(pendingTotalPages, p + 1))}
                        disabled={currentPage === pendingTotalPages}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-[var(--line-strong)] rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
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
                <BookOpen className="w-12 h-12 text-[var(--fg-faint)] mx-auto mb-3" />
                <p className="text-sm text-[var(--fg-faint)]">
                  {searchQuery ? 'No sessions match your search.' : 'No session history yet.'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedHistory.map(session => {
                    const studentName = session.profiles?.full_name || 'Unknown Student'
                    const isCompleted = session.status === 'completed'
                    const note = session.session_notes?.[0] ?? null
                    const sessionStart = new Date(session.start_time)
                    const is24hExpired = Date.now() > sessionStart.getTime() + 24 * 60 * 60 * 1000
                    const isLocked = note?.is_locked || is24hExpired
                    return (
                      <div key={session.id} className="p-4 bg-card border border-border rounded-lg">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setSelectedStudent(session)}
                              className="w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-sm hover:bg-accent transition-colors cursor-pointer"
                            >
                              {studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </button>
                            <div>
                              <button
                                onClick={() => setSelectedStudent(session)}
                                className="text-sm font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                              >
                                {studentName}
                              </button>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(session.start_time)}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(session.start_time)} – {formatTime(session.end_time)} ({session.duration_minutes} min)
                              </p>
                            </div>
                          </div>
                          <StatusBadge variant={isCompleted ? 'completed' : 'cancelled'} size="sm">
                            {isCompleted ? 'Completed' : 'Cancelled'}
                          </StatusBadge>
                        </div>
                        {/* Session Note Panel — only for completed sessions */}
                        {isCompleted && (
                          <SessionNotePanel
                            bookingId={session.id}
                            isLocked={!!isLocked}
                            canEdit={true}
                            editorId={profile?.id}
                            initialContent={note?.content ?? null}
                            lastEditedByName={note?.editor_profile?.full_name ?? null}
                            lastEditedAt={note?.last_edited_at ?? null}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Pagination */}
                {historyTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredHistory.length)} of {filteredHistory.length} sessions
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-[var(--line-strong)] rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: historyTotalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-[#0F1919] text-[#FFFBF3]'
                                : 'text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(historyTotalPages, p + 1))}
                        disabled={currentPage === historyTotalPages}
                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-[var(--line-strong)] rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
