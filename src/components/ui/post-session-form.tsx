'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react'
import { validatePostSessionForm } from '@/lib/booking-validation'
import { submitPostSessionForm } from '@/app/actions/post-session'

type Revision = { reason: string; createdAt: string }

type PostSessionFormProps = {
  sessionId: string
  mentorId: string
  initial?: {
    keyInsights: string
    studentActionables: string
    actualDurationMinutes: number
    adminFeedbackNote: string
  } | null
  revisions?: Revision[]
  onSubmitted: () => void
}

const fieldClass =
  'w-full rounded-[12px] border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-[#E5E55A] focus-visible:ring-2 focus-visible:ring-[#E5E55A]'

export function PostSessionForm({ sessionId, mentorId, initial, revisions = [], onSubmitted }: PostSessionFormProps) {
  const [keyInsights, setKeyInsights] = useState(initial?.keyInsights ?? '')
  const [studentActionables, setStudentActionables] = useState(initial?.studentActionables ?? '')
  const [actualDurationMinutes, setActualDurationMinutes] = useState(
    initial?.actualDurationMinutes != null ? String(initial.actualDurationMinutes) : ''
  )
  const [adminFeedbackNote, setAdminFeedbackNote] = useState(initial?.adminFeedbackNote ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const durationValue = Number(actualDurationMinutes)
  const validation = validatePostSessionForm({
    keyInsights,
    studentActionables,
    actualDurationMinutes: durationValue,
    adminFeedbackNote,
  })
  const durationError =
    actualDurationMinutes !== '' && (!Number.isFinite(durationValue) || durationValue <= 0 || durationValue % 15 !== 0)
      ? 'Duration must be in 15-minute increments'
      : null

  const [latestRevision, ...olderRevisions] = revisions

  const handleSubmit = async () => {
    if (!validation.valid) {
      setError(validation.error)
      return
    }
    setSubmitting(true)
    setError(null)
    const res = await submitPostSessionForm({
      sessionId,
      mentorId,
      keyInsights,
      studentActionables,
      actualDurationMinutes: durationValue,
      adminFeedbackNote,
    })
    setSubmitting(false)
    if (res.success) {
      setSubmitted(true)
      onSubmitted()
    } else {
      setError(res.error || 'Failed to submit session report.')
    }
  }

  if (submitted) {
    return (
      <div className="p-4 rounded-xl flex items-center gap-3 bg-success-bg text-success border border-success">
        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
        <p className="text-sm font-medium">Submitted for review</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {latestRevision && (
        <div className="rounded-xl border border-warning/30 bg-warning-bg p-4 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Sent back for revision</p>
              <p className="text-sm text-foreground/90">{latestRevision.reason}</p>
            </div>
          </div>

          {olderRevisions.length > 0 && (
            <div className="pl-6">
              <button
                type="button"
                onClick={() => setHistoryOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                {historyOpen ? 'Hide' : 'Show'} {olderRevisions.length} earlier revision
                {olderRevisions.length > 1 ? 's' : ''}
              </button>
              {historyOpen && (
                <ul className="mt-2 space-y-2">
                  {olderRevisions.map((rev, i) => (
                    <li key={i} className="text-xs text-muted-foreground border-l-2 border-warning/30 pl-2">
                      {rev.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor={`key-insights-${sessionId}`} className="text-xs font-semibold text-muted-foreground">
          Key insights
        </label>
        <textarea
          id={`key-insights-${sessionId}`}
          value={keyInsights}
          onChange={(e) => setKeyInsights(e.target.value)}
          placeholder="What did you cover in this session?"
          rows={3}
          className={fieldClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`actionables-${sessionId}`} className="text-xs font-semibold text-muted-foreground">
          Student actionables
        </label>
        <textarea
          id={`actionables-${sessionId}`}
          value={studentActionables}
          onChange={(e) => setStudentActionables(e.target.value)}
          placeholder="What should the student do before the next session?"
          rows={3}
          className={fieldClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`duration-${sessionId}`} className="text-xs font-semibold text-muted-foreground">
          Actual session duration (minutes)
        </label>
        <input
          id={`duration-${sessionId}`}
          type="number"
          step={15}
          min={15}
          value={actualDurationMinutes}
          onChange={(e) => setActualDurationMinutes(e.target.value)}
          placeholder="e.g., 45"
          className={fieldClass}
        />
        {durationError && <p className="text-xs text-destructive">{durationError}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`admin-note-${sessionId}`} className="text-xs font-semibold text-muted-foreground">
          Note to admin <span className="font-normal text-[var(--fg-faint)]">(optional)</span>
        </label>
        <textarea
          id={`admin-note-${sessionId}`}
          value={adminFeedbackNote}
          onChange={(e) => setAdminFeedbackNote(e.target.value)}
          placeholder="Anything the admin should know about this session"
          rows={2}
          className={fieldClass}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !validation.valid}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0F1919] hover:bg-[#1C2C2C] disabled:opacity-60 text-[#FFFBF3] rounded-full text-sm font-semibold transition-colors"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Submit for review
      </button>
    </div>
  )
}
