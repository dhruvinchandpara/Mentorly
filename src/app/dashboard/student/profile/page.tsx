'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import { User, Mail, Save, Loader2, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface StudentProfile {
  id: string
  bio: string | null
}

export default function StudentProfilePage() {
  const { profile, supabase } = useAuth()
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [bio, setBio] = useState('')

  const fetchProfile = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      // Fetch student profile from students table
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('id', profile.id)
        .single()

      if (studentData) {
        setStudentProfile(studentData)
        setBio(studentData.bio || '')
      }
    } catch (err: any) {
      console.error('Error fetching student profile:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, profile])

  useEffect(() => {
    setFullName(profile?.full_name || '')
  }, [profile?.full_name])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const saveProfile = async () => {
    if (!profile?.id) return
    setSaving(true)
    setMessage(null)

    try {
      // Update full name in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', profile.id)

      if (profileError) throw profileError

      // Upsert student bio
      if (studentProfile) {
        // Update existing
        const { error: studentError } = await supabase
          .from('students')
          .update({ bio: bio.trim() })
          .eq('id', profile.id)

        if (studentError) throw studentError
      } else {
        // Insert new
        const { error: studentError } = await supabase
          .from('students')
          .insert({ id: profile.id, bio: bio.trim() })

        if (studentError) throw studentError
      }

      await fetchProfile()
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setMessage({ type: 'error', text: `Failed to update profile: ${err.message || 'Unknown error'}` })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Profile</h1>
        <p className="text-slate-600 text-sm mt-1">
          Update your profile so mentors can learn more about you.
        </p>
      </div>

      {/* Profile Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="bg-slate-50"
            />
          </div>

          {/* Email (Read-only) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={profile?.email || ''}
              disabled
              className="bg-slate-100 cursor-not-allowed text-slate-600"
            />
            <p className="text-xs text-slate-500 mt-1">Email cannot be changed.</p>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              About Me
            </label>
            <textarea
              id="bio"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              rows={6}
              placeholder="Tell mentors about yourself, your goals, what you're looking to learn..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              This helps mentors prepare for your sessions and understand your background.
            </p>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div className={`p-4 rounded-lg text-sm border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200">
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
