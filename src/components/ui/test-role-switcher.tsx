'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { switchRole } from '@/app/actions/role-switcher'
import { useRouter } from 'next/navigation'
import { Settings, Loader2, Shield, GraduationCap, Users } from 'lucide-react'

import { TEST_EMAILS } from '@/lib/test-accounts'

export function TestRoleSwitcher() {
  const { user, profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const router = useRouter()

  if (!user || !user.email || !TEST_EMAILS.includes(user.email) || !profile) {
    return null
  }

  const handleSwitchRole = async (newRole: 'admin' | 'mentor' | 'student') => {
    if (profile.role === newRole) {
      setIsOpen(false)
      return
    }

    setIsSwitching(true)
    const result = await switchRole(newRole)
    if (result.success) {
      // Force a hard navigation to dashboard to reload all layouts
      window.location.href = '/dashboard'
    } else {
      console.error(result.error)
      alert('Failed to switch role: ' + result.error)
      setIsSwitching(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-3 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden w-48 animate-in fade-in slide-in-from-bottom-2">
          <div className="bg-secondary px-4 py-3 border-b border-border flex flex-col gap-1">
            <span className="text-xs font-bold text-[var(--fg-faint)] uppercase tracking-wider">Test Mode</span>
            <span className="text-sm font-semibold text-foreground">Switch Role</span>
          </div>

          <div className="p-2 space-y-1">
            <button
              onClick={() => handleSwitchRole('student')}
              disabled={isSwitching}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                profile.role === 'student'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-primary'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Student
            </button>

            <button
              onClick={() => handleSwitchRole('mentor')}
              disabled={isSwitching}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                profile.role === 'mentor'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-primary'
              }`}
            >
              <Users className="w-4 h-4" />
              Mentor
            </button>

            <button
              onClick={() => handleSwitchRole('admin')}
              disabled={isSwitching}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                profile.role === 'admin'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-primary'
              }`}
            >
              <Shield className="w-4 h-4" />
              Admin
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-foreground hover:brightness-90 text-background rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-foreground/30"
      >
        {isSwitching ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <Settings className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
        )}
      </button>
    </div>
  )
}
