import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
 const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
 const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

 if (!serviceRoleKey) {
 throw new Error(
 'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your .env.local file.'
 )
 }

 return createClient(supabaseUrl, serviceRoleKey, {
 auth: {
 autoRefreshToken: false,
 persistSession: false,
 },
 })
}

/**
 * Get the admin user ID from the ADMIN_EMAIL environment variable
 * @returns The admin user ID
 * @throws Error if ADMIN_EMAIL is not set or admin user not found
 */
export async function getAdminUserId(): Promise<string> {
 const adminEmail = process.env.ADMIN_EMAIL

 if (!adminEmail) {
 throw new Error('ADMIN_EMAIL is not set in environment variables.')
 }

 const supabase = createAdminClient()

 const { data: adminProfile, error } = await supabase
 .from('profiles')
 .select('id')
 .eq('email', adminEmail)
 .eq('role', 'admin')
 .single()

 if (error || !adminProfile) {
 throw new Error(
 `Admin user with email ${adminEmail} not found. Please ensure the admin account exists and has the 'admin' role.`
 )
 }

 return adminProfile.id
}
