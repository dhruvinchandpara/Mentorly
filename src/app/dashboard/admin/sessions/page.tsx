'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { approveBooking, rejectBooking } from '@/app/dashboard/admin/actions';
import {
  Clock,
  Loader2,
  Video,
  Search,
  Radio,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { SessionNotePanel } from '@/components/ui/session-note-panel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ITEMS_PER_PAGE = 10;

type SessionNoteInfo = {
  bookingId: string;
  sessionDate: string;
  content: string;
  lastEditedByName?: string | null;
  lastEditedAt?: string | null;
  isLocked: boolean;
};

type SessionInfo = {
  id: string;
  studentId: string;
  mentorId: string;
  studentName: string;
  mentorName: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  rejectionReason?: string | null;
  meetLink: string | null;
  sessionNote?: SessionNoteInfo | null;
};

export default function AdminSessions() {
  const { supabase, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!authLoading) fetchSessions();
  }, [authLoading]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const fetchSessions = async () => {
    try {
      const { data: sessionsList } = await supabase
        .from('bookings')
        .select(`
          id,
          student_id,
          mentor_id,
          start_time,
          end_time,
          duration_minutes,
          status,
          rejection_reason,
          meet_link,
          student_profiles:profiles!bookings_student_id_fkey(full_name),
          mentor_profiles:mentors(profiles(full_name)),
          session_notes(content, is_locked, last_edited_by, last_edited_at, editor_profile:profiles!session_notes_last_edited_by_fkey(full_name))
        `)
        .order('start_time', { ascending: false });

      if (sessionsList && Array.isArray(sessionsList)) {
        setSessions(
          sessionsList.map((s: any) => {
            const studentName =
              s.student_profiles &&
              typeof s.student_profiles === 'object' &&
              'full_name' in s.student_profiles
                ? String(s.student_profiles.full_name || 'Unknown')
                : 'Unknown';

            const mentorName =
              s.mentor_profiles &&
              typeof s.mentor_profiles === 'object' &&
              'profiles' in s.mentor_profiles
                ? s.mentor_profiles.profiles &&
                  typeof s.mentor_profiles.profiles === 'object' &&
                  'full_name' in s.mentor_profiles.profiles
                  ? String(s.mentor_profiles.profiles.full_name || 'Unknown')
                  : 'Unknown'
                : 'Unknown';

            const rawNote = Array.isArray(s.session_notes) && s.session_notes.length > 0 ? s.session_notes[0] : null;
            const sessionNote: SessionNoteInfo | null = rawNote && rawNote.content ? {
              bookingId: s.id,
              sessionDate: s.start_time,
              content: rawNote.content,
              lastEditedByName: rawNote.editor_profile?.full_name || null,
              lastEditedAt: rawNote.last_edited_at || null,
              isLocked: !!rawNote.is_locked,
            } : null;

            return {
              id: s.id || '',
              studentId: s.student_id || '',
              mentorId: s.mentor_id || '',
              studentName,
              mentorName,
              startTime: s.start_time || new Date().toISOString(),
              endTime: s.end_time || new Date().toISOString(),
              duration: typeof s.duration_minutes === 'number' ? s.duration_minutes : 60,
              status: s.status || 'scheduled',
              rejectionReason: s.rejection_reason || null,
              meetLink: s.meet_link || null,
              sessionNote,
            };
          })
        );
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (bookingId: string) => {
    setActionLoading((prev) => ({ ...prev, [bookingId]: true }));
    setFeedback(null);
    try {
      const res = await approveBooking(bookingId);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Session approved and Google Meet link generated!' });
        await fetchSessions();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to approve session.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'An error occurred during approval.' });
    } finally {
      setActionLoading((prev) => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleReject = async (bookingId: string) => {
    const reason = prompt('Please enter a reason for rejecting this session (optional):', 'Schedule conflict');
    if (reason === null) return; // User cancelled prompt

    setActionLoading((prev) => ({ ...prev, [bookingId]: true }));
    setFeedback(null);
    try {
      const res = await rejectBooking(bookingId, reason);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Session request has been rejected.' });
        await fetchSessions();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to reject session.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'An error occurred during rejection.' });
    } finally {
      setActionLoading((prev) => ({ ...prev, [bookingId]: false }));
    }
  };

  const now = new Date();

  const getSessionState = (session: SessionInfo) => {
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    if (session.status === 'pending') return 'pending';
    if (session.status === 'rejected') return 'rejected';
    if (session.status === 'completed') return 'completed';
    if (now >= start && now <= end && session.status === 'scheduled') return 'live';
    if (start > now && session.status === 'scheduled') return 'upcoming';
    return session.status;
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const filteredSessions = sessions.filter((session) => {
    const state = getSessionState(session);
    const matchesSearch =
      searchQuery === '' ||
      session.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.mentorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === 'all' || state === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const pendingSessions = filteredSessions.filter((s) => getSessionState(s) === 'pending');
  const liveSessions = filteredSessions.filter((s) => getSessionState(s) === 'live');
  const upcomingSessions = filteredSessions.filter((s) => getSessionState(s) === 'upcoming');
  const pastSessions = filteredSessions.filter(
    (s) =>
      getSessionState(s) === 'completed' ||
      getSessionState(s) === 'rejected' ||
      (getSessionState(s) !== 'pending' && getSessionState(s) !== 'live' && getSessionState(s) !== 'upcoming')
  );

  // Pagination logic
  const getCurrentPageData = (data: SessionInfo[]) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data: SessionInfo[]) => Math.ceil(data.length / ITEMS_PER_PAGE);

  const paginatedUpcoming = getCurrentPageData(upcomingSessions);
  const paginatedPast = getCurrentPageData(pastSessions);

  const upcomingTotalPages = getTotalPages(upcomingSessions);
  const pastTotalPages = getTotalPages(pastSessions);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[20px] border border-slate-200/60 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
            <Calendar className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-[#1e293b]">Sessions & Approvals</h1>
            <p className="text-[#64748b] text-sm mt-1">
              Review session booking requests, approve meeting links, and manage sessions
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <p className="text-sm font-medium">{feedback.message}</p>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <Input
            placeholder="Search by student or mentor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 bg-white border-slate-200/60 rounded-[14px] text-[#1e293b] placeholder:text-[#94a3b8] focus-visible:ring-[#5b7cfa]/20 focus-visible:border-[#5b7cfa]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'pending', label: `Pending (${sessions.filter(s => s.status === 'pending').length})` },
            { value: 'live', label: 'Live' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'completed', label: 'Completed' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-5 py-2.5 rounded-[14px] text-sm font-semibold transition-all ${
                statusFilter === filter.value
                  ? 'gradient-primary text-white'
                  : 'bg-white text-[#64748b] border border-slate-200/60 hover:border-[#5b7cfa]/30 hover:text-[#5b7cfa]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pending Approvals Section */}
      {pendingSessions.length > 0 && (
        <Card className="border-amber-200/80 shadow-sm bg-gradient-to-br from-amber-50/40 to-white rounded-[20px]">
          <CardHeader className="pb-4 border-b border-amber-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[16px] bg-amber-100 flex items-center justify-center shadow-sm">
                <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-[#1e293b]">
                  Pending Session Approvals ({pendingSessions.length})
                </CardTitle>
                <p className="text-xs text-[#64748b] mt-0.5">
                  Approve to generate Google Meet links and confirm booking for student & mentor
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {pendingSessions.map((session) => {
                const isLoading = actionLoading[session.id] || false;

                // Find prior completed notes for this student & mentor pair
                const priorNotes = sessions
                  .filter(
                    (s) =>
                      s.studentId === session.studentId &&
                      s.mentorId === session.mentorId &&
                      s.status === 'completed' &&
                      s.sessionNote &&
                      s.sessionNote.content &&
                      new Date(s.startTime).getTime() < new Date(session.startTime).getTime()
                  )
                  .map((s) => s.sessionNote!)
                  .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

                return (
                  <div
                    key={session.id}
                    className="p-4 bg-white border border-amber-200/60 rounded-[16px] shadow-sm hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[14px] bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1e293b]">
                            {session.studentName}{' '}
                            <span className="font-normal text-[#64748b]">requested session with</span>{' '}
                            {session.mentorName}
                          </p>
                          <p className="text-xs text-[#64748b] mt-1 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[#94a3b8]" />
                            <span>{formatDate(session.startTime)}</span>
                            <span>·</span>
                            <Clock className="w-3.5 h-3.5 text-[#94a3b8]" />
                            <span>
                              {formatTime(session.startTime)} – {formatTime(session.endTime)} ({session.duration} min)
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <button
                          onClick={() => handleReject(session.id)}
                          disabled={isLoading}
                          className="px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 disabled:opacity-50 transition-all flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(session.id)}
                          disabled={isLoading}
                          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-all flex items-center gap-1.5"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Creating Meet...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Approve Session
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Previous Session Notes Review Section */}
                    {priorNotes.length > 0 ? (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            Previous Session Note ({priorNotes.length})
                          </span>
                          <span className="text-[11px] text-slate-400">
                            From meeting on {formatDate(priorNotes[0].sessionDate)}
                          </span>
                        </div>
                        <SessionNotePanel
                          bookingId={priorNotes[0].bookingId}
                          isLocked={true}
                          canEdit={false}
                          initialContent={priorNotes[0].content}
                          lastEditedByName={priorNotes[0].lastEditedByName ?? null}
                          lastEditedAt={priorNotes[0].lastEditedAt ?? null}
                        />
                        {priorNotes.length > 1 && (
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer text-blue-600 font-medium hover:underline">
                              View {priorNotes.length - 1} older session note(s)
                            </summary>
                            <div className="space-y-2 mt-2 pl-2 border-l-2 border-slate-200">
                              {priorNotes.slice(1).map((n) => (
                                <div key={n.bookingId} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                  <div className="text-[11px] text-slate-500 font-medium mb-1">
                                    Meeting on {formatDate(n.sessionDate)}
                                  </div>
                                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{n.content}</p>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-800 text-xs font-medium">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>No previous session note found for this mentor-student pairing. Consider checking proof of work before approving.</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Sessions */}
      {liveSessions.length > 0 && (
        <Card className="border-red-200/60 shadow-sm bg-gradient-to-br from-red-50/50 to-white rounded-[20px]">
          <CardHeader className="pb-4 border-b border-red-100/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[16px] bg-red-100 flex items-center justify-center shadow-sm">
                <Radio className="w-5 h-5 text-red-600 animate-pulse" />
              </div>
              <CardTitle className="text-lg font-semibold text-[#1e293b]">
                Live Now <span className="text-[#64748b] font-normal">({liveSessions.length})</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {liveSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-white border border-red-200/40 rounded-[16px] shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[14px] bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1e293b]">
                        {session.studentName}{' '}
                        <span className="font-normal text-[#64748b]">with mentor</span>{' '}
                        {session.mentorName}
                      </p>
                      <p className="text-xs text-[#94a3b8] mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {formatTime(session.startTime)} – {formatTime(session.endTime)} ·{' '}
                        {session.duration} min
                      </p>
                    </div>
                  </div>
                  <StatusBadge variant="live" pulse>
                    Live Now
                  </StatusBadge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <Card className="border-slate-200/60 shadow-sm rounded-[20px]">
          <CardHeader className="pb-4 border-b border-slate-100/80">
            <CardTitle className="text-lg font-semibold text-[#1e293b]">
              Upcoming Approved Sessions{' '}
              <span className="text-[#64748b] font-normal">({upcomingSessions.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#fafbfc] hover:bg-[#fafbfc] border-b border-slate-100/80">
                  <TableHead className="text-[#64748b] font-semibold text-sm">Student / Mentor</TableHead>
                  <TableHead className="text-[#64748b] font-semibold text-sm">Date & Time</TableHead>
                  <TableHead className="text-[#64748b] font-semibold text-sm">Duration</TableHead>
                  <TableHead className="text-[#64748b] font-semibold text-sm text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUpcoming.map((session) => (
                  <TableRow key={session.id} className="hover:bg-[#fafbfc] border-b border-slate-100/60">
                    <TableCell>
                      <p className="text-sm font-semibold text-[#1e293b]">{session.studentName}</p>
                      <p className="text-xs text-[#94a3b8] mt-0.5">with {session.mentorName}</p>
                    </TableCell>
                    <TableCell className="text-sm text-[#475569]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#94a3b8]" />
                        <div>
                          <div className="font-medium">{formatDate(session.startTime)}</div>
                          <div className="text-xs text-[#94a3b8] mt-0.5">
                            {formatTime(session.startTime)} – {formatTime(session.endTime)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f1f5f9] text-[#475569] rounded-[10px] text-xs font-medium">
                        <Clock className="w-3 h-3" />
                        {session.duration} min
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge variant="upcoming" size="sm">
                        Approved
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {upcomingTotalPages > 1 && (
              <div className="flex items-center justify-between p-6 border-t border-slate-100/80">
                <p className="text-sm text-[#64748b]">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, upcomingSessions.length)} of {upcomingSessions.length} sessions
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-[#475569] bg-white border border-slate-200/60 rounded-[14px] hover:bg-[#fafbfc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: upcomingTotalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 text-sm font-medium rounded-[14px] transition-colors ${
                          currentPage === page
                            ? 'gradient-primary text-white'
                            : 'text-[#475569]'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(upcomingTotalPages, p + 1))}
                    disabled={currentPage === pastTotalPages}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-[#475569] bg-white border border-slate-200/60 rounded-[14px] hover:bg-[#fafbfc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Past & Rejected Sessions */}
      <Card className="border-slate-200/60 shadow-sm rounded-[20px]">
        <CardHeader className="pb-4 border-b border-slate-100/80">
          <CardTitle className="text-lg font-semibold text-[#1e293b]">
            Past & Rejected Sessions{' '}
            <span className="text-[#64748b] font-normal">({pastSessions.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pastSessions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-[#f1f5f9] rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-[#94a3b8]" />
              </div>
              <p className="text-[#64748b]">No past or rejected sessions found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#fafbfc] hover:bg-[#fafbfc] border-b border-slate-100/80">
                    <TableHead className="text-[#64748b] font-semibold text-sm">Student / Mentor</TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-sm">Date & Time</TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-sm">Duration</TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-sm text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPast.map((session) => (
                    <TableRow
                      key={session.id}
                      className="hover:bg-[#fafbfc] border-b border-slate-100/60 last:border-0"
                    >
                      <TableCell>
                        <p className="text-sm font-semibold text-[#1e293b]">{session.studentName}</p>
                        <p className="text-xs text-[#94a3b8] mt-0.5">with {session.mentorName}</p>
                      </TableCell>
                      <TableCell className="text-sm text-[#475569]">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#94a3b8]" />
                          <div>
                            <div className="font-medium">{formatDate(session.startTime)}</div>
                            <div className="text-xs text-[#94a3b8] mt-0.5">
                              {formatTime(session.startTime)} – {formatTime(session.endTime)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f1f5f9] text-[#475569] rounded-[10px] text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          {session.duration} min
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {session.status === 'rejected' ? (
                          <StatusBadge variant="rejected" size="sm">
                            Rejected
                          </StatusBadge>
                        ) : (
                          <StatusBadge
                            variant={getSessionState(session) === 'completed' ? 'completed' : 'inactive'}
                            size="sm"
                          >
                            {getSessionState(session) === 'completed' ? 'Completed' : 'Scheduled'}
                          </StatusBadge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pastTotalPages > 1 && (
                <div className="flex items-center justify-between p-6 border-t border-slate-100/80">
                  <p className="text-sm text-[#64748b]">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, pastSessions.length)} of {pastSessions.length} sessions
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-[#475569] bg-white border border-slate-200/60 rounded-[14px] hover:bg-[#fafbfc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: pastTotalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 text-sm font-medium rounded-[14px] transition-colors ${
                            currentPage === page
                              ? 'gradient-primary text-white'
                              : 'text-[#475569]'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(pastTotalPages, p + 1))}
                      disabled={currentPage === pastTotalPages}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-[#475569] bg-white border border-slate-200/60 rounded-[14px] hover:bg-[#fafbfc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    </div>
  );
}
