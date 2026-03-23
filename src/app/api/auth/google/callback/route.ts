import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, saveUserTokens } from '@/lib/google-oauth'

// GET /api/auth/google/callback
// Handles the OAuth callback from Google
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state') // This is the user ID
  const error = searchParams.get('error')

  // Handle user denial or error
  if (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/dashboard/mentor?google_error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard/mentor?google_error=missing_params', request.url)
    )
  }

  try {
    // Exchange the authorization code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Save tokens to database
    await saveUserTokens(state, tokens)

    console.log('--- Google OAuth: Successfully connected Google account ---')

    // Redirect back to the mentor dashboard with success message
    return NextResponse.redirect(
      new URL('/dashboard/mentor?google_connected=true', request.url)
    )
  } catch (err) {
    console.error('Error exchanging code for tokens:', err)
    return NextResponse.redirect(
      new URL('/dashboard/mentor?google_error=token_exchange_failed', request.url)
    )
  }
}
