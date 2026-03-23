import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disconnectGoogleAccount } from '@/lib/google-oauth'

// POST /api/auth/google/disconnect
// Disconnects the user's Google account
export async function POST(request: NextRequest) {
  try {
    // Get the current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Disconnect Google account
    await disconnectGoogleAccount(user.id)

    console.log('--- Google OAuth: Successfully disconnected Google account ---')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disconnecting Google account:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Google account' },
      { status: 500 }
    )
  }
}
