import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
 const { searchParams } = new URL(request.url)
 const code = searchParams.get('code')
 const next = searchParams.get('next') ?? '/'
 const error = searchParams.get('error')
 const errorDescription = searchParams.get('error_description')

 // If there's an OAuth error parameter, redirect to error page with description
 if (error || errorDescription) {
   const errorUrl = new URL('/auth/auth-code-error', request.url)
   errorUrl.searchParams.set('error_description', errorDescription || error || 'Authentication failed')
   return NextResponse.redirect(errorUrl)
 }

 if (code) {
   const supabase = await createClient()
   const { error } = await supabase.auth.exchangeCodeForSession(code)
   if (!error) {
     return NextResponse.redirect(new URL(next, request.url))
   } else {
     // Add error details to redirect using relative URL resolution
     const errorUrl = new URL('/auth/auth-code-error', request.url)
     errorUrl.searchParams.set('error_description', error.message)
     return NextResponse.redirect(errorUrl)
   }
 }

 // fallback error if no code
 const fallbackUrl = new URL('/auth/auth-code-error', request.url)
 fallbackUrl.searchParams.set('error_description', 'No authentication code provided.')
 return NextResponse.redirect(fallbackUrl)
}
