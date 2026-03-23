import { google } from 'googleapis'
import { createAdminClient } from './supabase/admin'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
]

// Get OAuth2 client configuration
export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Please set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env.local')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

// Generate the OAuth2 authorization URL
export function getAuthorizationUrl(userId: string) {
  const oauth2Client = getOAuth2Client()

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: SCOPES,
    state: userId, // Pass user ID to identify who is authenticating
    prompt: 'consent', // Force consent screen to get refresh token
  })

  return url
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

// Save tokens to database
export async function saveUserTokens(userId: string, tokens: any) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token,
      google_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      google_connected: true,
    })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to save Google tokens: ${error.message}`)
  }
}

// Get user tokens from database
export async function getUserTokens(userId: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expiry, google_connected')
    .eq('id', userId)
    .single()

  if (error || !data) {
    throw new Error('Failed to retrieve Google tokens')
  }

  if (!data.google_connected || !data.google_refresh_token) {
    throw new Error('Google account not connected')
  }

  return {
    access_token: data.google_access_token,
    refresh_token: data.google_refresh_token,
    expiry_date: data.google_token_expiry ? new Date(data.google_token_expiry).getTime() : null,
  }
}

// Get an authenticated OAuth2 client for a user
export async function getAuthenticatedClient(userId: string) {
  const oauth2Client = getOAuth2Client()
  const tokens = await getUserTokens(userId)

  oauth2Client.setCredentials(tokens)

  // Refresh token if needed
  oauth2Client.on('tokens', async (newTokens) => {
    console.log('--- Google OAuth: Tokens refreshed ---')
    if (newTokens.refresh_token) {
      await saveUserTokens(userId, {
        ...tokens,
        ...newTokens,
      })
    } else {
      // Only update access token and expiry
      await saveUserTokens(userId, {
        access_token: newTokens.access_token,
        refresh_token: tokens.refresh_token, // Keep existing refresh token
        expiry_date: newTokens.expiry_date,
      })
    }
  })

  return oauth2Client
}

// Disconnect Google account
export async function disconnectGoogleAccount(userId: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      google_access_token: null,
      google_refresh_token: null,
      google_token_expiry: null,
      google_connected: false,
    })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to disconnect Google account: ${error.message}`)
  }
}

// Check if user has connected Google account
export async function isGoogleConnected(userId: string): Promise<boolean> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('google_connected')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return false
  }

  return data.google_connected || false
}
