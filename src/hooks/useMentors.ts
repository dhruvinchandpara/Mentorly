import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'

interface Mentor {
  id: string
  bio: string
  expertise: string[]
  hourly_rate: number
  is_active: boolean
  profiles: {
    full_name: string
    email: string
  }
}

export function useMentors(activeOnly = true) {
  const { supabase } = useAuth()

  return useQuery<Mentor[]>({
    queryKey: ['mentors', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('mentors')
        .select(`
          id,
          bio,
          expertise,
          hourly_rate,
          is_active,
          profiles!inner (
            full_name,
            email
          )
        `)

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching mentors:', error)
        throw error
      }

      return data || []
    },
    // Refetch every minute when window is focused (mentor list changes less frequently)
    refetchInterval: 60000,
    // Keep mentor data fresh for 1 minute
    staleTime: 60000,
  })
}
