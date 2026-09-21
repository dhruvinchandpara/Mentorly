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
import { PostSessionForm } from '@/components/ui/post-session-form'

const ITEMS_PER_PAGE = 10

interface SessionRow {
  id: string
  student_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  actual_duration_minutes: number | null
  status: 'requested' | 'scheduled' | 'awaiting_post_review' | 'revise' | 'completed' | 'rejected'
  meet_link: string | null
  key_insights: string | null
  student_actionables: string | null
  admin_feedback_note: string | null
  student: { full_name: string; email: string; bio: string | null } | null
}

type RevisionRow = { session_id: string; reason: string; created_at: string }

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
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [revisionsBySession, setRevisionsBySession] = useState<Record<string, RevisionRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<SessionRow | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Tick to refresh session states
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const fetchSessions = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, student_id, start_time, end_time, duration_minutes, actual_duration_minutes,
          status, meet_link, key_insights, student_actionables, admin_feedback_note,
          student:profiles!bookings_student_id_fkey(full_name, email, bio)
        `)
        .eq('mentor_id', profile.id)
        .order('start_time', { ascending: false })

      if (error) {
        console.error('Error fetching sessions:', error)
        setSessions([])
        return
      }

      const rows = (data || []) as unknown as SessionRow[]
      setSessions(rows)

      const reviseIds = rows.filter(r => r.status === 'revise').map(r => r.id)
      if (reviseIds.length > 0) {
        const { data: revisionData } = await supabase
          .from('session_revisions')
          .select('session_id, reason, created_at')
          .in('session_id', reviseIds)
          .order('created_at', { ascending: false })

        const grouped: Record<string, RevisionRow[]> = {}
        for (const rev of revisionData || []) {
          grouped[rev.session_id] = grouped[rev.session_id] || []
          grouped[rev.session_id].push(rev)
        }
        setRevisionsBySession(grouped)
      } else {
        setRevisionsBySession({})
      }
    } catch (err: any) {
      console.error('Error fetching sessions:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, profile])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

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

  // Categorize sessions
  const now = new Date()

  const liveSessions = sessions.filter(s => {
    const state = getSessionState(s.start_time, s.end_time)
    return state === 'live' && s.status === 'scheduled'
  })

  const upcomingSessions = sessions.filter(s => {
    const state = getSessionState(s.start_time, s.end_time)
    return s.status === 'scheduled' && new Date(s.start_time) > now && state !== 'live'
  })

  // Actionable: a held session still waiting on the mentor's report, or one sent back for revision.
  const toSubmitSessions = sessions.filter(s =>
    (s.status === 'scheduled' && getSessionState(s.start_time, s.end_time) === 'past') || s.status === 'revise'
  )

  const historySessions = sessions.filter(s => s.status === 'completed')

  // Apply search filter
  const filterBySearch = (rows: SessionRow[]) => {
    if (!searchQuery) return rows
    return rows.filter(s =>
      s.student?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const filteredUpcoming = filterBySearch(upcomingSessions)
  const filteredToSubmit = filterBySearch(toSubmitSessions)
  const filteredHistory = filterBySearch(historySessions)

  // Reset to page 1 when changing tabs or search
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  // Pagination logic
  const getCurrentPageData = (data: SessionRow[]) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return data.slice(startIndex, endIndex)
  }

  const getTotalPages = (data: SessionRow[]) => Math.ceil(data.length / ITEMS_PER_PAGE)

  const paginatedUpcoming = getCurrentPageData(filteredUpcoming)
  const paginatedToSubmit = getCurrentPageData(filteredToSubmit)
  const paginatedHistory = getCurrentPageData(filteredHistory)

  const upcomingTotalPages = getTotalPages(filteredUpcoming)
  const toSubmitTotalPages = getTotalPages(filteredToSubmit)
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
                  {(selectedStudent.student?.full_name || 'S').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">{selectedStudent.student?.full_name || 'Unknown Student'}</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.student?.email}</p>
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
                {selectedStudent.student?.bio ? (
                  <div className="bg-muted rounded-xl p-4 border border-border">
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {selectedStudent.student.bio}
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

      {/* Live Sessions (Always at top if exists) */}
      {liveSessions.length > 0 && (
        <Card className="border-destructive/30 bg-accent/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-destructive animate-pulse" />
              <CardTitle className="text-base text-foreground">Live Now - Ongoing Session</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveSessions.map(session => {
              const studentName = session.student?.full_name || 'Unknown Student'
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
          To Submit ({filteredToSubmit.length})
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
                    const studentName = session.student?.full_name || 'Unknown Student'
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
            <CardTitle className="text-base">Sessions To Submit</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredToSubmit.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                <p className="text-sm text-[var(--fg-faint)]">
                  {searchQuery ? 'No sessions match your search.' : '✅ All caught up! No session reports are due.'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedToSubmit.map(session => {
                    const studentName = session.student?.full_name || 'Unknown Student'
                    const isRevise = session.status === 'revise'
                    const revisions = (revisionsBySession[session.id] || []).map(r => ({
                      reason: r.reason,
                      createdAt: r.created_at,
                    }))

                    return (
                      <div key={session.id} className="p-4 bg-warning-bg/40 border border-warning/30 rounded-lg space-y-4">
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
                                <Clock className="w-3 h-3 ml-2" />
                                {formatTime(session.start_time)} – {formatTime(session.end_time)}
                              </p>
                            </div>
                          </div>
                          {isRevise && (
                            <StatusBadge variant="revise" size="sm">
                              Needs revision
                            </StatusBadge>
                          )}
                        </div>

                        <PostSessionForm
                          sessionId={session.id}
                          mentorId={profile?.id || ''}
                          initial={
                            isRevise
                              ? {
                                  keyInsights: session.key_insights || '',
                                  studentActionables: session.student_actionables || '',
                                  actualDurationMinutes: session.actual_duration_minutes || session.duration_minutes,
                                  adminFeedbackNote: session.admin_feedback_note || '',
                                }
                              : null
                          }
                          revisions={revisions}
                          onSubmitted={fetchSessions}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Pagination */}
                {toSubmitTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredToSubmit.length)} of {filteredToSubmit.length} sessions
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
                        {Array.from({ length: toSubmitTotalPages }, (_, i) => i + 1).map(page => (
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
                        onClick={() => setCurrentPage(p => Math.min(toSubmitTotalPages, p + 1))}
                        disabled={currentPage === toSubmitTotalPages}
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
                    const studentName = session.student?.full_name || 'Unknown Student'
                    return (
                      <div key={session.id} className="p-4 bg-card border border-border rounded-lg space-y-3">
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
                                {formatTime(session.start_time)} – {formatTime(session.end_time)}
                                {session.actual_duration_minutes != null ? ` (${session.actual_duration_minutes} min actual)` : ''}
                              </p>
                            </div>
                          </div>
                          <StatusBadge variant="completed" size="sm">
                            Completed
                          </StatusBadge>
                        </div>
                        {(session.key_insights || session.student_actionables) && (
                          <div className="pt-2 border-t border-border space-y-2">
                            {session.key_insights && (
                              <div>
                                <p className="text-[11px] font-semibold text-muted-foreground">Key insights</p>
                                <p className="text-sm text-foreground">{session.key_insights}</p>
                              </div>
                            )}
                            {session.student_actionables && (
                              <div>
                                <p className="text-[11px] font-semibold text-muted-foreground">Student actionables</p>
                                <p className="text-sm text-foreground">{session.student_actionables}</p>
                              </div>
                            )}
                          </div>
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
