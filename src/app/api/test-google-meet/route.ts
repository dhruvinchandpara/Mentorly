import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isGoogleConnected } from '@/lib/google-oauth'
import { createGoogleMeetingWithOAuth } from '@/lib/google-calendar-oauth'

// GET /api/test-google-meet
// Test endpoint to verify Google Meet creation
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    // Check if connected
    const connected = await isGoogleConnected(user.id)

    if (!connected) {
      return NextResponse.json({
        success: false,
        error: 'Google account not connected',
        connected: false,
      })
    }

    // Try to create a test meeting
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)

      const endTime = new Date(tomorrow)
      endTime.setHours(11, 0, 0, 0)

      const result = await createGoogleMeetingWithOAuth({
        userId: user.id,
        title: 'Test Meeting - Mentorly',
        description: 'This is a test meeting to verify Google Meet integration',
        startTime: tomorrow.toISOString(),
        endTime: endTime.toISOString(),
        attendees: [user.email || 'test@example.com'],
      })

      return NextResponse.json({
        success: true,
        connected: true,
        meetLink: result.meetLink,
        eventId: result.eventId,
        calendarLink: result.calendarLink,
      })
    } catch (meetError: any) {
      return NextResponse.json({
        success: false,
        connected: true,
        error: meetError.message,
        errorDetails: meetError.toString(),
      })
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      errorDetails: error.toString(),
    }, { status: 500 })
  }
}
