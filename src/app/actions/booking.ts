'use server'

import { createAdminClient, getAdminUserId } from '@/lib/supabase/admin'
import { createGoogleMeetingWithOAuth } from '@/lib/google-calendar-oauth'
import { isGoogleConnected } from '@/lib/google-oauth'

export type BookingInput = {
 mentorId: string
 studentId: string
 startTime: string // ISO string in UTC
 endTime: string // ISO string in UTC
 durationMinutes: number // Must be multiple of 15 (15, 30, 45, 60, etc.)
 slotCount?: number // Number of consecutive 15-min slots (defaults to durationMinutes / 15)
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
 try {
 const supabase = createAdminClient()

 // Validate duration is in 15-minute increments
 if (input.durationMinutes % 15 !== 0 || input.durationMinutes < 15) {
 return {
 success: false,
 error: 'Booking duration must be in 15-minute increments (15, 30, 45, 60, etc.)',
 }
 }

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

 // 3. Create booking record with status 'pending' (awaiting admin approval)
 const { data: newBooking, error: bookingErr } = await supabase
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
