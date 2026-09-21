import { describe, it, expect } from 'vitest'
import { mapSessionRow, pickPriorSession, type SessionInfo } from './fetch-queue-sessions'

describe('mapSessionRow', () => {
  it('maps a full row into SessionInfo', () => {
    const row = {
      id: 's1',
      student_id: 'stu1',
      mentor_id: 'men1',
      start_time: '2026-09-22T10:00:00.000Z',
      end_time: '2026-09-22T10:30:00.000Z',
      duration_minutes: 30,
      actual_duration_minutes: 28,
      status: 'pending',
      rejection_reason: null,
      meet_link: null,
      pre_work_reason: 'Discuss resume',
      key_insights: null,
      student_actionables: null,
      admin_feedback_note: null,
      post_session_submitted_at: null,
      student_profiles: { full_name: 'Alex Student' },
      mentor_profiles: { full_name: 'Mo Mentor' },
    }

    const result = mapSessionRow(row)

    expect(result).toEqual<SessionInfo>({
      id: 's1',
      studentId: 'stu1',
      mentorId: 'men1',
      studentName: 'Alex Student',
      mentorName: 'Mo Mentor',
      startTime: '2026-09-22T10:00:00.000Z',
      endTime: '2026-09-22T10:30:00.000Z',
      duration: 30,
      actualDurationMinutes: 28,
      status: 'pending',
      rejectionReason: null,
      meetLink: null,
      preWorkReason: 'Discuss resume',
      keyInsights: null,
      studentActionables: null,
      adminFeedbackNote: null,
      postSessionSubmittedAt: null,
    })
  })

  it('derives startTime from requested_date/requested_start_time when start_time is null', () => {
    const row = {
      id: 's2',
      student_id: 'stu1',
      mentor_id: 'men1',
      start_time: null,
      requested_date: '2026-09-22',
      requested_start_time: '14:00:00',
      end_time: '2026-09-22T14:30:00.000Z',
      duration_minutes: 30,
      status: 'pending',
      student_profiles: { full_name: 'Alex Student' },
      mentor_profiles: { full_name: 'Mo Mentor' },
    }

    const result = mapSessionRow(row)

    expect(result.startTime).toBe('2026-09-22T14:00:00.000Z')
  })

  it('falls back to "Unknown" when a profile join is missing', () => {
    const row = {
      id: 's3',
      student_id: 'stu1',
      mentor_id: 'men1',
      start_time: '2026-09-22T10:00:00.000Z',
      end_time: '2026-09-22T10:30:00.000Z',
      duration_minutes: 30,
      status: 'pending',
      student_profiles: null,
      mentor_profiles: null,
    }

    const result = mapSessionRow(row)

    expect(result.studentName).toBe('Unknown')
    expect(result.mentorName).toBe('Unknown')
  })
})

describe('pickPriorSession', () => {
  const base: SessionInfo = {
    id: '',
    studentId: 'stu1',
    mentorId: 'men1',
    studentName: 'Alex Student',
    mentorName: 'Mo Mentor',
    startTime: '2026-01-01T00:00:00.000Z',
    endTime: '2026-01-01T00:30:00.000Z',
    duration: 30,
    actualDurationMinutes: null,
    status: 'completed',
    rejectionReason: null,
    meetLink: null,
    preWorkReason: '',
    keyInsights: null,
    studentActionables: null,
    adminFeedbackNote: null,
    postSessionSubmittedAt: null,
  }

  it('returns null when no candidate matches the student/mentor pair', () => {
    const candidates = [{ ...base, id: 'other', studentId: 'stu2' }]
    expect(pickPriorSession(candidates, 'stu1', 'men1', 'current')).toBeNull()
  })

  it('excludes the current session and candidates without a submitted report', () => {
    const candidates = [
      { ...base, id: 'current', postSessionSubmittedAt: '2026-01-05T00:00:00.000Z' },
      { ...base, id: 'no-report', postSessionSubmittedAt: null },
    ]
    expect(pickPriorSession(candidates, 'stu1', 'men1', 'current')).toBeNull()
  })

  it('picks the candidate with the most recent postSessionSubmittedAt', () => {
    const candidates = [
      {
        ...base,
        id: 'older',
        postSessionSubmittedAt: '2026-01-01T00:00:00.000Z',
        keyInsights: 'older insight',
      },
      {
        ...base,
        id: 'newer',
        postSessionSubmittedAt: '2026-01-10T00:00:00.000Z',
        keyInsights: 'newer insight',
        studentActionables: 'follow up on X',
        status: 'completed',
      },
    ]

    const result = pickPriorSession(candidates, 'stu1', 'men1', 'current')

    expect(result).toEqual({
      keyInsights: 'newer insight',
      studentActionables: 'follow up on X',
      status: 'completed',
      postSessionSubmittedAt: '2026-01-10T00:00:00.000Z',
    })
  })
})
