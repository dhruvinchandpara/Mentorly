import { google } from 'googleapis'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
]

export async function createGoogleMeeting(params: {
 title: string
 description: string
 startTime: string
 endTime: string
 attendees: string[] // List of emails
 calendarId?: string // The Mentor's email
}) {
 let clientEmail = process.env.GOOGLE_CLIENT_EMAIL
 let privateKey = process.env.GOOGLE_PRIVATE_KEY

 // Helper to clean env vars
 const cleanVar = (v: string | undefined) => {
 if (!v) return v
 let cleaned = v.trim()
 if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
 cleaned = cleaned.substring(1, cleaned.length - 1)
 }
 return cleaned.replace(/\\n/g, '\n')
 }

 clientEmail = cleanVar(clientEmail)
 privateKey = cleanVar(privateKey)

 if (!clientEmail || !privateKey) {
 throw new Error(`Google Calendar credentials missing. email: ${!!clientEmail}, key: ${!!privateKey}`)
 }

 try {
 console.log('--- Google API: Initializing JWT Auth ---')
 const auth = new google.auth.JWT({
 email: clientEmail,
 key: privateKey,
 scopes: SCOPES,
 })

 const calendar = google.calendar({ version: 'v3', auth })

 const baseEvent = {
 summary: params.title,
 description: params.description,
 start: { dateTime: params.startTime },
 end: { dateTime: params.endTime },
 attendees: params.attendees.map(email => ({ email })),
 }

 // Get the service account email to use as the calendar ID
 const serviceAccountEmail = clientEmail

 // Strategy 1: Create event on service account's calendar without attendees first
 console.log('--- Google API: Strategy 1 - Create on service account calendar ---')
 try {
 const response = await calendar.events.insert({
 calendarId: serviceAccountEmail,
 requestBody: {
 ...baseEvent,
 attendees: [], // Don't add attendees in initial creation to avoid DWD error
 conferenceData: {
 createRequest: {
 requestId: `mentorly-${Date.now()}-${Math.random().toString(36).substring(7)}`,
 conferenceSolutionKey: { type: 'hangoutsMeet' },
 },
 },
 },
 conferenceDataVersion: 1,
 sendUpdates: 'none',
 })

 const meetLink = response.data.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri

 if (meetLink && response.data.id) {
 console.log('--- Google API: Event created with Meet link ---')

 // Now update the event to add attendees (if any)
 if (baseEvent.attendees.length > 0) {
 try {
 console.log('--- Google API: Adding attendees to event ---')
 await calendar.events.patch({
 calendarId: serviceAccountEmail,
 eventId: response.data.id,
 requestBody: {
 attendees: baseEvent.attendees,
 },
 sendUpdates: 'all',
 })
 console.log('--- Google API: Attendees added successfully ---')
 } catch (patchErr: any) {
 console.warn(`--- Google API: Could not add attendees: ${patchErr.message} ---`)
 // Continue anyway - we have the Meet link
 }
 }

 console.log('--- Google API: Success - Meet link generated ---')
 return {
 eventId: response.data.id,
 meetLink: meetLink,
 calendarLink: response.data.htmlLink
 }
 }
 console.warn('--- Google API: Event created but no Meet link in response ---')
 } catch (err: any) {
 console.warn(`--- Google API: Strategy 1 Failed: ${err.message} ---`)
 }

 // Strategy 2: Try on primary calendar
 console.log('--- Google API: Strategy 2 - Try primary calendar ---')
 try {
 const response = await calendar.events.insert({
 calendarId: 'primary',
 requestBody: {
 ...baseEvent,
 attendees: [],
 conferenceData: {
 createRequest: {
 requestId: `mentorly-${Date.now()}-v2`,
 conferenceSolutionKey: { type: 'hangoutsMeet' },
 },
 },
 },
 conferenceDataVersion: 1,
 })
 const meetLink = response.data.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri

 if (meetLink && response.data.id) {
 // Add attendees if needed
 if (baseEvent.attendees.length > 0) {
 try {
 await calendar.events.patch({
 calendarId: 'primary',
 eventId: response.data.id,
 requestBody: { attendees: baseEvent.attendees },
 sendUpdates: 'all',
 })
 } catch (patchErr) {
 console.warn('Could not add attendees, but Meet link created')
 }
 }

 console.log('--- Google API: Success - Meet link generated ---')
 return {
 eventId: response.data.id,
 meetLink: meetLink,
 calendarLink: response.data.htmlLink
 }
 }
 } catch (err: any) {
 console.warn(`--- Google API: Strategy 2 Failed: ${err.message} ---`)
 }

 // If we reach here, we couldn't create a Google Meet link
 throw new Error('Failed to create Google Meet link. Service accounts may not have permission to create Google Meet conferences. Consider using OAuth2 with a regular Google Workspace account or enabling domain-wide delegation.')

 } catch (error: any) {
 console.error('--- Google API: CRITICAL FAILURE ---')
 let errorMessage = error.message || 'Unknown error'
 if (error.response?.data?.error?.message) {
 errorMessage = error.response.data.error.message
 }
 console.error('Final Error:', errorMessage)
 throw new Error(errorMessage)
 }
}
