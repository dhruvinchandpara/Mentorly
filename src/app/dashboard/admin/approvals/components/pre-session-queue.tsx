'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { approveBooking, rejectBooking } from '@/app/dashboard/admin/actions';
import { Clock, Check, X, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { ExpandableRow } from '@/components/ui/expandable-row';
import { RejectReasonModal } from '@/components/ui/reject-reason-modal';
import {
  fetchSessionsByStatus,
  fetchSessionsWithPostSessionReport,
  pickPriorSession,
  type SessionInfo,
} from '@/app/dashboard/admin/approvals/lib/fetch-queue-sessions';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatTime = (d: string) =>
  new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

const BATCH_SIZE = 10;

export function PreSessionQueue({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const { supabase } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [reportHistory, setReportHistory] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [rejectModalSessionId, setRejectModalSessionId] = useState<string | null>(null);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [pending, history] = await Promise.all([
      fetchSessionsByStatus(supabase, ['requested']),
      fetchSessionsWithPostSessionReport(supabase),
    ]);
    setSessions(pending);
    setReportHistory(history);
    setLoading(false);
    onCountChange?.(pending.length);
  };

  const handleApprove = async (sessionId: string) => {
    setActionLoading((prev) => ({ ...prev, [sessionId]: true }));
    setFeedback(null);
    try {
      const res = await approveBooking(sessionId);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Session approved and Google Meet link generated!' });
        await load();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Failed to approve session.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'An error occurred during approval.' });
    } finally {
      setActionLoading((prev) => ({ ...prev, [sessionId]: false }));
    }
  };

  const openRejectModal = (sessionId: string) => {
    setRejectError(null);
    setRejectModalSessionId(sessionId);
  };

  const closeRejectModal = () => {
    if (rejectSubmitting) return;
    setRejectModalSessionId(null);
  };

  const handleConfirmReject = async (reason: string) => {
    const sessionId = rejectModalSessionId;
    if (!sessionId) return;

    setRejectSubmitting(true);
    setFeedback(null);
    setRejectError(null);
    try {
      const res = await rejectBooking(sessionId, reason);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Session request rejected' });
        setRejectModalSessionId(null);
        await load();
      } else {
        setRejectError(res.error || 'Failed to reject session.');
      }
    } catch (err: any) {
      setRejectError(err.message || 'An error occurred during rejection.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feedback && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
            feedback.type === 'success'
              ? 'bg-success-bg text-success border border-success'
              : 'bg-[#F5E6DE] text-destructive border border-destructive'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <p className="font-medium">{feedback.message}</p>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-[var(--fg-faint)]" />
          </div>
          <p className="text-sm text-muted-foreground">No sessions waiting on pre-session approval.</p>
        </div>
      ) : (
        sessions.slice(0, visibleCount).map((session) => {
          const isLoading = actionLoading[session.id] || false;
          const priorSession = pickPriorSession(
            reportHistory,
            session.studentId,
            session.mentorId,
            session.id
          );

          return (
            <ExpandableRow
              key={session.id}
              summary={
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-warning-bg text-warning flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {session.studentName}{' '}
                      <span className="font-normal text-muted-foreground">→</span> {session.mentorName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(session.startTime)} · {formatTime(session.startTime)}
                    </p>
                  </div>
                </div>
              }
            >
              <div className="flex items-center gap-2 justify-end">
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
                      {priorSession.studentActionables || (
                        <span className="text-muted-foreground">Not recorded</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </ExpandableRow>
          );
        })
      )}

      {sessions.length > visibleCount && (
        <button
          onClick={() => setVisibleCount((c) => c + BATCH_SIZE)}
          className="w-full py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
        >
          Load more ({sessions.length - visibleCount} remaining)
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}

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
