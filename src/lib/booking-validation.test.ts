import { describe, it, expect } from 'vitest'
import {
  validateBookingForm,
  validateRejectionReason,
  validatePostSessionForm,
  validateRevisionReason,
  isValidDuration,
  DURATION_OPTIONS,
} from './booking-validation'

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

describe('validatePostSessionForm', () => {
  const base = {
    keyInsights: 'We reviewed the resume and discussed interview prep',
    studentActionables: 'Apply to 3 roles and revise the summary section',
    actualDurationMinutes: 45,
  }

  it('rejects empty key insights', () => {
    const result = validatePostSessionForm({ ...base, keyInsights: '' })
    expect(result.valid).toBe(false)
  })

  it('rejects whitespace-only key insights', () => {
    const result = validatePostSessionForm({ ...base, keyInsights: '   ' })
    expect(result.valid).toBe(false)
  })

  it('rejects empty student actionables', () => {
    const result = validatePostSessionForm({ ...base, studentActionables: '' })
    expect(result.valid).toBe(false)
  })

  it('rejects a duration that is not a multiple of 15', () => {
    const result = validatePostSessionForm({ ...base, actualDurationMinutes: 20 })
    expect(result.valid).toBe(false)
    expect(result.valid === false && result.error).toMatch(/15-minute/i)
  })

  it('rejects a zero or negative duration', () => {
    const result = validatePostSessionForm({ ...base, actualDurationMinutes: 0 })
    expect(result.valid).toBe(false)
  })

  it('accepts a valid submission with no admin note', () => {
    const result = validatePostSessionForm(base)
    expect(result.valid).toBe(true)
  })

  it('accepts a valid submission with an admin note', () => {
    const result = validatePostSessionForm({ ...base, adminFeedbackNote: 'Great session, very engaged student.' })
    expect(result.valid).toBe(true)
  })

  it('rejects an admin note longer than 1000 characters', () => {
    const result = validatePostSessionForm({ ...base, adminFeedbackNote: 'a'.repeat(1001) })
    expect(result.valid).toBe(false)
  })
})

describe('validateRevisionReason', () => {
  it('rejects an empty reason', () => {
    const result = validateRevisionReason('')
    expect(result.valid).toBe(false)
  })

  it('rejects a whitespace-only reason', () => {
    const result = validateRevisionReason('   ')
    expect(result.valid).toBe(false)
  })

  it('rejects a reason longer than 500 characters', () => {
    const result = validateRevisionReason('a'.repeat(501))
    expect(result.valid).toBe(false)
  })

  it('accepts a valid reason', () => {
    const result = validateRevisionReason('The student actionables are too vague to follow up on')
    expect(result.valid).toBe(true)
  })
})
