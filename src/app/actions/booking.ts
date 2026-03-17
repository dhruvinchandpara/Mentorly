'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createGoogleMeeting } from '@/lib/google-calendar'

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

 // 4. Generate a Meeting Link (Jitsi is our reliable fallback)
 // Config params: disable lobby so no moderator is needed, anyone with the link can join
 const jitsiRoomName = `Mentorly-${newBooking.id.substring(0, 8)}-${Date.now().toString().slice(-4)}`
 const jitsiConfig = [
 'config.prejoinConfig.enabled=false',
 'config.lobbyModeEnabled=false',
 'config.startWithAudioMuted=true',
 'config.startWithVideoMuted=false',
 ].join('&')
 const jitsiLink = `https://meet.jit.si/${jitsiRoomName}#${jitsiConfig}`
 let meetingLink = jitsiLink
 let googleEventId = null

 try {
 console.log('--- Attempting Google Calendar Integration ---')
 const calResult = await createGoogleMeeting({
 title: `Mentorship: ${student.full_name} with ${mentor.full_name}`,
 description: `Mentorly session booked on ${new Date(startTimeUTC).toLocaleDateString()}.`,
 startTime: startTimeUTC, // Pass UTC time to Google Calendar
 endTime: endTimeUTC, // Google Calendar will handle timezone conversion
 attendees: [mentor.email || '', student.email || ''].filter(Boolean),
 calendarId: mentor.email || undefined,
 fallbackLink: jitsiLink // This will be in the description
 })

 // Only use Google Meet if it's explicitly generated
 if (calResult.meetLink) {
 meetingLink = calResult.meetLink
 }
 googleEventId = calResult.eventId
 console.log('--- Google Integration Successful ---')
 } catch (calErr: any) {
 console.warn('--- Google Integration Failed, using Jitsi ---', calErr.message)
 // meetingLink is already set to jitsiLink
 }

 // 5. Update booking with the Meeting Link and Google Event ID
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
