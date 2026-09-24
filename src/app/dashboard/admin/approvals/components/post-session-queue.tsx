'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { approvePostSession, sendSessionForRevision } from '@/app/dashboard/admin/actions';
import { BookOpen, Check, RotateCcw, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { ExpandableRow } from '@/components/ui/expandable-row';
import { RevisionReasonModal } from '@/components/ui/revision-reason-modal';
import {
  fetchSessionsByStatus,
  type SessionInfo,
} from '@/app/dashboard/admin/approvals/lib/fetch-queue-sessions';

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const BATCH_SIZE = 10;

export function PostSessionQueue({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const { supabase, profile } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [reviseModalSessionId, setReviseModalSessionId] = useState<string | null>(null);
  const [reviseSubmitting, setReviseSubmitting] = useState(false);
  const [reviseError, setReviseError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const data = await fetchSessionsByStatus(supabase, ['awaiting_post_review']);
    setSessions(data);
    setLoading(false);
    onCountChange?.(data.length);
  };

  const handleApprovePostSession = async (sessionId: string) => {
    setActionLoading((prev) => ({ ...prev, [sessionId]: true }));
    setFeedback(null);
    try {
      const res = await approvePostSession(sessionId);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Session approved and marked completed.' });
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

  const openReviseModal = (sessionId: string) => {
    setReviseError(null);
    setReviseModalSessionId(sessionId);
  };

  const closeReviseModal = () => {
    if (reviseSubmitting) return;
    setReviseModalSessionId(null);
  };

  const handleConfirmRevise = async (reason: string) => {
    const sessionId = reviseModalSessionId;
    if (!sessionId || !profile?.id) return;

    setReviseSubmitting(true);
    setFeedback(null);
    setReviseError(null);
    try {
      const res = await sendSessionForRevision(sessionId, reason, profile.id);
      if (res.success) {
        setFeedback({ type: 'success', message: 'Session sent back for revision.' });
        setReviseModalSessionId(null);
        await load();
      } else {
        setReviseError(res.error || 'Failed to send session for revision.');
      }
    } catch (err: any) {
      setReviseError(err.message || 'An error occurred while sending for revision.');
    } finally {
      setReviseSubmitting(false);
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
            <BookOpen className="w-6 h-6 text-[var(--fg-faint)]" />
          </div>
          <p className="text-sm text-muted-foreground">No session reports waiting on review.</p>
        </div>
      ) : (
        sessions.slice(0, visibleCount).map((session) => {
          const isLoading = actionLoading[session.id] || false;
          return (
            <ExpandableRow
              key={session.id}
              summary={
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-[#FBF7D9] text-[#0F1919] flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {session.mentorName}{' '}
                      <span className="font-normal text-muted-foreground">→</span> {session.studentName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(session.startTime)}
                      {session.actualDurationMinutes != null
                        ? ` · ${session.actualDurationMinutes} min`
                        : ''}
                    </p>
                  </div>
                </div>
              }
            >
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => openReviseModal(session.id)}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-semibold text-[#0F1919] bg-white border border-[#0F1919]/20 hover:bg-[var(--peach-beige)]/25 rounded-full disabled:opacity-50 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#DFA396]" />
                  Send back for revision
                </button>
                <button
                  onClick={() => handleApprovePostSession(session.id)}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-semibold text-[#FFFBF3] bg-[#0F1919] hover:bg-[#1C2C2C] rounded-full disabled:opacity-50 shadow-sm transition-all flex items-center gap-1.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Approve session
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">Key insights</p>
                  <p className="text-sm text-foreground">{session.keyInsights}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">Student actionables</p>
                  <p className="text-sm text-foreground">{session.studentActionables}</p>
                </div>
                {session.adminFeedbackNote && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">Note to admin</p>
                    <p className="text-sm text-foreground">{session.adminFeedbackNote}</p>
                  </div>
                )}
              </div>
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

      <RevisionReasonModal
        open={reviseModalSessionId !== null}
        onOpenChange={(open) => {
          if (!open) closeReviseModal();
        }}
        onConfirm={handleConfirmRevise}
        submitting={reviseSubmitting}
        error={reviseError}
      />
    </div>
  );
}
