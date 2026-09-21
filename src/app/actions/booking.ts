'use server'

import { createAdminClient, getAdminUserId } from '@/lib/supabase/admin'
import { createGoogleMeetingWithOAuth } from '@/lib/google-calendar-oauth'
import { isGoogleConnected } from '@/lib/google-oauth'
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
 // Check if ANY part of the requested time overlaps with existing scheduled or pending bookings
 const { data: existingBookings, error: checkError } = await supabase
 .from('bookings')
 .select('id, start_time, end_time, duration_minutes')
 .eq('mentor_id', input.mentorId)
 .in('status', ['scheduled', 'pending'])
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

 // 3. Create session/booking record
 const requestedDate = new Date(startTimeUTC).toISOString().split('T')[0]
 const requestedStartTime = new Date(startTimeUTC).toISOString().split('T')[1].substring(0, 8)
 const preWorkReason = input.preWorkReason

 let newBooking: any = null
 let bookingErr: any = null

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
   pre_work_reason: preWorkReason,
   status: 'requested',
  })
  .select('id')
  .single()

 if (!sessionInsertErr && sessionRes) {
  newBooking = sessionRes
 } else {
  const { data: bRes, error: bErr } = await supabase
   .from('bookings')
   .insert({
    mentor_id: input.mentorId,
    student_id: input.studentId,
    start_time: startTimeUTC,
    end_time: endTimeUTC,
    duration_minutes: input.durationMinutes,
    slot_count: slotCount,
    status: 'pending',
   })
   .select('id')
   .single()
  newBooking = bRes
  bookingErr = bErr
 }

 if (bookingErr || !newBooking) {
 return {
 success: false,
 error: bookingErr?.message || 'Failed to create booking.',
 }
 }

 return {
 success: true,
 bookingId: newBooking.id,
 status: 'pending',
 }
 } catch (error) {
 console.error('Booking Process Error:', error)
 return {
 success: false,
 error: error instanceof Error ? error.message : 'An unexpected error occurred.',
 }
 }
}
