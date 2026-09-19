'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

import { TEST_EMAILS } from '@/lib/test-accounts'

export async function switchRole(newRole: 'admin' | 'mentor' | 'student') {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user || !user.email) {
    return { success: false, error: 'Not authenticated' }
  }
  
  // Verify user is a test user
  if (!TEST_EMAILS.includes(user.email)) {
    return { success: false, error: 'Unauthorized to switch roles' }
  }

  const adminClient = createAdminClient()
  const userId = user.id

  try {
    // 1. Ensure related profile records exist to prevent UI crashes
    if (newRole === 'mentor') {
      const { error: mentorError } = await adminClient
        .from('mentors')
        .upsert({ 
          id: userId, 
          bio: 'Test Mentor Bio', 
          expertise: ['Testing'],
          hourly_rate: 0,
          is_active: true
        }, { onConflict: 'id' })
      if (mentorError) throw mentorError
    }

    if (newRole === 'student') {
      const { error: studentError } = await adminClient
        .from('students')
        .upsert({ 
          id: userId, 
          bio: 'Test Student Bio' 
        }, { onConflict: 'id' })
      if (studentError) throw studentError
    }

    // 2. Update the role in profiles table with consolidated fields
    const profileUpdates: any = { role: newRole }
    if (newRole === 'student') {
      profileUpdates.is_authorized = true
    } else if (newRole === 'mentor') {
      profileUpdates.is_active = true
      profileUpdates.hourly_rate = 0
    }

    const { error: roleError } = await adminClient
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId)

    if (roleError) throw roleError

    // 3. Clear cache to reflect new layout
    revalidatePath('/', 'layout')
    
    return { success: true }
  } catch (error: any) {
    console.error('Error switching role:', error)
    return { success: false, error: error.message || 'Failed to switch role' }
  }
}
