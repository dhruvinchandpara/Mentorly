'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { validatePostSessionForm } from '@/lib/booking-validation'

export type PostSessionFormInput = {
  sessionId: string
  mentorId: string
  keyInsights: string
  studentActionables: string
  actualDurationMinutes: number
  adminFeedbackNote?: string
}

export async function submitPostSessionForm(input: PostSessionFormInput) {
  const validation = validatePostSessionForm({
    keyInsights: input.keyInsights,
    studentActionables: input.studentActionables,
    actualDurationMinutes: input.actualDurationMinutes,
    adminFeedbackNote: input.adminFeedbackNote,
  })
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  try {
    const supabase = createAdminClient()

    const { data: session, error: fetchErr } = await supabase
      .from('sessions')
      .select('id, mentor_id, status')
      .eq('id', input.sessionId)
      .single()

    if (fetchErr || !session) {
      return { success: false, error: 'Session not found.' }
    }

    if (session.mentor_id !== input.mentorId) {
      return { success: false, error: 'Only the assigned mentor can submit this session report.' }
    }

    if (session.status !== 'scheduled' && session.status !== 'revise') {
      return {
        success: false,
        error: `This session cannot be submitted for review from its current status ("${session.status}").`,
      }
    }

    const { error: updateErr } = await supabase
      .from('sessions')
      .update({
        key_insights: input.keyInsights.trim(),
        student_actionables: input.studentActionables.trim(),
        actual_duration_minutes: input.actualDurationMinutes,
        admin_feedback_note: input.adminFeedbackNote?.trim() || null,
        post_session_submitted_at: new Date().toISOString(),
        status: 'awaiting_post_review',
      })
      .eq('id', input.sessionId)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    return { success: true }
  } catch (error) {
    console.error('submitPostSessionForm error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    }
  }
}
