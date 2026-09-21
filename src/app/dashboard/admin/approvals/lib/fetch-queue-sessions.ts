export type SessionInfo = {
  id: string;
  studentId: string;
  mentorId: string;
  studentName: string;
  mentorName: string;
  startTime: string;
  endTime: string;
  duration: number;
  actualDurationMinutes: number | null;
  status: string;
  rejectionReason: string | null;
  meetLink: string | null;
  preWorkReason: string;
  keyInsights: string | null;
  studentActionables: string | null;
  adminFeedbackNote: string | null;
  postSessionSubmittedAt: string | null;
};

export type PriorSessionInfo = {
  keyInsights: string | null;
  studentActionables: string | null;
  status: string;
  postSessionSubmittedAt: string;
} | null;

const SESSION_SELECT = `
  id, student_id, mentor_id,
  requested_date, requested_start_time, start_time, end_time,
  duration_minutes, actual_duration_minutes, status, rejection_reason, meet_link,
  pre_work_reason, student_actionables, key_insights, admin_feedback_note, post_session_submitted_at,
  student_profiles:profiles!bookings_student_id_fkey(full_name),
  mentor_profiles:profiles!sessions_mentor_id_fkey(full_name)
`;

export function mapSessionRow(row: any): SessionInfo {
  const startTime =
    row.start_time ||
    (row.requested_date
      ? new Date(
          row.requested_date + 'T' + (row.requested_start_time || '00:00:00') + 'Z'
        ).toISOString()
      : new Date().toISOString());

  const studentName =
    row.student_profiles &&
    typeof row.student_profiles === 'object' &&
    'full_name' in row.student_profiles
      ? String(row.student_profiles.full_name || 'Unknown')
      : 'Unknown';

  const mentorName =
    row.mentor_profiles &&
    typeof row.mentor_profiles === 'object' &&
    'full_name' in row.mentor_profiles
      ? String(row.mentor_profiles.full_name || 'Unknown')
      : 'Unknown';

  return {
    id: row.id || '',
    studentId: row.student_id || '',
    mentorId: row.mentor_id || '',
    studentName,
    mentorName,
    startTime,
    endTime: row.end_time || new Date().toISOString(),
    duration: typeof row.duration_minutes === 'number' ? row.duration_minutes : 60,
    actualDurationMinutes:
      typeof row.actual_duration_minutes === 'number' ? row.actual_duration_minutes : null,
    status: row.status || 'scheduled',
    rejectionReason: row.rejection_reason || null,
    meetLink: row.meet_link || null,
    preWorkReason: row.pre_work_reason || '',
    keyInsights: row.key_insights || null,
    studentActionables: row.student_actionables || null,
    adminFeedbackNote: row.admin_feedback_note || null,
    postSessionSubmittedAt: row.post_session_submitted_at || null,
  };
}

export async function fetchSessionsByStatus(
  supabase: any,
  statuses: string[]
): Promise<SessionInfo[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT)
    .in('status', statuses)
    .order('requested_date', { ascending: false });

  if (error || !data) return [];
  return data.map(mapSessionRow);
}

export async function fetchSessionsWithPostSessionReport(supabase: any): Promise<SessionInfo[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_SELECT)
    .not('post_session_submitted_at', 'is', null)
    .order('post_session_submitted_at', { ascending: false });

  if (error || !data) return [];
  return data.map(mapSessionRow);
}

export function pickPriorSession(
  candidates: SessionInfo[],
  studentId: string,
  mentorId: string,
  excludeSessionId: string
): PriorSessionInfo {
  const match = candidates
    .filter(
      (s) =>
        s.studentId === studentId &&
        s.mentorId === mentorId &&
        s.id !== excludeSessionId &&
        !!s.postSessionSubmittedAt
    )
    .sort(
      (a, b) =>
        new Date(b.postSessionSubmittedAt as string).getTime() -
        new Date(a.postSessionSubmittedAt as string).getTime()
    )[0];

  if (!match) return null;

  return {
    keyInsights: match.keyInsights,
    studentActionables: match.studentActionables,
    status: match.status,
    postSessionSubmittedAt: match.postSessionSubmittedAt as string,
  };
}
