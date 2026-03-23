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
 // For slot-based bookings, we need to check if ANY part of the requested time overlaps with existing bookings
 const { data: existingBookings, error: checkError } = await supabase
 .from('bookings')
 .select('id, start_time, end_time, duration_minutes')
 .eq('mentor_id', input.mentorId)
 .eq('status', 'scheduled')
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

 // 3. Initial booking record (without meeting link yet) - store in UTC
 const { data: newBooking, error: bookingErr } = await supabase
 .from('bookings')
 .insert({
 mentor_id: input.mentorId,
 student_id: input.studentId,
 start_time: startTimeUTC,
 end_time: endTimeUTC,
 duration_minutes: input.durationMinutes,
 slot_count: slotCount,
 status: 'scheduled',
 })
 .select('id')
 .single()

 if (bookingErr || !newBooking) {
 return {
 success: false,
 error: bookingErr?.message || 'Failed to create booking.',
 }
 }

 // 4. Get admin user ID and check if admin has connected their Google account
 let adminUserId: string
 try {
 adminUserId = await getAdminUserId()
 } catch (error) {
 console.error('--- Failed to get admin user ID ---', error)
 // Delete the booking since we can't create a meeting link
 await supabase.from('bookings').delete().eq('id', newBooking.id)
 return {
 success: false,
 error: 'Admin account not properly configured. Please contact support.',
 }
 }

 const googleConnected = await isGoogleConnected(adminUserId)
 if (!googleConnected) {
 console.error('--- Admin has not connected Google account ---')
 // Delete the booking since we can't create a meeting link
 await supabase.from('bookings').delete().eq('id', newBooking.id)
 return {
 success: false,
 error: 'Admin has not connected their Google account. Please contact the administrator to set up Google integration.',
 }
 }

 // 5. Fetch admin email for attendee list
 const { data: admin, error: adminErr } = await supabase
 .from('profiles')
 .select('full_name, email')
 .eq('id', adminUserId)
 .single()

 if (adminErr || !admin) {
 console.error('--- Failed to fetch admin details ---')
 await supabase.from('bookings').delete().eq('id', newBooking.id)
 return {
 success: false,
 error: 'Failed to fetch admin details.',
 }
 }

 // 6. Generate a Google Meet Link using admin's OAuth credentials
 console.log('--- Attempting Google Calendar Integration with OAuth (Admin as Organizer) ---')
 let calResult
 try {
 calResult = await createGoogleMeetingWithOAuth({
 userId: adminUserId, // Use admin's Google account as organizer
 title: `Mentorship: ${student.full_name} with ${mentor.full_name}`,
 description: `Mentorly session booked on ${new Date(startTimeUTC).toLocaleDateString()}.`,
 startTime: startTimeUTC, // Pass UTC time to Google Calendar
 endTime: endTimeUTC, // Google Calendar will handle timezone conversion
 attendees: [admin.email || '', mentor.email || '', student.email || ''].filter(Boolean), // Admin, mentor, and student
 })
 } catch (calErr: any) {
 console.error('\n--- GOOGLE CALENDAR API INTEGRATION FAILED ---')
 console.error('Error Message:', calErr.message)
 console.error('Error Stack:', calErr.stack)
 if (calErr.response?.data) {
 console.error('Google API Full Response Data:', JSON.stringify(calErr.response.data, null, 2))
 }
 console.error('----------------------------------------------\n')
 // Delete the booking since we couldn't create a meeting link
 await supabase.from('bookings').delete().eq('id', newBooking.id)

 // Provide specific error messages
 if (calErr.message.includes('authentication expired') || calErr.message.includes('not connected')) {
 return {
 success: false,
 error: 'Admin needs to reconnect their Google account. Please contact the administrator.',
 }
 }

 return {
 success: false,
 error: 'Failed to create Google Meet link. Please try again or contact support.',
 }
 }

 // Ensure we have a Google Meet link
 if (!calResult.meetLink) {
 console.error('--- Google Meet link was not generated ---')
 // Delete the booking since we couldn't create a meeting link
 await supabase.from('bookings').delete().eq('id', newBooking.id)
 return {
 success: false,
 error: 'Failed to generate Google Meet link. Please try again or contact support.',
 }
 }

 const meetingLink = calResult.meetLink
 const googleEventId = calResult.eventId
 console.log('--- Google OAuth Integration Successful ---')

 // 7. Update booking with the Meeting Link and Google Event ID
 const { error: updateErr } = await supabase
 .from('bookings')
 .update({
 meet_link: meetingLink,
 google_event_id: googleEventId
 })
 .eq('id', newBooking.id)

 if (updateErr) {
 console.error('Failed to update booking with meeting link:', updateErr)
 }

 return {
 success: true,
 bookingId: newBooking.id,
 meetLink: meetingLink,
 }
 } catch (error) {
 console.error('Booking Process Error:', error)
 return {
 success: false,
 error: error instanceof Error ? error.message : 'An unexpected error occurred.',
 }
 }
}
