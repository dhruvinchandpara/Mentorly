import { describe, it, expect, vi } from 'vitest'

const { createAdminClientMock } = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(() => {
    throw new Error('submitPostSessionForm should validate input before creating a Supabase client')
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

import { submitPostSessionForm } from './post-session'

const baseInput = {
  sessionId: 'session-1',
  mentorId: 'mentor-1',
  keyInsights: 'We covered resume review',
  studentActionables: 'Apply to 3 jobs this week',
  actualDurationMinutes: 45,
}

describe('submitPostSessionForm validation', () => {
  it('rejects a duration that is not a multiple of 15 without touching the database', async () => {
    const result = await submitPostSessionForm({ ...baseInput, actualDurationMinutes: 20 })
    expect(result.success).toBe(false)
    expect(result.success === false && result.error).toMatch(/15-minute/i)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('rejects missing key insights without touching the database', async () => {
    const result = await submitPostSessionForm({ ...baseInput, keyInsights: '' })
    expect(result.success).toBe(false)
    expect(result.success === false && result.error).toMatch(/key insights/i)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('rejects missing student actionables without touching the database', async () => {
    const result = await submitPostSessionForm({ ...baseInput, studentActionables: '' })
    expect(result.success).toBe(false)
    expect(result.success === false && result.error).toMatch(/actionables/i)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('passes validation and proceeds to the database layer for a valid submission', async () => {
    const result = await submitPostSessionForm(baseInput)
    expect(result.success).toBe(false)
    expect(result.success === false && result.error).toMatch(
      /should validate input before creating a Supabase client/
    )
  })
})
