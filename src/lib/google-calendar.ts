import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/calendar']

export async function createGoogleMeeting(params: {
 title: string
 description: string
 startTime: string
 endTime: string
 attendees: string[] // List of emails
 calendarId?: string // The Mentor's email
 fallbackLink?: string // Jitsi link to include in description
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

 // Detailed description including the fallback link
 const finalDescription = params.fallbackLink
 ? `${params.description}\n\nJoin Meeting: ${params.fallbackLink}`
 : params.description

 const baseEvent = {
 summary: params.title,
 description: finalDescription,
 location: params.fallbackLink || undefined,
 start: { dateTime: params.startTime },
 end: { dateTime: params.endTime },
 attendees: params.attendees.map(email => ({ email })),
 }

 const targetCalendarId = params.calendarId || 'primary'

 // Strategy 1 & 2: Try with Conference Data (Google Meet)
 const solutionKeys = [{ type: 'hangoutsMeet' }, { type: 'video' }]

 for (const solutionKey of solutionKeys) {
 console.log(`--- Google API: Attempting ${targetCalendarId} with ${solutionKey.type} ---`)
 try {
 const response = await calendar.events.insert({
 calendarId: targetCalendarId,
 requestBody: {
 ...baseEvent,
 conferenceData: {
 createRequest: {
 requestId: `mentorly-${Date.now()}-${Math.random().toString(36).substring(7)}`,
 conferenceSolutionKey: solutionKey,
 },
 },
 },
 conferenceDataVersion: 1,
 sendUpdates: params.calendarId ? 'all' : 'none',
 })

 const meetLink = response.data.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri
 console.log('--- Google API: Success ---')
 return {
 eventId: response.data.id,
 meetLink: meetLink || null, // ONLY return meetLink if it's a real conference link
 calendarLink: response.data.htmlLink
 }
 } catch (err: any) {
 console.warn(`--- Google API: Attempt with ${solutionKey.type} Failed: ${err.message} ---`)
 }
 }

 // Strategy 3: Try WITHOUT attendees (to avoid DWD error) but WITH conference data
 console.log('--- Google API: Attempt 3 - No Attendees, WITH Conference Data ---')
 try {
 const response = await calendar.events.insert({
 calendarId: 'primary',
 requestBody: {
 ...baseEvent,
 attendees: [],
 conferenceData: {
 createRequest: {
 requestId: `mentorly-${Date.now()}-noattendees`,
 conferenceSolutionKey: { type: 'hangoutsMeet' },
 },
 },
 },
 conferenceDataVersion: 1,
 })
 const meetLink = response.data.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri
 console.log('--- Google API: Success (No Attendees fallback) ---')
 return {
 eventId: response.data.id,
 meetLink: meetLink || null,
 calendarLink: response.data.htmlLink
 }
 } catch (err) {
 console.warn(`--- Google API: Attempt 3 Failed ---`)
 }

 // Strategy 4: Absolute fallback - Just a basic calendar event
 console.log('--- Google API: Attempt 4 - Absolute Minimal ---')
 const response = await calendar.events.insert({
 calendarId: 'primary',
 requestBody: { ...baseEvent, attendees: [] },
 sendUpdates: 'none',
 })
 console.log('--- Google API: Success (Absolute Minimal) ---')
 return {
 eventId: response.data.id,
 meetLink: null,
 calendarLink: response.data.htmlLink
 }

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
