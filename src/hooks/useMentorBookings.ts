import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'

export interface MentorBooking {
  id: string
  student_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: 'requested' | 'scheduled' | 'awaiting_post_review' | 'revise' | 'completed' | 'rejected'
  meet_link: string | null
  profiles: { full_name: string; email?: string }
}

export function useMentorBookings() {
  const { supabase, profile } = useAuth()

  const query = useQuery<MentorBooking[]>({
    queryKey: ['mentor-bookings', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      const { data: sessionData, error: sessionErr } = await supabase
        .from('sessions')
        .select(`
          id, student_id, requested_date, requested_start_time, start_time, end_time,
          duration_minutes, status, meet_link,
          student:profiles!bookings_student_id_fkey(full_name, email)
        `)
        .eq('mentor_id', profile.id)
        .order('requested_date', { ascending: true })

      if (sessionErr) {
        console.error('Error fetching mentor bookings:', sessionErr)
        throw sessionErr
      }

      return (sessionData || []).map((s: any) => {
        const startTime = s.start_time || (
          s.requested_date && s.requested_start_time
            ? new Date(`${s.requested_date}T${s.requested_start_time}Z`).toISOString()
            : new Date().toISOString()
        )
        const endTime = s.end_time || new Date(new Date(startTime).getTime() + (s.duration_minutes || 60) * 60000).toISOString()

        return {
          id: s.id,
          student_id: s.student_id,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: s.duration_minutes,
          status: s.status,
          meet_link: s.meet_link,
          profiles: { full_name: s.student?.full_name || 'Student', email: s.student?.email || '' },
        } as MentorBooking
      })
    },
    enabled: !!profile?.id,
    // Refetch every 30 seconds
    refetchInterval: 30000,
  })

  return query
}
