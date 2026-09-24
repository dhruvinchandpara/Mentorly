'use server'

import { createAdminClient, getAdminUserId } from '@/lib/supabase/admin'
import { createGoogleMeetingWithOAuth } from '@/lib/google-calendar-oauth'
import { isGoogleConnected } from '@/lib/google-oauth'
import { validateRejectionReason, validateRevisionReason } from '@/lib/booking-validation'
import type { UserRole } from './user-constants'

export type InviteInput = {
 role: UserRole
 fullName: string
 email: string
 bio: string
 background: string
 hourlyRate: number | null
 expertiseTags: string[]
 isActive: boolean
 permissions: string[]
}

export type UpdateUserInput = {
 userId: string
 role: UserRole
 fullName: string
 email: string
 isAuthorized: boolean
 bio: string
 background: string
 hourlyRate: number | null
 expertiseTags: string[]
 isActive: boolean
 permissions: string[]
}

/**
 * Invites a new user of any role — the only way anyone gets an account now.
 * This just writes a row to `authorized_users` (role + whatever
 * role-specific fields were entered); no auth.users account exists yet and
 * no password is involved. The person signs in with Google themselves
 * whenever they like, and the `handle_new_user()` trigger reads this row
 * to create their `profiles` row with the right role and fields already
 * filled in.
 */
export async function createInvite(input: InviteInput) {
 try {
 const supabase = createAdminClient()
 const email = input.email.trim().toLowerCase()

 const { error } = await supabase.from('authorized_users').upsert(
 {
 email,
 role: input.role,
 full_name: input.fullName.trim() || null,
 bio: input.bio,
 background: input.background,
 hourly_rate: input.hourlyRate,
 expertise_tags: input.expertiseTags,
 is_active: input.isActive,
 permissions: input.permissions,
 },
 { onConflict: 'email' }
 )

 if (error) {
 return { success: false, error: error.message }
 }

 return { success: true }
 } catch (error) {
 console.error('Create invite error:', error)
 return {
 success: false,
 error:
 error instanceof Error
 ? error.message
 : 'An unexpected error occurred',
 }
 }
}

/**
 * Updates a real, already-signed-in user's profile. Doesn't touch
 * `authorized_users` except to keep a student's allowlist membership (the
 * thing that actually gated their original signup) in sync with the
 * admin-facing "Authorized to sign in" flag.
 */
export async function updateUser(input: UpdateUserInput) {
 try {
 const supabase = createAdminClient()
 const email = input.email.trim().toLowerCase()

 const { data: existing, error: fetchError } = await supabase
 .from('profiles')
 .select('email')
 .eq('id', input.userId)
 .single()

 if (fetchError || !existing) {
 return { success: false, error: 'User not found.' }
 }

 if (existing.email !== email) {
 const { error: authError } = await supabase.auth.admin.updateUserById(
 input.userId,
 { email }
 )
 if (authError) {
 return {
 success: false,
 error: `Failed to update login email: ${authError.message}`,
 }
 }
 }

 const profileUpdate: Record<string, unknown> = {
 full_name: input.fullName,
 email,
 }

 if (input.role === 'student') {
 // Keep the allowlist that actually gated signup in sync with the
 // admin-facing is_authorized flag, using whichever email is current.
 if (existing.email !== email) {
 await supabase.from('authorized_users').delete().eq('email', existing.email)
 }
 profileUpdate.is_authorized = input.isAuthorized
 if (input.isAuthorized) {
 await supabase
 .from('authorized_users')
 .upsert({ email, role: 'student' }, { onConflict: 'email' })
 } else {
 await supabase.from('authorized_users').delete().eq('email', email)
 }
 }

 if (input.role === 'mentor') {
 profileUpdate.bio = input.bio
 profileUpdate.background = input.background
 profileUpdate.hourly_rate = input.hourlyRate
 profileUpdate.expertise_tags = input.expertiseTags
 profileUpdate.is_active = input.isActive
 }

 if (input.role === 'admin') {
 profileUpdate.permissions = input.permissions
 }

 const { error } = await supabase
 .from('profiles')
 .update(profileUpdate)
 .eq('id', input.userId)

 if (error) {
 return { success: false, error: error.message }
 }

 return { success: true }
 } catch (error) {
 console.error('Update user error:', error)
 return {
 success: false,
 error:
 error instanceof Error
 ? error.message
 : 'An unexpected error occurred',
 }
 }
}

export type UpdateInviteInput = {
 currentEmail: string
 role: UserRole
 fullName: string
 email: string
 isAuthorized: boolean
 bio: string
 background: string
 hourlyRate: number | null
 expertiseTags: string[]
 isActive: boolean
 permissions: string[]
}

/**
 * Edits a pending invite — someone on `authorized_users` who hasn't signed
 * in with Google yet, so there's no `profiles` row for them. For students,
 * turning `isAuthorized` off removes the invite outright (matches the
 * "Authorized to sign in" toggle's existing meaning); there's no
 * mentor/admin equivalent toggle, so those use `cancelInvite` instead.
 */
export async function updateInvite(input: UpdateInviteInput) {
 try {
 const supabase = createAdminClient()
 const email = input.email.trim().toLowerCase()
 const currentEmail = input.currentEmail.trim().toLowerCase()

 if (input.role === 'student' && !input.isAuthorized) {
 const { error } = await supabase
 .from('authorized_users')
 .delete()
 .eq('email', currentEmail)
 if (error) {
 return { success: false, error: error.message }
 }
 return { success: true }
 }

 if (email !== currentEmail) {
 await supabase.from('authorized_users').delete().eq('email', currentEmail)
 }

 const { error } = await supabase.from('authorized_users').upsert(
 {
 email,
 role: input.role,
 full_name: input.fullName.trim() || null,
 bio: input.bio,
 background: input.background,
 hourly_rate: input.hourlyRate,
 expertise_tags: input.expertiseTags,
 is_active: input.isActive,
 permissions: input.permissions,
 },
 { onConflict: 'email' }
 )

 if (error) {
 return { success: false, error: error.message }
 }

 return { success: true }
 } catch (error) {
 console.error('Update invite error:', error)
 return {
 success: false,
 error:
 error instanceof Error
 ? error.message
 : 'An unexpected error occurred',
 }
 }
}

/** Cancels a not-yet-accepted invite — removes the `authorized_users` row. */
export async function cancelInvite(email: string) {
 try {
 const supabase = createAdminClient()
 const { error } = await supabase
 .from('authorized_users')
 .delete()
 .eq('email', email.trim().toLowerCase())

 if (error) {
 return { success: false, error: error.message }
 }

 return { success: true }
 } catch (error) {
 console.error('Cancel invite error:', error)
 return {
 success: false,
 error:
 error instanceof Error
 ? error.message
 : 'An unexpected error occurred',
 }
 }
}

export type BulkImportMentorInput = {
 fullName: string
 email: string
 bio?: string
 background?: string
 expertise?: string[]
 hourlyRate?: number
}

export type BulkImportResult = {
 success: boolean
 totalProcessed: number
 successCount: number
 failureCount: number
 errors: { row: number; email: string; error: string }[]
}

/** Bulk-invites mentors from a CSV — same invite-only path as a single Add. */
export async function bulkImportMentors(
 mentors: BulkImportMentorInput[]
): Promise<BulkImportResult> {
 const supabase = createAdminClient()
 const result: BulkImportResult = {
 success: true,
 totalProcessed: mentors.length,
 successCount: 0,
 failureCount: 0,
 errors: [],
 }

 for (let i = 0; i < mentors.length; i++) {
 const mentor = mentors[i]

 try {
 if (!mentor.email || !mentor.fullName) {
 result.errors.push({
 row: i + 1,
 email: mentor.email || 'N/A',
 error: 'Missing required fields (email or full name)',
 })
 result.failureCount++
 continue
 }

 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 if (!emailRegex.test(mentor.email)) {
 result.errors.push({
 row: i + 1,
 email: mentor.email,
 error: 'Invalid email format',
 })
 result.failureCount++
 continue
 }

 const { data: existingUser } = await supabase
 .from('profiles')
 .select('id')
 .eq('email', mentor.email.toLowerCase().trim())
 .single()

 if (existingUser) {
 result.errors.push({
 row: i + 1,
 email: mentor.email,
 error: 'User with this email already exists',
 })
 result.failureCount++
 continue
 }

 const mentorResult = await createInvite({
 role: 'mentor',
 fullName: mentor.fullName.trim(),
 email: mentor.email.toLowerCase().trim(),
 bio: mentor.bio || '',
 background: mentor.background || '',
 expertiseTags: mentor.expertise || [],
 hourlyRate: mentor.hourlyRate || null,
 isActive: true,
 permissions: [],
 })

 if (mentorResult.success) {
 result.successCount++
 } else {
 result.errors.push({
 row: i + 1,
 email: mentor.email,
 error: mentorResult.error || 'Unknown error',
 })
 result.failureCount++
 }
 } catch (error) {
 result.errors.push({
 row: i + 1,
 email: mentor.email || 'N/A',
 error: error instanceof Error ? error.message : 'Unexpected error',
 })
 result.failureCount++
 }
 }

 result.success = result.failureCount === 0

 return result
}

export async function bulkAddAuthorizedStudents(emails: string[]) {
 try {
 const supabase = createAdminClient()

 const cleanedEmails = emails
 .map((email) => email.toLowerCase().trim())
 .filter((email) => {
 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 return email && emailRegex.test(email)
 })

 if (cleanedEmails.length === 0) {
 return {
 success: false,
 error: 'No valid email addresses found',
 }
 }

 const uniqueEmails = Array.from(new Set(cleanedEmails))

 const { data: existingEmails } = await supabase
 .from('authorized_users')
 .select('email')
 .in('email', uniqueEmails)

 const existingSet = new Set(
 (existingEmails || []).map((record) => record.email)
 )

 const newEmails = uniqueEmails.filter((email) => !existingSet.has(email))

 if (newEmails.length === 0) {
 return {
 success: true,
 added: 0,
 skipped: uniqueEmails.length,
 message: 'All emails were already authorized',
 }
 }

 const { error } = await supabase
 .from('authorized_users')
 .insert(newEmails.map((email) => ({ email, role: 'student' })))

 if (error) {
 return { success: false, error: error.message }
 }

 return {
 success: true,
 added: newEmails.length,
 skipped: uniqueEmails.length - newEmails.length,
 message: `Successfully added ${newEmails.length} student(s). ${uniqueEmails.length - newEmails.length > 0 ? `${uniqueEmails.length - newEmails.length} already existed.` : ''}`,
 }
 } catch (error) {
 console.error('Bulk add authorized students error:', error)
 return {
 success: false,
 error:
 error instanceof Error
 ? error.message
 : 'An unexpected error occurred',
 }
 }
}

export async function grantAdminRole(email: string) {
 try {
 const supabase = createAdminClient()

 // 1. Find the profile by email
 const { data: profile, error: fetchError } = await supabase
 .from('profiles')
 .select('id, email, full_name')
 .eq('email', email)
 .single()

 if (fetchError || !profile) {
 return {
 success: false,
 error: `User with email ${email} not found. Ensure they have signed up first.`,
 }
 }

 // 2. Update the role to 'admin'
 const { error: updateError } = await supabase
 .from('profiles')
 .update({ role: 'admin' })
 .eq('id', profile.id)

 if (updateError) {
 return { success: false, error: updateError.message }
 }

 // 3. Update auth metadata as well
 const { error: authError } = await supabase.auth.admin.updateUserById(
 profile.id,
 { user_metadata: { role: 'admin' } }
 )

 if (authError) {
 console.warn('Auth metadata update failed:', authError.message)
 }

 return { success: true, message: `Successfully promoted ${profile.full_name || email} to Admin.` }
 } catch (error) {
 console.error('Grant admin role error:', error)
 return {
 success: false,
 error: error instanceof Error ? error.message : 'An unexpected error occurred',
 }
 }
}

export async function approveBooking(bookingId: string) {
  try {
    const supabase = createAdminClient()

    // 1. Fetch booking record
    const { data: booking, error: fetchErr } = await supabase
      .from('sessions')
      .select('id, mentor_id, student_id, requested_date, requested_start_time, start_time, end_time, status, duration_minutes')
      .eq('id', bookingId)
      .single()

    if (fetchErr || !booking) {
      return { success: false, error: 'Booking not found.' }
    }

    if (booking.status !== 'pending' && booking.status !== 'requested') {
      return { success: false, error: `Booking is already ${booking.status}.` }
    }

    // 2. Fetch mentor & student details
    const { data: mentor, error: mentorErr } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', booking.mentor_id)
      .single()

    const { data: student, error: studentErr } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', booking.student_id)
      .single()

    if (mentorErr || studentErr || !mentor || !student) {
      return { success: false, error: 'Failed to fetch participant details.' }
    }

    // 3. Get admin user ID & check Google account connection
    let adminUserId: string
    try {
      adminUserId = await getAdminUserId()
    } catch (error) {
      return { success: false, error: 'Admin account not properly configured.' }
    }

    const googleConnected = await isGoogleConnected(adminUserId)
    if (!googleConnected) {
      return {
        success: false,
        error: 'Admin has not connected their Google account for meeting creation.',
      }
    }

    const { data: admin } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', adminUserId)
      .single()

    // 4. Generate Google Meet link via OAuth
    let calResult
    try {
      calResult = await createGoogleMeetingWithOAuth({
        userId: adminUserId,
        title: `Mentorship: ${student.full_name} with ${mentor.full_name}`,
        description: `Mentorly approved session on ${new Date(booking.start_time).toLocaleDateString()}.`,
        startTime: booking.start_time,
        endTime: booking.end_time,
        attendees: [admin?.email || '', mentor.email || '', student.email || ''].filter(Boolean),
      })
    } catch (calErr: any) {
      console.error('Google Calendar OAuth generation failed during approval:', calErr)
      return {
        success: false,
        error: calErr?.message || 'Failed to create Google Meet link. Please check Google OAuth connection.',
      }
    }

    if (!calResult || !calResult.meetLink) {
      return { success: false, error: 'Google Meet link was not generated.' }
    }

    // 5. Update booking to status 'scheduled' with meet_link & google_event_id
    let updateErr: any = null
    const { error: sessUpdateErr } = await supabase
      .from('sessions')
      .update({ status: 'scheduled', meet_link: calResult.meetLink, google_event_id: calResult.eventId })
      .eq('id', bookingId)
    if (sessUpdateErr) {
      const { error: bookUpdateErr } = await supabase
        .from('bookings')
        .update({ status: 'scheduled', meet_link: calResult.meetLink, google_event_id: calResult.eventId })
        .eq('id', bookingId)
      updateErr = bookUpdateErr
    }

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    return { success: true, meetLink: calResult.meetLink }
  } catch (error) {
    console.error('Approve booking error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    }
  }
}

export async function rejectBooking(bookingId: string, reason: string) {
  const validation = validateRejectionReason(reason)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  try {
    const supabase = createAdminClient()

    const { error: sessErr } = await supabase
      .from('sessions')
      .update({ status: 'rejected', rejection_reason: reason.trim() })
      .eq('id', bookingId)

    if (sessErr) {
      return { success: false, error: sessErr.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Reject booking error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    }
  }
}

// ── Session Notes ────────────────────────────────────────────────────────────

/**
 * Upserts the shared post-meeting note for a booking.
 * Only the mentor or student of the booking can call this.
 * The note is rejected if already locked or 24h have passed since session start.
 */
export async function saveSessionNote(
  bookingId: string,
  content: string,
  editorId: string
) {
  try {
    const supabase = createAdminClient()

    // Verify booking exists and editor is the mentor
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, mentor_id, student_id, start_time, status')
      .eq('id', bookingId)
      .single()

    if (bookingErr || !booking) {
      return { success: false, error: 'Booking not found.' }
    }

    const isMentor = booking.mentor_id === editorId
    if (!isMentor) {
      return { success: false, error: 'Only the mentor can edit session notes.' }
    }

    // Check for 24h time-based lock (no cron needed)
    const sessionStart = new Date(booking.start_time)
    const twentyFourHoursAfterStart = new Date(sessionStart.getTime() + 24 * 60 * 60 * 1000)
    const isTimeExpired = new Date() > twentyFourHoursAfterStart

    // Check if already explicitly locked in DB
    const { data: existingNote } = await supabase
      .from('session_notes')
      .select('is_locked')
      .eq('booking_id', bookingId)
      .maybeSingle()

    if (existingNote?.is_locked || isTimeExpired) {
      return { success: false, error: 'This note is locked and can no longer be edited.' }
    }

    // Upsert the note (creates or updates)
    const { error: upsertErr } = await supabase
      .from('session_notes')
      .upsert(
        {
          booking_id: bookingId,
          content: content.trim(),
          last_edited_by: editorId,
          last_edited_at: new Date().toISOString(),
          is_locked: false,
        },
        { onConflict: 'booking_id' }
      )

    if (upsertErr) {
      return { success: false, error: upsertErr.message }
    }

    return { success: true }
  } catch (error) {
    console.error('saveSessionNote error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error.',
    }
  }
}

/**
 * Permanently locks a session note.
 * Called when the mentor marks the session as completed.
 */
export async function lockSessionNote(bookingId: string) {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('session_notes')
      .upsert(
        { booking_id: bookingId, is_locked: true },
        { onConflict: 'booking_id' }
      )

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('lockSessionNote error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error.',
    }
  }
}

// ── Post-Session Review ──────────────────────────────────────────────────────

export async function approvePostSession(sessionId: string) {
  try {
    const supabase = createAdminClient()

    const { data: session, error: fetchErr } = await supabase
      .from('sessions')
      .select('id, status')
      .eq('id', sessionId)
      .single()

    if (fetchErr || !session) {
      return { success: false, error: 'Session not found.' }
    }

    if (session.status !== 'awaiting_post_review') {
      return {
        success: false,
        error: `Session is not awaiting post-session review (current status: ${session.status}).`,
      }
    }

    const { error: updateErr } = await supabase
      .from('sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    return { success: true }
  } catch (error) {
    console.error('approvePostSession error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    }
  }
}

/**
 * Sends a submitted post-session report back to the mentor for revision.
 * Only inserts into session_revisions — the on_session_revision_created trigger
 * (reset_reminder_on_revision()) is what flips sessions.status to 'revise' and
 * resets revision_requested_at/last_reminder_sent_at. Do not set status here.
 */
export async function sendSessionForRevision(sessionId: string, reason: string, adminId: string) {
  const validation = validateRevisionReason(reason)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  try {
    const supabase = createAdminClient()

    const { data: session, error: fetchErr } = await supabase
      .from('sessions')
      .select('id, status')
      .eq('id', sessionId)
      .single()

    if (fetchErr || !session) {
      return { success: false, error: 'Session not found.' }
    }

    if (session.status !== 'awaiting_post_review') {
      return {
        success: false,
        error: `Session is not awaiting post-session review (current status: ${session.status}).`,
      }
    }

    const { error: insertErr } = await supabase.from('session_revisions').insert({
      session_id: sessionId,
      reason: reason.trim(),
      requested_by_admin_id: adminId,
    })

    if (insertErr) {
      return { success: false, error: insertErr.message }
    }

    return { success: true }
  } catch (error) {
    console.error('sendSessionForRevision error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.',
    }
  }
}
