'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { validateBookingForm, type DurationOption } from '@/lib/booking-validation'

export type BookingInput = {
 mentorId: string
 studentId: string
 startTime: string // ISO string in UTC
 endTime: string // ISO string in UTC
 durationMinutes: DurationOption
 slotCount?: number // Number of consecutive 15-min slots (defaults to durationMinutes / 15)
 preWorkReason: string
}

// Helper function to ensure times are in UTC/ISO format
function ensureUTC(dateString: string): string {
 const date = new Date(dateString)
 if (isNaN(date.getTime())) {
 throw new Error(`Invalid date format: ${dateString}`)
 }
 return date.toISOString()
}

export async function processBooking(input: BookingInput) {
 const validation = validateBookingForm({
 preWorkReason: input.preWorkReason,
 durationMinutes: input.durationMinutes,
 })
 if (!validation.valid) {
 return {
 success: false,
 error: validation.error,
 }
 }

 try {
 const supabase = createAdminClient()

 // Calculate slot count if not provided
 const slotCount = input.slotCount || Math.floor(input.durationMinutes / 15)

 // Ensure times are in proper UTC format
 const startTimeUTC = ensureUTC(input.startTime)
 const endTimeUTC = ensureUTC(input.endTime)

 // 1. Fetch Mentor and Student names/emails
 const { data: mentor, error: mentorErr } = await supabase
 .from('profiles')
 .select('full_name, email')
 .eq('id', input.mentorId)
 .single()

 const { data: student, error: studentErr } = await supabase
 .from('profiles')
 .select('full_name, email')
 .eq('id', input.studentId)
 .single()

 if (mentorErr || studentErr || !mentor || !student) {
 return {
 success: false,
 error: 'Failed to fetch participant details.',
 }
 }

 // 2. Check for duplicate/overlapping bookings (using UTC times)
 // Check if ANY part of the requested time overlaps with existing scheduled or requested bookings
 const { data: existingBookings, error: checkError } = await supabase
 .from('sessions')
 .select('id, start_time, end_time, duration_minutes')
 .eq('mentor_id', input.mentorId)
 .in('status', ['scheduled', 'requested'])
 .gte('end_time', startTimeUTC)
 .lte('start_time', endTimeUTC)

 if (checkError) {
 return {
 success: false,
 error: 'Failed to check availability.',
 }
 }

 if (existingBookings && existingBookings.length > 0) {
 return {
 success: false,
 error: 'This time slot is no longer available. Please select a different time.',
 }
 }

 // 3. Create session record in primary table (no fallback to legacy bookings)
 const requestedDate = new Date(startTimeUTC).toISOString().split('T')[0]
 const requestedStartTime = new Date(startTimeUTC).toISOString().split('T')[1].substring(0, 8)

 const { data: sessionRes, error: sessionInsertErr } = await supabase
  .from('sessions')
  .insert({
   mentor_id: input.mentorId,
   student_id: input.studentId,
   requested_date: requestedDate,
   requested_start_time: requestedStartTime,
   start_time: startTimeUTC,
   end_time: endTimeUTC,
   duration_minutes: input.durationMinutes,
   slot_count: slotCount,
   pre_work_reason: input.preWorkReason,
   status: 'requested',
  })
  .select('id')
  .single()

 if (sessionInsertErr || !sessionRes) {
 return {
 success: false,
 error: sessionInsertErr?.message || 'Failed to create booking. Please try again.',
 }
 }

 return {
 success: true,
 bookingId: sessionRes.id,
 status: 'requested',
 }
 } catch (error) {
 console.error('Booking Process Error:', error)
 return {
 success: false,
 error: error instanceof Error ? error.message : 'An unexpected error occurred.',
 }
 }
}
