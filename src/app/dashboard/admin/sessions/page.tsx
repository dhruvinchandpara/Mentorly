'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Clock, Loader2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TagSearchInput } from '@/components/ui/tag-search-input';
import { sessionMatchesTags } from '@/components/ui/tag-search-logic';

const ITEMS_PER_PAGE = 10;

type SessionInfo = {
  id: string;
  studentId: string;
  mentorId: string;
  studentName: string;
  mentorName: string;
  startTime: string;
  endTime: string;
  duration: number;
  actualDurationMinutes: number | null;
  status: string;
  rejectionReason?: string | null;
  meetLink: string | null;
  preWorkReason: string;
  keyInsights: string | null;
  studentActionables: string | null;
  adminFeedbackNote: string | null;
  postSessionSubmittedAt: string | null;
};

export default function AdminSessions() {
  const { supabase, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!authLoading) fetchSessions();
  }, [authLoading]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTags]);

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
          pre_work_reason, student_actionables, key_insights, admin_feedback_note, post_session_submitted_at,
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
              actualDurationMinutes: typeof s.actual_duration_minutes === 'number' ? s.actual_duration_minutes : null,
              status: s.status || 'scheduled',
              rejectionReason: s.rejection_reason || null,
              meetLink: s.meet_link || null,
              preWorkReason: s.pre_work_reason || '',
              keyInsights: s.key_insights || null,
              studentActionables: s.student_actionables || null,
              adminFeedbackNote: s.admin_feedback_note || null,
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

  const now = new Date();

  const getSessionState = (session: SessionInfo) => {
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    if (session.status === 'pending' || session.status === 'requested') return 'pending';
    if (session.status === 'rejected') return 'rejected';
    if (session.status === 'completed') return 'completed';
    if (session.status === 'awaiting_post_review') return 'awaiting_post_review';
    if (session.status === 'revise') return 'revise';
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

  const allNames = Array.from(
    new Set(sessions.flatMap((s) => [s.studentName, s.mentorName]))
  ).sort();

  const filteredSessions = sessions.filter((session) =>
    sessionMatchesTags(session.studentName, session.mentorName, selectedTags)
  );

  const getCurrentPageData = (data: SessionInfo[]) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / ITEMS_PER_PAGE));
  const paginatedSessions = getCurrentPageData(filteredSessions);

  const renderStatus = (session: SessionInfo) => {
    const state = getSessionState(session);
    switch (state) {
      case 'pending':
        return (
          <StatusBadge variant="pending" size="sm">
            Pending approval
          </StatusBadge>
        );
      case 'awaiting_post_review':
        return (
          <StatusBadge variant="pending" size="sm">
            Awaiting review
          </StatusBadge>
        );
      case 'live':
        return (
          <StatusBadge variant="live" size="sm" pulse>
            Live now
          </StatusBadge>
        );
      case 'upcoming':
        return (
          <StatusBadge variant="upcoming" size="sm">
            Scheduled
          </StatusBadge>
        );
      case 'completed':
        return (
          <StatusBadge variant="completed" size="sm">
            Completed
          </StatusBadge>
        );
      case 'rejected':
        return (
          <StatusBadge variant="rejected" size="sm">
            Rejected
          </StatusBadge>
        );
      case 'revise':
        return (
          <StatusBadge variant="revise" size="sm">
            Needs revision
          </StatusBadge>
        );
      default:
        return (
          <StatusBadge variant="info" size="sm">
            {state}
          </StatusBadge>
        );
    }
  };

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
            <h1 className="text-[28px] font-bold text-foreground">Sessions</h1>
            <p className="text-muted-foreground text-sm mt-1">
              A read-only log of every session. Approve or review sessions from Approvals.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <TagSearchInput
        names={allNames}
        selected={selectedTags}
        onChange={setSelectedTags}
        placeholder="Search by student or mentor name..."
      />

      {/* Sessions table */}
      <Card className="border-border/60 shadow-sm rounded-[20px]">
        <CardHeader className="pb-4 border-b border-border/80">
          <CardTitle className="text-lg font-semibold text-foreground">
            All Sessions{' '}
            <span className="text-muted-foreground font-normal">({filteredSessions.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSessions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-[var(--fg-faint)]" />
              </div>
              <p className="text-muted-foreground">No sessions found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-background hover:bg-background border-b border-border/80">
                    <TableHead className="text-muted-foreground font-semibold text-sm">
                      Student / Mentor
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-sm">
                      Date & Time
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-sm">
                      Duration
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-sm text-right">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSessions.map((session) => (
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
                      <TableCell className="text-right">{renderStatus(session)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between p-6 border-t border-border/80">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredSessions.length)} of{' '}
                    {filteredSessions.length} sessions
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-white border border-border/60 rounded-[14px] hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
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
    </div>
  );
}
