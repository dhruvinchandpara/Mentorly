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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RejectReasonModal } from '@/components/ui/reject-reason-modal';

const ITEMS_PER_PAGE = 10;

type PriorSessionInfo = {
  keyInsights: string | null;
  studentActionables: string | null;
  status: string;
  postSessionSubmittedAt: string;
} | null;

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
  preWorkReason: string;
  keyInsights: string | null;
  studentActionables: string | null;
  postSessionSubmittedAt: string | null;
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
  const [rejectModalSessionId, setRejectModalSessionId] = useState<string | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) fetchSessions();
  }, [authLoading]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const fetchSessions = async () => {
    try {
      // Try new sessions table first, fall back to legacy bookings view
      let sessionsList: any[] | null = null
      const { data: sessData, error: sessErr } = await supabase
        .from('sessions')
        .select(`
          id, student_id, mentor_id,
          requested_date, requested_start_time, start_time, end_time,
          duration_minutes, actual_duration_minutes, status, rejection_reason, meet_link,
          pre_work_reason, student_actionables, key_insights, post_session_submitted_at,
          student_profiles:profiles!bookings_student_id_fkey(full_name),
          mentor_profiles:profiles!sessions_mentor_id_fkey(full_name)
        `)
        .order('requested_date', { ascending: false })

      if (!sessErr && sessData) {
        sessionsList = sessData.map((s: any) => ({
          ...s,
          start_time: s.start_time || (s.requested_date ? new Date(s.requested_date + 'T' + (s.requested_start_time || '00:00:00') + 'Z').toISOString() : null),
          mentor_profiles: s.mentor_profiles ? { profiles: s.mentor_profiles } : null,
        }))
      } else {
        const { data: legacyData } = await supabase
          .from('bookings')
          .select(`
            id, student_id, mentor_id, start_time, end_time, duration_minutes,
            status, rejection_reason, meet_link,
            student_profiles:profiles!bookings_student_id_fkey(full_name),
            mentor_profiles:mentors(profiles(full_name))
          `)
          .order('start_time', { ascending: false })
        sessionsList = legacyData
      }

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
              preWorkReason: s.pre_work_reason || '',
              keyInsights: s.key_insights || null,
              studentActionables: s.student_actionables || null,
              postSessionSubmittedAt: s.post_session_submitted_at || null,
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

  const openRejectModal = (bookingId: string) => {
    setRejectError(null);
    setRejectModalSessionId(bookingId);
  };

  const closeRejectModal = () => {
    if (rejectSubmitting) return;
    setRejectModalSessionId(null);
  };

  const handleConfirmReject = async (reason: string) => {
    const bookingId = rejectModalSessionId;
    if (!bookingId) return;

    setRejectSubmitting(true);
    setFeedback(null);
    setRejectError(null);
    try {
      const res = await rejectBooking(bookingId, reason);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Session request rejected' });
        setRejectModalSessionId(null);
        await fetchSessions();
      } else {
        // Shown in-modal (below the textarea) rather than the page banner, since the
        // banner can be hidden behind the modal's backdrop or scrolled out of view.
        setRejectError(res.error || 'Failed to reject session.');
      }
    } catch (err: any) {
      setRejectError(err.message || 'An error occurred during rejection.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const now = new Date();

  const getSessionState = (session: SessionInfo) => {
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    if (session.status === 'pending' || session.status === 'requested') return 'pending';
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
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-[20px] border border-border/60 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
            <Calendar className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-foreground">Sessions & Approvals</h1>
            <p className="text-muted-foreground text-sm mt-1">
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
              ? 'bg-success-bg text-success border border-success'
              : 'bg-[#F5E6DE] text-destructive border border-destructive'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
          )}
          <p className="text-sm font-medium">{feedback.message}</p>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--fg-faint)]" />
          <Input
            placeholder="Search by student or mentor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 bg-white border-border/60 rounded-[14px] text-foreground placeholder:text-[var(--fg-faint)] focus-visible:ring-primary/20 focus-visible:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All' },
            { value: 'pending', label: `Pending (${sessions.filter(s => s.status === 'pending' || s.status === 'requested').length})` },
            { value: 'live', label: 'Live' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'completed', label: 'Completed' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-5 py-2.5 rounded-[14px] text-sm font-semibold transition-all ${
                statusFilter === filter.value
                  ? 'bg-[#0F1919] text-[#FFFBF3]'
                  : 'bg-white text-muted-foreground border border-border/60 hover:border-[#0F1919]/30 hover:text-[#0F1919]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pending Approvals Section */}
      {pendingSessions.length > 0 && (
        <Card className="border-warning/80 shadow-sm bg-gradient-to-br from-warning-bg/40 to-white rounded-[20px]">
          <CardHeader className="pb-4 border-b border-warning">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[16px] bg-warning-bg flex items-center justify-center shadow-sm">
                <Clock className="w-5 h-5 text-warning animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">
                  Pending Session Approvals ({pendingSessions.length})
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Approve to generate Google Meet links and confirm booking for student & mentor
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {pendingSessions.map((session) => {
                const isLoading = actionLoading[session.id] || false;

                // Sorted by postSessionSubmittedAt (when the post-session form was filed), not
                // startTime: we intentionally want the most recently *reported-on* prior session,
                // regardless of its approval status.
                const priorSession: PriorSessionInfo = sessions
                  .filter(
                    (s) =>
                      s.studentId === session.studentId &&
                      s.mentorId === session.mentorId &&
                      s.id !== session.id &&
                      !!s.postSessionSubmittedAt
                  )
                  .sort(
                    (a, b) =>
                      new Date(b.postSessionSubmittedAt as string).getTime() -
                      new Date(a.postSessionSubmittedAt as string).getTime()
                  )
                  .map((s) => ({
                    keyInsights: s.keyInsights,
                    studentActionables: s.studentActionables,
                    status: s.status,
                    postSessionSubmittedAt: s.postSessionSubmittedAt as string,
                  }))[0] ?? null;

                return (
                  <div
                    key={session.id}
                    className="p-4 bg-white border border-warning/60 rounded-[16px] shadow-sm hover:shadow-md transition-all space-y-3"
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[14px] bg-warning-bg text-warning flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {session.studentName}{' '}
                            <span className="font-normal text-muted-foreground">requested session with</span>{' '}
                            {session.mentorName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[var(--fg-faint)]" />
                            <span>{formatDate(session.startTime)}</span>
                            <span>·</span>
                            <Clock className="w-3.5 h-3.5 text-[var(--fg-faint)]" />
                            <span>
                              {formatTime(session.startTime)} – {formatTime(session.endTime)} ({session.duration} min)
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        {/* Hardcoded hex, not --primary/--destructive: those tokens are inverted for this
                            screen (--primary resolves to crimson, --destructive to dark-maroon), so a
                            "convert to tokens" cleanup should not touch these without reconciling that. */}
                        <button
                          onClick={() => openRejectModal(session.id)}
                          disabled={isLoading}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#BA3B41] hover:bg-[#A8343A] rounded-full disabled:opacity-50 shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject session
                        </button>
                        <button
                          onClick={() => handleApprove(session.id)}
                          disabled={isLoading}
                          className="px-4 py-2 text-xs font-semibold text-[#FFFBF3] bg-[#0F1919] hover:bg-[#1C2C2C] rounded-full disabled:opacity-50 shadow-sm transition-all flex items-center gap-1.5"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Creating Meet...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Approve session
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {session.preWorkReason && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Reason for session:</p>
                        <p className="text-sm text-foreground">{session.preWorkReason}</p>
                      </div>
                    )}

                    {priorSession && (
                      <div className="rounded-[14px] bg-muted p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            Previous session with this mentor
                          </span>
                          {priorSession.status !== 'completed' && (
                            <StatusBadge variant="pending" size="sm" icon={false} className="rounded-full">
                              Unapproved
                            </StatusBadge>
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground">What happened last time</p>
                          <p className="text-sm text-foreground">
                            {priorSession.keyInsights || <span className="text-muted-foreground">Not recorded</span>}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-muted-foreground">Assigned before this session</p>
                          <p className="text-sm text-foreground">
                            {priorSession.studentActionables || <span className="text-muted-foreground">Not recorded</span>}
                          </p>
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
        <Card className="border-destructive/60 shadow-sm bg-gradient-to-br from-[#F5E6DE]/50 to-white rounded-[20px]">
          <CardHeader className="pb-4 border-b border-destructive/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[16px] bg-[#F5E6DE] flex items-center justify-center shadow-sm">
                <Radio className="w-5 h-5 text-destructive animate-pulse" />
              </div>
              <CardTitle className="text-lg font-semibold text-foreground">
                Live Now <span className="text-muted-foreground font-normal">({liveSessions.length})</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {liveSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-white border border-destructive/40 rounded-[16px] shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[14px] bg-[#F5E6DE] text-destructive flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {session.studentName}{' '}
                        <span className="font-normal text-muted-foreground">with mentor</span>{' '}
                        {session.mentorName}
                      </p>
                      <p className="text-xs text-[var(--fg-faint)] mt-1 flex items-center gap-1.5">
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
        <Card className="border-border/60 shadow-sm rounded-[20px]">
          <CardHeader className="pb-4 border-b border-border/80">
            <CardTitle className="text-lg font-semibold text-foreground">
              Upcoming Approved Sessions{' '}
              <span className="text-muted-foreground font-normal">({upcomingSessions.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-background hover:bg-background border-b border-border/80">
                  <TableHead className="text-muted-foreground font-semibold text-sm">Student / Mentor</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-sm">Date & Time</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-sm">Duration</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-sm text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUpcoming.map((session) => (
                  <TableRow key={session.id} className="hover:bg-background border-b border-border/60">
                    <TableCell>
                      <p className="text-sm font-semibold text-foreground">{session.studentName}</p>
                      <p className="text-xs text-[var(--fg-faint)] mt-0.5">with {session.mentorName}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[var(--fg-faint)]" />
                        <div>
                          <div className="font-medium">{formatDate(session.startTime)}</div>
                          <div className="text-xs text-[var(--fg-faint)] mt-0.5">
                            {formatTime(session.startTime)} – {formatTime(session.endTime)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-[10px] text-xs font-medium">
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
              <div className="flex items-center justify-between p-6 border-t border-border/80">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, upcomingSessions.length)} of {upcomingSessions.length} sessions
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-white border border-border/60 rounded-[14px] hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                            ? 'bg-[#0F1919] text-[#FFFBF3]'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(upcomingTotalPages, p + 1))}
                    disabled={currentPage === pastTotalPages}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-white border border-border/60 rounded-[14px] hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      <Card className="border-border/60 shadow-sm rounded-[20px]">
        <CardHeader className="pb-4 border-b border-border/80">
          <CardTitle className="text-lg font-semibold text-foreground">
            Past & Rejected Sessions{' '}
            <span className="text-muted-foreground font-normal">({pastSessions.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pastSessions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-[var(--fg-faint)]" />
              </div>
              <p className="text-muted-foreground">No past or rejected sessions found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-background hover:bg-background border-b border-border/80">
                    <TableHead className="text-muted-foreground font-semibold text-sm">Student / Mentor</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-sm">Date & Time</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-sm">Duration</TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-sm text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPast.map((session) => (
                    <TableRow
                      key={session.id}
                      className="hover:bg-background border-b border-border/60 last:border-0"
                    >
                      <TableCell>
                        <p className="text-sm font-semibold text-foreground">{session.studentName}</p>
                        <p className="text-xs text-[var(--fg-faint)] mt-0.5">with {session.mentorName}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[var(--fg-faint)]" />
                          <div>
                            <div className="font-medium">{formatDate(session.startTime)}</div>
                            <div className="text-xs text-[var(--fg-faint)] mt-0.5">
                              {formatTime(session.startTime)} – {formatTime(session.endTime)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-[10px] text-xs font-medium">
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
                            variant={getSessionState(session) === 'completed' ? 'completed' : 'upcoming'}
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
                <div className="flex items-center justify-between p-6 border-t border-border/80">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, pastSessions.length)} of {pastSessions.length} sessions
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-white border border-border/60 rounded-[14px] hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                              : 'text-muted-foreground'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(pastTotalPages, p + 1))}
                      disabled={currentPage === pastTotalPages}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-white border border-border/60 rounded-[14px] hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      <RejectReasonModal
        open={rejectModalSessionId !== null}
        onOpenChange={(open) => {
          if (!open) closeRejectModal();
        }}
        onConfirm={handleConfirmReject}
        submitting={rejectSubmitting}
        error={rejectError}
      />
    </div>
  );
}
