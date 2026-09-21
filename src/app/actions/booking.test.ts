import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    throw new Error('processBooking should validate input before creating a Supabase client')
  },
}))

import { processBooking } from './booking'

const baseInput = {
  mentorId: 'mentor-1',
  studentId: 'student-1',
  startTime: '2026-01-01T10:00:00.000Z',
  endTime: '2026-01-01T10:30:00.000Z',
  durationMinutes: 30 as const,
  preWorkReason: 'Discuss my project roadmap',
}

describe('processBooking validation', () => {
  it('rejects a duration outside 15/30/45/60 without touching the database', async () => {
    // Cast simulates a bypassed client sending an untrusted value at runtime.
    const result = await processBooking({ ...baseInput, durationMinutes: 90 as unknown as 30 })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/duration/i)
  })

  it('rejects a missing pre-work reason without touching the database', async () => {
    const result = await processBooking({ ...baseInput, preWorkReason: '' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/why you need this session/i)
  })

  it('rejects a whitespace-only pre-work reason without touching the database', async () => {
    const result = await processBooking({ ...baseInput, preWorkReason: '   ' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/why you need this session/i)
  })
})
