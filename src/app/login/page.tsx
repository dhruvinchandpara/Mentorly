'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { CheckCircle, Loader2, Mail, Lock, ArrowRight, User } from 'lucide-react'

export default function LoginPage() {
 const [email, setEmail] = useState('')
 const [password, setPassword] = useState('')
 const [fullName, setFullName] = useState('')
 const [isSignUp, setIsSignUp] = useState(false)
 const [loading, setLoading] = useState(false)
 const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
 const [role, setRole] = useState<'student' | 'mentor' | 'admin'>('mentor')

 const router = useRouter()
 const { supabase } = useAuth()

 const handleAuth = async (e: React.FormEvent) => {
 e.preventDefault()
 setLoading(true)
 setMessage(null)

 try {
 if (isSignUp) {
 const { error } = await supabase.auth.signUp({
 email,
 password,
 options: {
 emailRedirectTo: `${location.origin}/auth/callback`,
 data: {
 full_name: fullName,
 role: role,
 },
 },
 })
 if (error) throw error
 setMessage({ type: 'success', text: 'Check your email for the confirmation link!' })
 } else {
 const { error } = await supabase.auth.signInWithPassword({
 email,
 password,
 })
 if (error) throw error
 router.push('/dashboard')
 }
 } catch (error: any) {
 console.error('Login error full object:', error)
 const errorMsg = error.message || 'An unexpected error occurred';
 const errorCode = error.code ? ` (${error.code})` : '';
 setMessage({ type: 'error', text: `${errorMsg}${errorCode}` })
 } finally {
 setLoading(false)
 }
 }

 const handleGoogleLogin = async () => {
 setLoading(true)
 setMessage(null)
 try {
 const { error } = await supabase.auth.signInWithOAuth({
 provider: 'google',
 options: {
 queryParams: {
 access_type: 'offline',
 prompt: 'consent',
 },
 redirectTo: `${location.origin}/auth/callback?next=/dashboard`,
 data: {
 role: 'student', // Google OAuth users are always students
 },
 },
 })
 if (error) throw error
 } catch (error: any) {
 setMessage({ type: 'error', text: error.message })
 setLoading(false)
 }
 }

 return (
 <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
 <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-200 ">
 <div className="p-8">
 <div className="text-center mb-8">
 <h1 className="text-3xl font-bold text-blue-950 mb-2">
 {isSignUp ? 'Mentor Registration' : 'Welcome Back'}
 </h1>
 <p className="text-blue-700 ">
 {isSignUp ? 'Apply to join our mentor network' : 'Sign in to access your dashboard'}
 </p>
 </div>

 {message && (
 <div className={`p-4 mb-6 rounded-lg flex items-start gap-3 text-sm ${message.type === 'success'
 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 '
 : 'bg-red-50 text-red-700 border border-red-200 '
 }`}>
 {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <Loader2 className="w-5 h-5 shrink-0" />}
 <span>{message.text}</span>
 </div>
 )}

 <form onSubmit={handleAuth} className="space-y-4">
 {isSignUp && (
 <div className="space-y-1">
 <label className="text-sm font-medium text-blue-800 ">Full Name</label>
 <div className="relative">
 <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input
 type="text"
 required
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 className="w-full pl-10 pr-4 py-2 rounded-lg border border-blue-300 bg-white text-blue-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
 placeholder="John Doe"
 />
 </div>
 </div>
 )}

 <div className="space-y-1">
 <label className="text-sm font-medium text-blue-800 ">Email Address</label>
 <div className="relative">
 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full pl-10 pr-4 py-2 rounded-lg border border-blue-300 bg-white text-blue-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
 placeholder="name@example.com"
 />
 </div>
 </div>

 <div className="space-y-1">
 <label className="text-sm font-medium text-blue-800 ">Password</label>
 <div className="relative">
 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input
 type="password"
 required
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="w-full pl-10 pr-4 py-2 rounded-lg border border-blue-300 bg-white text-blue-950 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
 placeholder="••••••••"
 />
 </div>
 </div>

 {isSignUp && (
 <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-2">
 <p className="text-sm text-blue-700 font-medium text-center">
 Students: Do not sign up here. <br />
 Use the **Google Account** button to login.
 </p>
 </div>
 )}

 <button
 type="submit"
 disabled={loading}
 className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
 >
 {loading && !isSignUp ? (
 <Loader2 className="w-5 h-5 animate-spin" />
 ) : (
 <>
 {isSignUp ? 'Sign Up' : 'Sign In'}
 <ArrowRight className="w-5 h-5" />
 </>
 )}
 </button>

 <div className="relative my-6">
 <div className="absolute inset-0 flex items-center">
 <span className="w-full border-t border-blue-200 "></span>
 </div>
 <div className="relative flex justify-center text-xs uppercase">
 <span className="bg-white px-2 text-blue-600">Or continue with</span>
 </div>
 </div>

 <button
 type="button"
 onClick={handleGoogleLogin}
 disabled={loading}
 className="w-full bg-white border border-blue-300 hover:border-blue-500 text-blue-800 font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-3 disabled:opacity-70 shadow-sm"
 >
 <svg className="w-5 h-5" viewBox="0 0 24 24">
 <path
 fill="currentColor"
 d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
 />
 <path
 fill="currentColor"
 d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
 />
 <path
 fill="currentColor"
 d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
 />
 <path
 fill="currentColor"
 d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
 />
 </svg>
 Google Account
 </button>
 </form>

 <div className="mt-6 text-center">
 <button
 onClick={() => {
 setIsSignUp(!isSignUp)
 setRole('mentor') // Force mentor role for manual signup
 }}
 className="text-sm text-blue-600 hover:text-blue-700 :text-blue-300 font-medium transition-colors"
 >
 {isSignUp ? 'Already have a mentor account? Sign in' : "Are you a mentor? Apply to join here"}
 </button>
 </div>
 </div>
 </div>
 </div>
 )
}
