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
