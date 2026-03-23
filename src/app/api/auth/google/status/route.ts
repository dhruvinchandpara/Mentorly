import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isGoogleConnected } from '@/lib/google-oauth'

// GET /api/auth/google/status
// Returns the Google connection status for the current user
export async function GET(request: NextRequest) {
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

    // Check if Google account is connected
    const connected = await isGoogleConnected(user.id)

    return NextResponse.json({ connected })
  } catch (error) {
    console.error('Error checking Google status:', error)
    return NextResponse.json(
      { error: 'Failed to check Google status' },
      { status: 500 }
    )
  }
}
