export const DURATION_OPTIONS = [15, 30, 45, 60] as const
export type DurationOption = (typeof DURATION_OPTIONS)[number]

export function isValidDuration(value: number): value is DurationOption {
  return (DURATION_OPTIONS as readonly number[]).includes(value)
}

export type BookingFormValidation = { valid: true } | { valid: false; error: string }

export function validateBookingForm(input: {
  preWorkReason: string
  durationMinutes: number
}): BookingFormValidation {
  if (!input.preWorkReason.trim()) {
    return { valid: false, error: 'Please tell us why you need this session' }
  }
  if (input.preWorkReason.length > 500) {
    return { valid: false, error: 'Reason must be 500 characters or less' }
  }
  if (!isValidDuration(input.durationMinutes)) {
    return { valid: false, error: 'Please select a valid session duration (15, 30, 45, or 60 minutes)' }
  }
  return { valid: true }
}

export function validateRejectionReason(reason: string): BookingFormValidation {
  if (!reason.trim()) {
    return { valid: false, error: 'A rejection reason is required' }
  }
  if (reason.length > 500) {
    return { valid: false, error: 'Reason must be 500 characters or less' }
  }
  return { valid: true }
}

export function validatePostSessionForm(input: {
  keyInsights: string
  studentActionables: string
  actualDurationMinutes: number
  adminFeedbackNote?: string
}): BookingFormValidation {
  if (!input.keyInsights.trim()) {
    return { valid: false, error: 'Key insights are required' }
  }
  if (input.keyInsights.length > 2000) {
    return { valid: false, error: 'Key insights must be 2000 characters or less' }
  }
  if (!input.studentActionables.trim()) {
    return { valid: false, error: 'Student actionables are required' }
  }
  if (input.studentActionables.length > 2000) {
    return { valid: false, error: 'Student actionables must be 2000 characters or less' }
  }
  if (!Number.isFinite(input.actualDurationMinutes) || input.actualDurationMinutes <= 0) {
    return { valid: false, error: 'Duration must be a positive number of minutes' }
  }
  if (input.actualDurationMinutes % 15 !== 0) {
    return { valid: false, error: 'Duration must be in 15-minute increments' }
  }
  if (input.adminFeedbackNote && input.adminFeedbackNote.length > 1000) {
    return { valid: false, error: 'Admin note must be 1000 characters or less' }
  }
  return { valid: true }
}

export function validateRevisionReason(reason: string): BookingFormValidation {
  if (!reason.trim()) {
    return { valid: false, error: 'A revision reason is required' }
  }
  if (reason.length > 500) {
    return { valid: false, error: 'Reason must be 500 characters or less' }
  }
  return { valid: true }
}
