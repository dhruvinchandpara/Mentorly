'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { IndianRupee, Loader2, CalendarCheck, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpandableRow } from '@/components/ui/expandable-row';
import { formatCurrency } from '@/lib/format-currency';
import { cn } from '@/lib/utils';

type RawSessionRow = {
  id: string;
  mentor_id: string;
  actual_duration_minutes: number | null;
  updated_at: string;
  student_profiles: { full_name: string | null } | null;
  mentor_profiles: { full_name: string | null; hourly_rate: number | null } | null;
};

type SessionRow = {
  id: string;
  mentorId: string;
  mentorName: string;
  hourlyRate: number | null;
  studentName: string;
  actualDurationMinutes: number;
  updatedAt: string;
};

type MentorGroup = {
  mentorId: string;
  mentorName: string;
  hourlyRate: number | null;
  sessions: SessionRow[];
  completedCount: number;
  totalMinutes: number;
  totalHours: number;
  amount: number | null;
};

type RangeKey = 'this_month' | 'last_month' | 'all_time' | 'custom';

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'all_time', label: 'All time' },
  { key: 'custom', label: 'Custom range' },
];

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(offsetFromCurrent: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offsetFromCurrent, 1);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const MENTORS_PER_PAGE = 10;
const SESSIONS_PER_REVEAL = 5;

function MentorSessionsList({ sessions, hourlyRate }: { sessions: SessionRow[]; hourlyRate: number | null }) {
  const [visibleCount, setVisibleCount] = useState(SESSIONS_PER_REVEAL);
  const visibleSessions = sessions.slice(0, visibleCount);

  return (
    <div className="space-y-2">
      {visibleSessions.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-3 text-sm px-2 py-2 rounded-[10px] bg-background"
        >
          <div>
            <p className="font-medium text-foreground">{s.studentName}</p>
            <p className="text-xs text-[var(--fg-faint)] mt-0.5">{formatDate(s.updatedAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">{s.actualDurationMinutes} min</p>
            <p className="text-xs text-[var(--fg-faint)] mt-0.5">
              {hourlyRate != null
                ? formatCurrency((s.actualDurationMinutes / 60) * hourlyRate)
                : 'Rate not set'}
            </p>
          </div>
        </div>
      ))}

      {sessions.length > visibleCount && (
        <button
          onClick={() => setVisibleCount((c) => c + SESSIONS_PER_REVEAL)}
          className="w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Show more ({sessions.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}

export default function AdminPayments() {
  const { supabase, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>('this_month');
  const [customStart, setCustomStart] = useState(toDateInputValue(startOfMonth(0)));
  const [customEnd, setCustomEnd] = useState(toDateInputValue(new Date()));
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!authLoading) fetchSessions();
  }, [authLoading]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          `
          id, mentor_id, actual_duration_minutes, updated_at,
          student_profiles:profiles!bookings_student_id_fkey(full_name),
          mentor_profiles:profiles!sessions_mentor_id_fkey(full_name, hourly_rate)
        `
        )
        .eq('status', 'completed')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setSessions(
          (data as unknown as RawSessionRow[]).map((s): SessionRow => {
            const studentName =
              s.student_profiles && typeof s.student_profiles === 'object' && 'full_name' in s.student_profiles
                ? String(s.student_profiles.full_name || 'Unknown')
                : 'Unknown';
            const mentorProfile = s.mentor_profiles;
            const mentorName =
              mentorProfile && typeof mentorProfile === 'object' && 'full_name' in mentorProfile
                ? String(mentorProfile.full_name || 'Unknown')
                : 'Unknown';
            const hourlyRate =
              mentorProfile && typeof mentorProfile === 'object' && typeof mentorProfile.hourly_rate === 'number'
                ? mentorProfile.hourly_rate
                : null;

            return {
              id: s.id,
              mentorId: s.mentor_id,
              mentorName,
              hourlyRate,
              studentName,
              actualDurationMinutes: typeof s.actual_duration_minutes === 'number' ? s.actual_duration_minutes : 0,
              updatedAt: s.updated_at,
            };
          })
        );
      }
    } catch (error) {
      console.error('Error fetching payment sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (range === 'this_month') {
      return { rangeStart: startOfMonth(0), rangeEnd: startOfMonth(1) };
    }
    if (range === 'last_month') {
      return { rangeStart: startOfMonth(-1), rangeEnd: startOfMonth(0) };
    }
    if (range === 'custom') {
      const start = new Date(customStart + 'T00:00:00');
      const endDay = new Date(customEnd + 'T00:00:00');
      const end = new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate() + 1);
      return { rangeStart: start, rangeEnd: end };
    }
    return { rangeStart: null, rangeEnd: null };
  }, [range, customStart, customEnd]);

  const filteredSessions = useMemo(() => {
    if (!rangeStart || !rangeEnd) return sessions;
    return sessions.filter((s) => {
      const t = new Date(s.updatedAt);
      return t >= rangeStart && t < rangeEnd;
    });
  }, [sessions, rangeStart, rangeEnd]);

  const mentorGroups = useMemo<MentorGroup[]>(() => {
    const map = new Map<string, MentorGroup>();
    for (const s of filteredSessions) {
      let group = map.get(s.mentorId);
      if (!group) {
        group = {
          mentorId: s.mentorId,
          mentorName: s.mentorName,
          hourlyRate: s.hourlyRate,
          sessions: [],
          completedCount: 0,
          totalMinutes: 0,
          totalHours: 0,
          amount: null,
        };
        map.set(s.mentorId, group);
      }
      group.sessions.push(s);
      group.completedCount += 1;
      group.totalMinutes += s.actualDurationMinutes;
    }
    return Array.from(map.values())
      .map((group) => {
        const totalHours = group.totalMinutes / 60;
        return {
          ...group,
          totalHours,
          amount: group.hourlyRate != null ? totalHours * group.hourlyRate : null,
        };
      })
      .sort((a, b) => a.mentorName.localeCompare(b.mentorName));
  }, [filteredSessions]);

  // Reset to page 1 whenever the underlying mentor list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [range, customStart, customEnd]);

  const totalPages = Math.max(1, Math.ceil(mentorGroups.length / MENTORS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedGroups = mentorGroups.slice(
    (safePage - 1) * MENTORS_PER_PAGE,
    safePage * MENTORS_PER_PAGE
  );

  const summary = useMemo(() => {
    const totalSessions = filteredSessions.length;
    const totalMinutes = filteredSessions.reduce((sum, s) => sum + s.actualDurationMinutes, 0);
    const totalAmount = mentorGroups.reduce((sum, g) => sum + (g.amount ?? 0), 0);
    return {
      totalSessions,
      totalHours: totalMinutes / 60,
      totalAmount,
    };
  }, [filteredSessions, mentorGroups]);

  const handleCustomStartChange = (value: string) => {
    setCustomStart(value);
    if (customEnd < value) setCustomEnd(value);
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
            <IndianRupee className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-foreground">Payments</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Mentor earnings computed live from completed sessions and hourly rate.
            </p>
          </div>
        </div>
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex p-1 bg-[#FBF4D7] rounded-full">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setRange(opt.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                range === opt.key ? 'bg-[#0F1919] text-[#FFFBF3]' : 'text-[#4A5454]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(e) => handleCustomStartChange(e.target.value)}
              className="px-3 py-2 text-sm rounded-[10px] border border-border/60 bg-white text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5E55A]"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-2 text-sm rounded-[10px] border border-border/60 bg-white text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5E55A]"
            />
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-modern p-5 hover-lift">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-foreground mb-1">{summary.totalSessions}</p>
          <p className="text-sm text-muted-foreground">Completed sessions</p>
        </div>

        <div className="card-modern p-5 hover-lift">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-info-bg flex items-center justify-center">
              <Clock className="w-5 h-5 text-info" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-foreground mb-1">{summary.totalHours.toFixed(1)}</p>
          <p className="text-sm text-muted-foreground">Total hours</p>
        </div>

        <div className="card-modern p-5 hover-lift">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-success-bg flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-foreground mb-1">{formatCurrency(summary.totalAmount)}</p>
          <p className="text-sm text-muted-foreground">Total amount payable</p>
        </div>
      </div>

      {/* Mentor table */}
      <Card className="border-border/60 shadow-sm rounded-[20px]">
        <CardHeader className="pb-4 border-b border-border/80">
          <CardTitle className="text-lg font-semibold text-foreground">
            Mentor earnings{' '}
            <span className="text-muted-foreground font-normal">({mentorGroups.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {mentorGroups.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <IndianRupee className="w-8 h-8 text-[var(--fg-faint)]" />
              </div>
              <p className="text-muted-foreground">
                No completed sessions in this range. Mentors will appear here once their sessions are marked
                completed.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 px-4 pb-1 text-xs font-medium text-muted-foreground">
                <span>Mentor</span>
                <span>Sessions</span>
                <span>Hours</span>
                <span>Rate</span>
                <span>Amount</span>
              </div>
              {paginatedGroups.map((group) => {
                const rateUnset = group.hourlyRate == null;
                return (
                  <ExpandableRow
                    key={group.mentorId}
                    className={cn(rateUnset && 'border-warning/40 bg-warning-bg')}
                    summary={
                      <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 items-center">
                        <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                          <p className="text-sm font-semibold text-foreground">{group.mentorName}</p>
                          {rateUnset && (
                            <span className="badge-warning">
                              <AlertCircle className="w-3 h-3" />
                              Rate not set
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{group.completedCount}</div>
                        <div className="text-sm text-muted-foreground">{group.totalHours.toFixed(1)}</div>
                        <div className="text-sm text-muted-foreground">
                          {group.hourlyRate != null ? formatCurrency(group.hourlyRate) + '/hr' : '—'}
                        </div>
                        <div className="text-sm font-semibold text-foreground">
                          {group.amount != null ? formatCurrency(group.amount) : 'Rate not set'}
                        </div>
                      </div>
                    }
                  >
                    <MentorSessionsList sessions={group.sessions} hourlyRate={group.hourlyRate} />
                  </ExpandableRow>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-4 mt-2 border-t border-border/80">
              <p className="text-sm text-muted-foreground">
                Showing {(safePage - 1) * MENTORS_PER_PAGE + 1} to{' '}
                {Math.min(safePage * MENTORS_PER_PAGE, mentorGroups.length)} of{' '}
                {mentorGroups.length} mentors
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
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
                        safePage === page
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
                  disabled={safePage === totalPages}
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
    </div>
  );
}
