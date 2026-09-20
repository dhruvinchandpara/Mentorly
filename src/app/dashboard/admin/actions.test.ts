import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    throw new Error('rejectBooking should validate the reason before creating a Supabase client')
  },
  getAdminUserId: () => {
    throw new Error('not needed for this test')
  },
}))

vi.mock('@/lib/google-calendar-oauth', () => ({
  createGoogleMeetingWithOAuth: () => {
    throw new Error('not needed for this test')
  },
}))

vi.mock('@/lib/google-oauth', () => ({
  isGoogleConnected: () => {
    throw new Error('not needed for this test')
  },
}))

import { rejectBooking } from './actions'

describe('rejectBooking validation', () => {
  it('rejects an empty reason without touching the database', async () => {
    const result = await rejectBooking('session-1', '')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/reason/i)
  })

  it('rejects a whitespace-only reason without touching the database', async () => {
    const result = await rejectBooking('session-1', '   ')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/reason/i)
  })
})
