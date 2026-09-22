'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import {
  User, Tag, Save, Loader2, IndianRupee, Eye
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
  const [expertiseList, setExpertiseList] = useState<string[]>([])

  const fetchProfile = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, bio, background, expertise_tags, hourly_rate')
        .eq('id', profile.id)
        .single()

      if (profileData) {
        setMentorProfile({
          id: profileData.id,
          bio: profileData.bio,
          background: profileData.background,
          expertise: profileData.expertise_tags,
          hourly_rate: profileData.hourly_rate,
        })
        setBio(profileData.bio || '')
        setBackground(profileData.background || '')
        setExpertiseList(profileData.expertise_tags || [])
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

  const saveProfile = async () => {
    if (!profile?.id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio, background })
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-display font-semibold text-foreground tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Edit your public-facing profile that students see.
        </p>
      </div>

      {/* Profile Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Professional Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Professional Bio
            </label>
            <textarea
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              rows={4}
              placeholder="Tell students about your background..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
            <p className="text-xs text-[var(--fg-faint)] mt-1">
              A brief summary of your professional experience.
            </p>
          </div>

          {/* Background */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Work Experience / Background
            </label>
            <textarea
              className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              rows={4}
              placeholder="Describe your professional background and achievements..."
              value={background}
              onChange={(e) => setBackground(e.target.value)}
            />
            <p className="text-xs text-[var(--fg-faint)] mt-1">
              Relevant work history, education, and accomplishments.
            </p>
          </div>

          {/* Expertise Tags */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Areas of Expertise
            </label>
            <div className="flex flex-wrap gap-2">
              {expertiseList.length > 0 ? (
                expertiseList.map((tag) => (
                  <span key={tag} className="inline-flex items-center px-3 py-1 bg-accent text-primary rounded-lg text-sm border border-accent">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No expertise tags yet.</span>
              )}
            </div>
            <p className="text-xs text-[var(--fg-faint)] mt-2">
              Only admins can change your expertise tags.
            </p>
          </div>

          {/* Hourly Rate (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <IndianRupee className="w-4 h-4" />
              Hourly Rate
            </label>
            <div className="relative max-w-xs">
              <div className="w-full bg-muted border border-border rounded-xl pl-8 pr-4 py-3 text-sm text-muted-foreground">
                ₹{mentorProfile?.hourly_rate || 0}/hour
              </div>
              <p className="mt-2 text-xs text-[var(--fg-faint)]">
                ℹ️ Only admins can change your hourly rate.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-border flex items-center gap-3">
            <Button onClick={saveProfile} disabled={saving} className="bg-[#0F1919] text-[#FFFBF3] hover:bg-[#1C2C2C] shadow-none">
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
