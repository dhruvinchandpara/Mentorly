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
      // 1. Mark the booking as completed
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', bookingId)

      if (error) throw error

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
