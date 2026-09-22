// Supabase Edge Function: send-session-reminders
//
// Invoked on a schedule (see the commented pg_cron block in
// supabase/session_reminders.sql) or manually for testing:
//   supabase functions invoke send-session-reminders
//
// Queries public.get_stale_session_reminders() for sessions that have
// crossed their staleness threshold and haven't been reminded within the
// repeat interval, sends one email per stale session via Resend, stamps
// sessions.last_reminder_sent_at on success, and writes a row to
// public.session_reminder_log for a durable, queryable audit trail.
//
// Required secrets (supabase secrets set ...):
//   RESEND_API_KEY       - Resend API key
//   REMINDER_FROM_EMAIL  - "from" address, must be on a domain verified in Resend
//   APP_URL              - base URL used to build the links in the email body
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by
// the Edge Functions runtime.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const REMINDER_FROM_EMAIL = Deno.env.get('REMINDER_FROM_EMAIL')!;
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:3000';

type ReminderType = 'requested_pending_admin' | 'awaiting_post_review' | 'revise_pending_mentor';

type StaleReminder = {
  session_id: string;
  reminder_type: ReminderType;
  recipient_role: 'admin' | 'mentor';
  mentor_id: string;
  mentor_name: string;
  mentor_email: string;
  student_name: string;
  stale_since: string;
};

const REMINDER_COPY: Record<
  ReminderType,
  (r: StaleReminder) => { subject: string; body: string; link: string }
> = {
  requested_pending_admin: (r) => ({
    subject: `Action needed: session request from ${r.student_name} is waiting`,
    body: `${r.student_name}'s session request with ${r.mentor_name} has been waiting for approval since ${new Date(r.stale_since).toLocaleString()}.`,
    link: `${APP_URL}/dashboard/admin/approvals`,
  }),
  awaiting_post_review: (r) => ({
    subject: `Action needed: post-session report from ${r.mentor_name} is waiting for review`,
    body: `${r.mentor_name}'s post-session report for the session with ${r.student_name} has been waiting for review since ${new Date(r.stale_since).toLocaleString()}.`,
    link: `${APP_URL}/dashboard/admin/approvals`,
  }),
  revise_pending_mentor: (r) => ({
    subject: `Action needed: a session report needs your revision`,
    body: `Your post-session report for the session with ${r.student_name} was sent back for revision on ${new Date(r.stale_since).toLocaleString()} and hasn't been resubmitted yet.`,
    link: `${APP_URL}/dashboard/mentor/sessions`,
  }),
};

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: stale, error: rpcError } = await supabase.rpc('get_stale_session_reminders');
  if (rpcError) {
    console.error('[session-reminders] get_stale_session_reminders failed', rpcError);
    return new Response(JSON.stringify({ error: rpcError.message }), { status: 500 });
  }

  const rows = (stale ?? []) as StaleReminder[];
  if (rows.length === 0) {
    console.log('[session-reminders] checked=0 sent=0');
    return new Response(JSON.stringify({ checked: 0, sent: 0, failed: [] }), { status: 200 });
  }

  let adminEmails: string[] = [];
  if (rows.some((r) => r.recipient_role === 'admin')) {
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'admin');
    if (adminError) {
      console.error('[session-reminders] failed to load admin emails', adminError);
    } else {
      adminEmails = (admins ?? []).map((a: { email: string }) => a.email).filter(Boolean);
    }
  }

  const sent: string[] = [];
  const failed: { session_id: string; error: string }[] = [];

  for (const row of rows) {
    const to = row.recipient_role === 'admin' ? adminEmails : [row.mentor_email];
    if (to.length === 0) {
      failed.push({ session_id: row.session_id, error: 'no recipient email available' });
      continue;
    }

    const { subject, body, link } = REMINDER_COPY[row.reminder_type](row);

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: REMINDER_FROM_EMAIL,
          to,
          subject,
          html: `<p>${body}</p><p><a href="${link}">Open Mentorly</a></p>`,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Resend responded ${res.status}: ${text}`);
      }

      const sentAt = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('sessions')
        .update({ last_reminder_sent_at: sentAt })
        .eq('id', row.session_id);
      if (updateError) throw updateError;

      const { error: logError } = await supabase.from('session_reminder_log').insert({
        session_id: row.session_id,
        reminder_type: row.reminder_type,
        recipient_role: row.recipient_role,
        recipient_emails: to,
        sent_at: sentAt,
      });
      if (logError) console.error('[session-reminders] failed to write audit log', logError);

      sent.push(row.session_id);
    } catch (err) {
      failed.push({
        session_id: row.session_id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  console.log(
    `[session-reminders] checked=${rows.length} sent=${sent.length} failed=${failed.length}`,
    { sent, failed }
  );

  return new Response(JSON.stringify({ checked: rows.length, sent: sent.length, failed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
