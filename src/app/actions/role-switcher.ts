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
    // Update the role and role-specific defaults directly on profiles.
    const profileUpdates: any = { role: newRole }
    if (newRole === 'student') {
      profileUpdates.is_authorized = true
    } else if (newRole === 'mentor') {
      profileUpdates.bio = 'Test Mentor Bio'
      profileUpdates.expertise_tags = ['Testing']
      profileUpdates.is_active = true
      profileUpdates.hourly_rate = 0
    }

    const { error: roleError } = await adminClient
      .from('profiles')
      .update(profileUpdates)
      .eq('id', userId)

    if (roleError) throw roleError

    // Clear cache to reflect new layout
    revalidatePath('/', 'layout')
    
    return { success: true }
  } catch (error: any) {
    console.error('Error switching role:', error)
    return { success: false, error: error.message || 'Failed to switch role' }
  }
}
