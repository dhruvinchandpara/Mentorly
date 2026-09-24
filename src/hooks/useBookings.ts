import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'

export interface SessionNote {
  content: string | null
  is_locked: boolean
  last_edited_by: string | null
  last_edited_at: string | null
  editor_profile?: { full_name: string } | null
}

export interface Booking {
  id: string
  mentor_id: string
  student_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  slot_count?: number
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rejected'
  rejection_reason?: string | null
  meet_link: string | null
  actual_duration_minutes?: number | null
  key_insights?: string | null
  student_actionables?: string | null
  mentors: {
    profiles: { full_name: string }
    expertise?: string[]
  }
  session_notes?: SessionNote[] | null
}

export function useBookings(status?: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rejected') {
  const { supabase, user } = useAuth()

  return useQuery<Booking[]>({
    queryKey: ['bookings', user?.id, status],
    queryFn: async () => {
      if (!user?.id) return []

      // Try fetching from new unified sessions table first
      const { data: sessionData, error: sessionErr } = await supabase
        .from('sessions')
        .select(`
          id, mentor_id, student_id, requested_date, requested_start_time, duration_minutes, actual_duration_minutes,
          status, rejection_reason, meet_link, pre_work_reason, student_actionables, key_insights,
          mentor:profiles!sessions_mentor_id_fkey(full_name, expertise_tags)
        `)
        .eq('student_id', user.id)
        .order('requested_date', { ascending: false })

      if (!sessionErr && sessionData) {
        let list = sessionData.map((s: any) => {
          const startTime = s.requested_date && s.requested_start_time
            ? new Date(`${s.requested_date}T${s.requested_start_time}Z`).toISOString()
            : new Date().toISOString()
          const endTime = new Date(new Date(startTime).getTime() + (s.duration_minutes || 60) * 60000).toISOString()
          const mentorName = s.mentor?.full_name || 'Mentor'
          
          return {
            id: s.id,
            mentor_id: s.mentor_id,
            student_id: s.student_id,
            start_time: startTime,
            end_time: endTime,
            duration_minutes: s.duration_minutes,
            status: s.status === 'requested' ? 'pending' : s.status,
            rejection_reason: s.rejection_reason,
            meet_link: s.meet_link,
            actual_duration_minutes: s.actual_duration_minutes,
            pre_work_reason: s.pre_work_reason,
            student_actionables: s.student_actionables,
            key_insights: s.key_insights,
            mentors: {
              profiles: { full_name: mentorName },
              expertise: s.mentor?.expertise_tags || [],
            },
            session_notes: s.student_actionables ? [{
              content: s.student_actionables,
              is_locked: true,
              last_edited_by: s.mentor_id,
              last_edited_at: null,
              editor_profile: { full_name: mentorName }
            }] : []
          } as Booking
        })

        if (status) {
          list = list.filter((b: Booking) => b.status === status)
        }
        return list
      }

      // Fallback: Legacy bookings table
      let query = supabase
        .from('bookings')
        .select(`
          id, mentor_id, student_id, start_time, end_time, duration_minutes, slot_count, status, rejection_reason, meet_link,
          mentors!inner(profiles!inner(full_name), expertise),
          session_notes(content, is_locked, last_edited_by, last_edited_at, editor_profile:profiles!session_notes_last_edited_by_fkey(full_name))
        `)
        .eq('student_id', user.id)
        .order('start_time', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching bookings:', error)
        throw error
      }

      return data || []
    },
    enabled: !!user?.id,
    // Refetch every 30 seconds when window is focused
    refetchInterval: 30000,
  })
}
