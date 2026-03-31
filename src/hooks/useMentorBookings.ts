import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'

interface MentorBooking {
  id: string
  student_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: 'scheduled' | 'completed' | 'cancelled'
  meet_link: string | null
  profiles: { full_name: string }
}

export function useMentorBookings() {
  const { supabase, profile } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery<MentorBooking[]>({
    queryKey: ['mentor-bookings', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, student_id, start_time, end_time, duration_minutes, status, meet_link,
          profiles!bookings_student_id_fkey(full_name)
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
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId)

      if (error) throw error
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
