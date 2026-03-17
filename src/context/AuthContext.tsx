'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type Profile = {
 id: string
 email: string | null
 full_name: string | null
 role: 'student' | 'mentor' | 'admin' | null
}

type AuthContextType = {
 user: User | null
 profile: Profile | null
 loading: boolean
 signOut: () => Promise<void>
 supabase: any
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
 const [user, setUser] = useState<User | null>(null)
 const [profile, setProfile] = useState<Profile | null>(null)
 const [loading, setLoading] = useState(true)

 // useMemo to prevent recreating supabase client on every render
 const supabase = useMemo(() => createClient(), [])

 const fetchProfile = useCallback(async (userId: string) => {
 try {
 const { data, error } = await supabase
 .from('profiles')
 .select('*')
 .eq('id', userId)
 .single()

 if (error) {
 console.error('Error fetching profile:', error.message, error.code, error.details)
 } else {
 setProfile(data)
 }
 } catch (error) {
 console.error('Unexpected error fetching profile:', error)
 }
 }, [supabase])

 useEffect(() => {
 let isMounted = true

 const getUser = async () => {
 const { data: { session } } = await supabase.auth.getSession()

 if (isMounted && session?.user) {
 setUser(session.user)
 await fetchProfile(session.user.id)
 }

 if (isMounted) {
 setLoading(false)
 }

 const { data: { subscription } } = supabase.auth.onAuthStateChange(
 async (_event, session) => {
 if (!isMounted) return

 if (session?.user) {
 setUser(session.user)
 await fetchProfile(session.user.id)
 } else {
 setUser(null)
 setProfile(null)
 }
 setLoading(false)
 }
 )

 return () => {
 isMounted = false
 subscription.unsubscribe()
 }
 }

 getUser()
 }, [supabase, fetchProfile])

 const signOut = async () => {
 await supabase.auth.signOut()
 setUser(null)
 setProfile(null)
 }

 return (
 <AuthContext.Provider value={{ user, profile, loading, signOut, supabase }}>
 {children}
 </AuthContext.Provider>
 )
}

export const useAuth = () => {
 const context = useContext(AuthContext)
 if (context === undefined) {
 throw new Error('useAuth must be used within an AuthProvider')
 }
 return context
}
