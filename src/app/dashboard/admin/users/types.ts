import type { UserRole } from '../user-constants'

/** A real profiles row — the user has signed in at least once. */
export type ProfileRow = {
  kind: 'profile'
  id: string
  full_name: string | null
  email: string | null
  role: UserRole
  is_authorized: boolean
  bio: string | null
  background: string | null
  hourly_rate: number | null
  expertise_tags: string[] | null
  is_active: boolean
  permissions: string[] | null
  created_at: string
}

/**
 * A pending invite of any role — on the `authorized_users` allowlist but
 * with no `profiles` row yet, because they haven't signed in with Google.
 */
export type InviteRow = {
  kind: 'invite'
  id: null
  full_name: string | null
  email: string
  role: UserRole
  is_authorized: true
  bio: string | null
  background: string | null
  hourly_rate: number | null
  expertise_tags: string[] | null
  is_active: boolean
  permissions: string[] | null
  created_at: string
}

export type UserRow = ProfileRow | InviteRow
