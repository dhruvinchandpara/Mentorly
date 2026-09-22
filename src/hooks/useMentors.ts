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

type MentorProfileRow = {
  id: string
  bio: string | null
  expertise_tags: string[] | null
  hourly_rate: number | null
  is_active: boolean
  full_name: string | null
  email: string | null
}

export function useMentors(activeOnly = true) {
  const { supabase } = useAuth()

  return useQuery<Mentor[]>({
    queryKey: ['mentors', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, bio, expertise_tags, hourly_rate, is_active, full_name, email')
        .eq('role', 'mentor')

      if (activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching mentors:', error)
        throw error
      }

      return ((data as MentorProfileRow[]) || []).map((p) => ({
        id: p.id,
        bio: p.bio ?? '',
        expertise: p.expertise_tags ?? [],
        hourly_rate: p.hourly_rate ?? 0,
        is_active: p.is_active,
        profiles: { full_name: p.full_name ?? '', email: p.email ?? '' },
      }))
    },
    // Refetch every minute when window is focused (mentor list changes less frequently)
    refetchInterval: 60000,
    // Keep mentor data fresh for 1 minute
    staleTime: 60000,
  })
}
