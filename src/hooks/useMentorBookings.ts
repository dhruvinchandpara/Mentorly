import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { lockSessionNote } from '@/app/dashboard/admin/actions'

export interface MentorBooking {
  id: string
  student_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rejected'
  meet_link: string | null
  profiles: { full_name: string; email?: string }
  session_notes?: Array<{
    content: string | null
    is_locked: boolean
    last_edited_by: string | null
    last_edited_at: string | null
    editor_profile?: { full_name: string } | null
  }> | null
}

export function useMentorBookings() {
  const { supabase, profile } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery<MentorBooking[]>({
    queryKey: ['mentor-bookings', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      // Try fetching from new unified sessions table first
      const { data: sessionData, error: sessionErr } = await supabase
        .from('sessions')
        .select(`
          id, student_id, mentor_id, requested_date, requested_start_time, duration_minutes, actual_duration_minutes,
          status, meet_link, rejection_reason, pre_work_reason, student_actionables, key_insights,
          student:profiles!bookings_student_id_fkey(full_name, email)
        `)
        .eq('mentor_id', profile.id)
        .order('requested_date', { ascending: true })

      if (!sessionErr && sessionData) {
        return sessionData.map((s: any) => {
          const startTime = s.requested_date && s.requested_start_time
            ? new Date(`${s.requested_date}T${s.requested_start_time}Z`).toISOString()
            : new Date().toISOString()
          const endTime = new Date(new Date(startTime).getTime() + (s.duration_minutes || 60) * 60000).toISOString()
          const studentName = s.student?.full_name || 'Student'
          const studentEmail = s.student?.email || ''

          return {
            id: s.id,
            student_id: s.student_id,
            start_time: startTime,
            end_time: endTime,
            duration_minutes: s.duration_minutes,
            status: s.status === 'requested' ? 'pending' : s.status,
            meet_link: s.meet_link,
            profiles: { full_name: studentName, email: studentEmail },
            session_notes: s.student_actionables ? [{
              content: s.student_actionables,
              is_locked: true,
              last_edited_by: s.mentor_id,
              last_edited_at: null,
              editor_profile: { full_name: profile.full_name || 'Mentor' }
            }] : []
          } as MentorBooking
        })
      }

      // Fallback: Legacy bookings table
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, student_id, start_time, end_time, duration_minutes, status, meet_link,
          profiles!bookings_student_id_fkey(full_name, email),
          session_notes(content, is_locked, last_edited_by, last_edited_at, editor_profile:profiles!session_notes_last_edited_by_fkey(full_name))
        `)
        .eq('mentor_id', profile.id)
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Error fetching mentor bookings:', error)
        throw error
      }

      return data || []
    },
    enabled: !!profile?.id,
    // Refetch every 30 seconds
    refetchInterval: 30000,
  })

  const markCompleteMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      // 1. Mark the session as completed in sessions (or bookings view)
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'completed' })
        .eq('id', bookingId)

      if (error) {
        // Fallback to bookings
        await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId)
      }

      // 2. Lock the session note so it can't be edited further
      await lockSessionNote(bookingId)
    },
    onSuccess: () => {
      // Invalidate and refetch bookings
      queryClient.invalidateQueries({ queryKey: ['mentor-bookings', profile?.id] })
    },
  })

  return {
    ...query,
    markComplete: markCompleteMutation.mutate,
    isMarkingComplete: markCompleteMutation.isPending,
  }
}
