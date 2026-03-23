'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import {
  User, Tag, Save, Loader2, X, IndianRupee, Eye
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface MentorProfile {
  id: string
  bio: string | null
  background: string | null
  expertise: string[] | null
  hourly_rate: number | null
}

export default function ProfilePage() {
  const { profile, supabase } = useAuth()
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [bio, setBio] = useState('')
  const [background, setBackground] = useState('')
  const [expertiseInput, setExpertiseInput] = useState('')
  const [expertiseList, setExpertiseList] = useState<string[]>([])

  const fetchProfile = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('*')
        .eq('id', profile.id)
        .single()

      if (mentorData) {
        setMentorProfile(mentorData)
        setBio(mentorData.bio || '')
        setBackground(mentorData.background || '')
        setExpertiseList(mentorData.expertise || [])
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, profile])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleAddExpertise = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && expertiseInput.trim()) {
      e.preventDefault()
      if (!expertiseList.includes(expertiseInput.trim())) {
        setExpertiseList([...expertiseList, expertiseInput.trim()])
      }
      setExpertiseInput('')
    }
  }

  const handleRemoveExpertise = (tag: string) =>
    setExpertiseList(expertiseList.filter(t => t !== tag))

  const saveProfile = async () => {
    if (!profile?.id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('mentors')
        .update({ bio, background, expertise: expertiseList })
        .eq('id', profile.id)
      if (error) throw error
      await fetchProfile()
      alert('Profile updated successfully!')
    } catch (err: any) {
      console.error('Error updating profile:', err)
      alert(`Failed to update profile: ${err.message || 'Unknown error'}`)
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
          Edit your public-facing profile that students see.
        </p>
      </div>

      {/* Profile Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            Professional Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Professional Bio
            </label>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              rows={4}
              placeholder="Tell students about your background..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              A brief summary of your professional experience.
            </p>
          </div>

          {/* Background */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Work Experience / Background
            </label>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              rows={4}
              placeholder="Describe your professional background and achievements..."
              value={background}
              onChange={(e) => setBackground(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1">
              Relevant work history, education, and accomplishments.
            </p>
          </div>

          {/* Expertise Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Areas of Expertise
            </label>
            <div className="space-y-3">
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                placeholder="Type a skill and press Enter (e.g. Product Management)"
                value={expertiseInput}
                onChange={(e) => setExpertiseInput(e.target.value)}
                onKeyDown={handleAddExpertise}
              />
              <div className="flex flex-wrap gap-2">
                {expertiseList.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
                    {tag}
                    <button onClick={() => handleRemoveExpertise(tag)} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Students can filter mentors by these tags.
            </p>
          </div>

          {/* Hourly Rate (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <IndianRupee className="w-4 h-4" />
              Hourly Rate
            </label>
            <div className="relative max-w-xs">
              <div className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-sm text-slate-700">
                ₹{mentorProfile?.hourly_rate || 0}/hour
              </div>
              <p className="mt-2 text-xs text-slate-500">
                ℹ️ Only admins can change your hourly rate.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
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
            <Button variant="outline" onClick={() => window.open(`/mentor/${profile?.id}`, '_blank')}>
              <Eye className="w-4 h-4 mr-2" />
              Preview Public Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
