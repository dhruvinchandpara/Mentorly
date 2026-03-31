import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'

export interface Booking {
  id: string
  mentor_id: string
  student_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  slot_count?: number
  status: 'scheduled' | 'completed' | 'cancelled'
  meet_link: string | null
  mentors: {
    profiles: { full_name: string }
    expertise?: string[]
  }
}

export function useBookings(status?: 'scheduled' | 'completed' | 'cancelled') {
  const { supabase, user } = useAuth()

  return useQuery<Booking[]>({
    queryKey: ['bookings', user?.id, status],
    queryFn: async () => {
      if (!user?.id) return []

      let query = supabase
        .from('bookings')
        .select(`
          id, mentor_id, student_id, start_time, end_time, duration_minutes, slot_count, status, meet_link,
          mentors!inner(profiles!inner(full_name), expertise)
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
