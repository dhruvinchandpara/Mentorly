import { describe, it, expect, vi } from 'vitest'

const { createAdminClientMock } = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(() => {
    throw new Error('rejectBooking should validate the reason before creating a Supabase client')
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
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

import { approvePostSession, rejectBooking, sendSessionForRevision } from './actions'

// Builds a minimal fake Supabase admin client that supports the
// `.from('sessions').select(...).eq(...).single()` read used by the status
// guards, plus `.update(...)` and (for `session_revisions`) `.insert(...)`
// so tests can assert those writes were never reached.
function makeMockSupabase(sessionRow: { id: string; status: string } | null) {
  const updateEqMock = vi.fn(() => Promise.resolve({ error: null }))
  const updateMock = vi.fn(() => ({ eq: updateEqMock }))
  const insertMock = vi.fn(() => Promise.resolve({ error: null }))
  const singleMock = vi.fn(() =>
    Promise.resolve(
      sessionRow ? { data: sessionRow, error: null } : { data: null, error: new Error('not found') }
    )
  )
  const eqMock = vi.fn(() => ({ single: singleMock }))
  const selectMock = vi.fn(() => ({ eq: eqMock }))

  const fromMock = vi.fn((table: string) => {
    if (table === 'sessions') {
      return { select: selectMock, update: updateMock }
    }
    if (table === 'session_revisions') {
      return { insert: insertMock }
    }
    throw new Error(`Unexpected table in mock: ${table}`)
  })

  return { from: fromMock, updateMock, insertMock, selectMock }
}

describe('rejectBooking validation', () => {
  it('rejects an empty reason without touching the database', async () => {
    const result = await rejectBooking('session-1', '')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/reason/i)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only reason without touching the database', async () => {
    const result = await rejectBooking('session-1', '   ')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/reason/i)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })
})

describe('sendSessionForRevision validation', () => {
  it('rejects an empty reason without touching the database', async () => {
    const result = await sendSessionForRevision('session-1', '', 'admin-1')
    expect(result.success).toBe(false)
    expect(result.success === false && result.error).toMatch(/revision reason/i)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })

  it('rejects a whitespace-only reason without touching the database', async () => {
    const result = await sendSessionForRevision('session-1', '   ', 'admin-1')
    expect(result.success).toBe(false)
    expect(result.success === false && result.error).toMatch(/revision reason/i)
    expect(createAdminClientMock).not.toHaveBeenCalled()
  })
})

describe('approvePostSession status guard', () => {
  it('rejects a session that is not awaiting post-session review, without updating it', async () => {
    const mock = makeMockSupabase({ id: 'session-1', status: 'completed' })
    ;(createAdminClientMock as any).mockImplementationOnce(() => mock)

    const result = await approvePostSession('session-1')

    expect(result.success).toBe(false)
    expect(result.success === false && result.error).toMatch(/not awaiting post-session review/i)
    expect(result.success === false && result.error).toMatch(/completed/i)
    expect(mock.updateMock).not.toHaveBeenCalled()
  })
})

describe('sendSessionForRevision status guard', () => {
  it('rejects a session that is not awaiting post-session review, without inserting a revision', async () => {
    const mock = makeMockSupabase({ id: 'session-1', status: 'completed' })
    ;(createAdminClientMock as any).mockImplementationOnce(() => mock)

    const result = await sendSessionForRevision('session-1', 'Please add more detail on outcomes.', 'admin-1')

    expect(result.success).toBe(false)
    expect(result.success === false && result.error).toMatch(/not awaiting post-session review/i)
    expect(result.success === false && result.error).toMatch(/completed/i)
    expect(mock.insertMock).not.toHaveBeenCalled()
  })
})
