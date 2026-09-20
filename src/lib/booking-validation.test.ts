import { describe, it, expect } from 'vitest'
import { validateBookingForm, validateRejectionReason, isValidDuration, DURATION_OPTIONS } from './booking-validation'

describe('isValidDuration', () => {
  it('accepts 15, 30, 45, and 60', () => {
    for (const d of DURATION_OPTIONS) {
      expect(isValidDuration(d)).toBe(true)
    }
  })

  it('rejects a duration outside the allowed set', () => {
    expect(isValidDuration(90)).toBe(false)
  })
})

describe('validateBookingForm', () => {
  it('rejects an empty pre-work reason', () => {
    const result = validateBookingForm({ preWorkReason: '', durationMinutes: 30 })
    expect(result.valid).toBe(false)
  })

  it('rejects a whitespace-only pre-work reason', () => {
    const result = validateBookingForm({ preWorkReason: '   ', durationMinutes: 30 })
    expect(result.valid).toBe(false)
  })

  it('rejects a reason longer than 500 characters', () => {
    const result = validateBookingForm({ preWorkReason: 'a'.repeat(501), durationMinutes: 30 })
    expect(result.valid).toBe(false)
  })

  it('rejects a duration outside the allowed set', () => {
    const result = validateBookingForm({ preWorkReason: 'Discuss roadmap', durationMinutes: 90 })
    expect(result.valid).toBe(false)
  })

  it('accepts a valid reason and duration', () => {
    const result = validateBookingForm({ preWorkReason: 'Discuss roadmap', durationMinutes: 45 })
    expect(result.valid).toBe(true)
  })
})

describe('validateRejectionReason', () => {
  it('rejects an empty reason', () => {
    const result = validateRejectionReason('')
    expect(result.valid).toBe(false)
  })

  it('rejects a whitespace-only reason', () => {
    const result = validateRejectionReason('   ')
    expect(result.valid).toBe(false)
  })

  it('rejects a reason longer than 500 characters', () => {
    const result = validateRejectionReason('a'.repeat(501))
    expect(result.valid).toBe(false)
  })

  it('accepts a valid reason', () => {
    const result = validateRejectionReason('Please provide more detail on what you would like to cover')
    expect(result.valid).toBe(true)
  })
})
