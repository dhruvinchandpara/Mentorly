'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createGoogleMeeting } from '@/lib/google-calendar'

export type BookingInput = {
    mentorId: string
    studentId: string
    startTime: string // ISO string
    endTime: string // ISO string
    durationMinutes: number
}

export async function processBooking(input: BookingInput) {
    try {
        const supabase = createAdminClient()

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

        // 2. Initial booking record (without meeting link yet)
        const { data: newBooking, error: bookingErr } = await supabase
            .from('bookings')
            .insert({
                mentor_id: input.mentorId,
                student_id: input.studentId,
                start_time: input.startTime,
                end_time: input.endTime,
                duration_minutes: input.durationMinutes,
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

        // 3. Generate a Meeting Link (Jitsi is our reliable fallback)
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
                description: `Mentorly session booked on ${new Date(input.startTime).toLocaleDateString()}.`,
                startTime: input.startTime,
                endTime: input.endTime,
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

        // 4. Update booking with the Meeting Link and Google Event ID
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
