import { google } from 'googleapis'
import { getAuthenticatedClient } from './google-oauth'

export async function createGoogleMeetingWithOAuth(params: {
  userId: string // The user's ID (admin) who owns the Google account and will be the organizer
  title: string
  description: string
  startTime: string
  endTime: string
  attendees: string[] // List of emails (should include admin, mentor, and student)
}) {
  try {
    console.log('--- Google OAuth API: Initializing authenticated client ---')
    console.log('--- User ID:', params.userId)

    // Get the authenticated OAuth2 client for this user
    const auth = await getAuthenticatedClient(params.userId)
    console.log('--- Auth client created successfully ---')

    const calendar = google.calendar({ version: 'v3', auth })

    const requestId = `mentorly-${Date.now()}-${Math.random().toString(36).substring(7)}`

    console.log('--- Google OAuth API: Creating calendar event with Google Meet ---')
    console.log('--- Attempting with multiple conference type strategies ---')

    let response
    let attemptNumber = 0

    // Attempt 1: The most reliable method for both free Gmail and Workspace accounts.
    // We let Google auto-detect the best conference type (hangoutsMeet) by NOT specifying conferenceSolutionKey
    try {
      attemptNumber = 1
      console.log('--- Attempt 1: Auto-detect conference type ---')

      const baseEvent = {
        summary: params.title,
        description: params.description,
        start: { dateTime: params.startTime },
        end: { dateTime: params.endTime },
        attendees: params.attendees.map(email => ({ email })),
        guestsCanModify: false,
        guestsCanInviteOthers: true,
        guestsCanSeeOtherGuests: true,
        conferenceData: {
          createRequest: {
            requestId: requestId + '-attempt1',
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }

      response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: baseEvent,
        conferenceDataVersion: 1,
        sendUpdates: 'all',
      })

      // Check if it successfully added a Meet link
      const hasLink = response.data.hangoutLink || response.data.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri

      // If no link, try strategy 2 by patching the existing event
      if (!hasLink && response.data.id) {
        console.log('--- Attempt 1 created event but missing Meet link. Attempt 2: Patching event with explicit hangoutsMeet ---')
        response = await calendar.events.patch({
          calendarId: 'primary',
          eventId: response.data.id,
          requestBody: {
            conferenceData: {
              createRequest: {
                requestId: requestId + '-attempt2',
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            },
          },
          conferenceDataVersion: 1,
        })
      }
      console.log('--- Event created and conference strategy executed ---')

    } catch (err: any) {
      console.error('--- Calendar Event Creation failed:', err.message)
      throw new Error(`Unable to create Google Calendar event. Error: ${err.message}`)
    }

    console.log('--- Calendar API Response received ---')
    console.log('--- Response data:', JSON.stringify({
      id: response.data.id,
      htmlLink: response.data.htmlLink,
      hasConferenceData: !!response.data.conferenceData,
      conferenceData: response.data.conferenceData
    }, null, 2))

    // Extract the Google Meet link
    // Extract the Google Meet link from conferenceData or hangoutLink (common for free accounts)
    let meetLink = response?.data?.hangoutLink || response?.data?.conferenceData?.entryPoints?.find(
      (ep: any) => ep.entryPointType === 'video'
    )?.uri

    if (!meetLink) {
      console.warn('--- WARNING: No Meet link in API response ---')
      throw new Error('Google Calendar event was created, but Google did not attach a Meet link. Please ensure Google Meet is available for your account.')
    }

    console.log('--- Google OAuth API: Success - Meet link ready:', meetLink)

    return {
      eventId: response.data.id,
      meetLink: meetLink,
      calendarLink: response.data.htmlLink,
    }
  } catch (error: any) {
    console.error('--- Google OAuth API: FAILED ---')
    console.error('--- Error message:', error.message)
    console.error('--- Error stack:', error.stack)
    console.error('--- Full error:', JSON.stringify(error, null, 2))

    // Provide helpful error messages
    if (error.message.includes('invalid_grant')) {
      throw new Error('Google authentication expired. Please reconnect your Google account.')
    }

    if (error.message.includes('not connected')) {
      throw new Error('Google account not connected. Please connect your Google account first.')
    }

    throw new Error(`Failed to create Google Meet: ${error.message}`)
  }
}
