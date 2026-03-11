import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    // Create a new client instance each time to avoid auth token sharing issues
    // The @supabase/ssr package handles caching internally
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            },
        }
    )
}

