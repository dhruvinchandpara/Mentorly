'use client'

import { useRef, useState } from 'react'
import { createInvite, updateInvite, updateUser, cancelInvite } from '../../actions'
import type { InviteInput, UpdateUserInput } from '../../actions'
import { PERMISSION_OPTIONS } from '../../user-constants'
import type { UserRole } from '../../user-constants'
import { Loader2, Plus, CheckCircle, XCircle, X, Ban } from 'lucide-react'
import type { UserRow } from '../types'

const ROLES: UserRole[] = ['student', 'mentor', 'admin']

const TAG_COLORS = [
  'bg-accent text-primary',
  'bg-[#702327]/10 text-[#702327]',
  'bg-sky-100 text-sky-700',
  'bg-success-bg text-success',
  'bg-warning-bg text-warning',
  'bg-[#F5E6DE] text-destructive',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
]

function getTagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

function TagInput({
  tags,
  setTags,
}: {
  tags: string[]
  setTags: (tags: string[]) => void
}) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (value: string) => {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setInput('')
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border bg-white min-h-[44px] cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getTagColor(tag)}`}
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(tag)
            }}
            className="hover:opacity-70 transition"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (input.trim()) addTag(input)
        }}
        placeholder={tags.length === 0 ? 'Type and press Enter to add...' : ''}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-foreground placeholder-[var(--fg-faint)]"
      />
    </div>
  )
}

export type UserModalMode = 'add' | 'edit'

export function UserModal({
  mode,
  user,
  onClose,
  onSuccess,
}: {
  mode: UserModalMode
  user?: UserRow | null
  onClose: () => void
  onSuccess: (message: string) => void
}) {
  // Everyone gets an account the same way now: the admin invites an email
  // (writes to authorized_users), and the person signs in with Google
  // themselves whenever they like — handle_new_user() creates their real
  // profiles row at that point, with the role and fields set here already
  // attached. "Add" always means "create/update an invite"; only editing
  // someone who has actually signed in (kind === 'profile') touches
  // `profiles` directly.
  const isRegisteredProfile = mode === 'edit' && user?.kind === 'profile'
  const isPendingInvite = mode === 'edit' && user?.kind === 'invite'
  const roleLocked = isRegisteredProfile

  const [role, setRole] = useState<UserRole>(user?.role || 'student')
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [isAuthorized, setIsAuthorized] = useState(user?.is_authorized ?? true)
  const [bio, setBio] = useState(user?.bio || '')
  const [background, setBackground] = useState(user?.background || '')
  const [hourlyRate, setHourlyRate] = useState(user?.hourly_rate?.toString() || '')
  const [expertiseTags, setExpertiseTags] = useState<string[]>(user?.expertise_tags || [])
  const [isActive, setIsActive] = useState(user?.is_active ?? true)
  const [permissions, setPermissions] = useState<string[]>(user?.permissions || [])
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const togglePermission = (value: string) => {
    setPermissions((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    )
  }

  const canSave = fullName.trim().length > 0 && email.trim().length > 0

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)

    const shared = {
      role,
      fullName: fullName.trim(),
      email: email.trim(),
      bio,
      background,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      expertiseTags,
      isActive,
      permissions,
    }

    try {
      if (isRegisteredProfile) {
        const input: UpdateUserInput = { userId: user!.id!, isAuthorized, ...shared }
        const result = await updateUser(input)
        if (result.success) {
          onSuccess(`${fullName} updated successfully!`)
        } else {
          setError(result.error || 'Failed to update user.')
        }
        return
      }

      if (mode === 'add') {
        const input: InviteInput = shared
        const result = await createInvite(input)
        if (result.success) {
          onSuccess(`${fullName} invited — they can sign in with Google now.`)
        } else {
          setError(result.error || 'Failed to create invite.')
        }
      } else {
        const result = await updateInvite({
          currentEmail: user!.email!,
          isAuthorized: true,
          ...shared,
        })
        if (result.success) {
          onSuccess(`${fullName} invite updated.`)
        } else {
          setError(result.error || 'Failed to update invite.')
        }
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelInvite = async () => {
    if (!user?.email) return
    setCancelling(true)
    setError(null)
    try {
      const result = await cancelInvite(user.email)
      if (result.success) {
        onSuccess(`Invite for ${user.email} canceled.`)
      } else {
        setError(result.error || 'Failed to cancel invite.')
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0F1919]/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-5 border-b border-border flex items-center justify-between z-10 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-foreground font-sans">
              {mode === 'add' ? 'Invite User' : isPendingInvite ? 'Edit Invite' : 'Edit User'}
            </h2>
            <p className="text-sm text-primary mt-0.5">
              {mode === 'add'
                ? 'They can sign in with Google as soon as you invite them'
                : isPendingInvite
                  ? `Editing invite for ${user?.email}`
                  : `Editing ${user?.full_name || 'user'}`}
            </p>
          </div>
          <button
            onClick={onClose}
            id="close-modal"
            className="p-2 rounded-lg hover:bg-accent text-primary transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[#F5E6DE] border border-destructive/30 text-destructive text-sm">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Role selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Role</label>
            <div
              className={`inline-flex p-1 bg-[#FBF4D7] rounded-full ${roleLocked ? 'pointer-events-none opacity-60' : ''}`}
            >
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
                    role === r ? 'bg-[#0F1919] text-[#FFFBF3]' : 'text-[#4A5454]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {roleLocked && (
              <p className="mt-2 text-xs text-[var(--fg-faint)]">
                Role can&apos;t be changed after they&apos;ve signed in.
              </p>
            )}
          </div>

          {/* Shared fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                id="user-full-name"
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-foreground placeholder-[var(--fg-faint)] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                id="user-email"
                placeholder="user@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-foreground placeholder-[var(--fg-faint)] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition text-sm"
              />
            </div>
          </div>
          {!isRegisteredProfile && (
            <p className="-mt-3 text-xs text-primary">
              No password needed — this email will be able to sign in with Google right away, and
              land in the {role} dashboard.
            </p>
          )}

          {/* Role-specific fields */}
          {role === 'student' && isRegisteredProfile && (
            <div>
              <h3 className="text-sm font-semibold text-foreground font-sans mb-3">
                Student Settings
              </h3>
              <label className="flex items-center justify-between p-3.5 rounded-xl border border-border cursor-pointer">
                <span className="text-sm text-foreground">Authorized to sign in</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAuthorized}
                  onClick={() => setIsAuthorized((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isAuthorized ? 'bg-[#0F1919]' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isAuthorized ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
              <p className="mt-2 text-xs text-[var(--fg-faint)]">
                Turning this off revokes their access — they will no longer be able to sign in.
              </p>
            </div>
          )}

          {role === 'mentor' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground font-sans">
                Mentor Settings
              </h3>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Professional Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  id="user-bio"
                  rows={3}
                  placeholder="A brief professional summary of the mentor..."
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-foreground placeholder-[var(--fg-faint)] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Background / Experience
                </label>
                <textarea
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  id="user-background"
                  rows={3}
                  placeholder="Relevant work experience, education, and achievements..."
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-foreground placeholder-[var(--fg-faint)] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Hourly Rate (₹)
                </label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  id="user-rate"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 150"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-foreground placeholder-[var(--fg-faint)] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Expertise Tags
                </label>
                <TagInput tags={expertiseTags} setTags={setExpertiseTags} />
              </div>
              <label className="flex items-center justify-between p-3.5 rounded-xl border border-border cursor-pointer">
                <span className="text-sm text-foreground">Active</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  onClick={() => setIsActive((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isActive ? 'bg-[#0F1919]' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            </div>
          )}

          {role === 'admin' && (
            <div>
              <h3 className="text-sm font-semibold text-foreground font-sans mb-3">
                Permissions
              </h3>
              <div className="space-y-2">
                {PERMISSION_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-border cursor-pointer hover:bg-secondary transition"
                  >
                    <input
                      type="checkbox"
                      checked={permissions.includes(opt.value)}
                      onChange={() => togglePermission(opt.value)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-ring"
                    />
                    <span className="text-sm text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
            {isPendingInvite ? (
              <button
                type="button"
                onClick={handleCancelInvite}
                disabled={cancelling || saving}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive hover:bg-[#F5E6DE] px-3 py-2 rounded-lg transition disabled:opacity-50"
              >
                {cancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                Cancel invite
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-accent transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || cancelling || !canSave}
                id="save-user"
                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#0F1919] hover:bg-[#1C2C2C] text-[#FFFBF3] shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {mode === 'add' ? 'Inviting...' : 'Saving...'}
                  </>
                ) : mode === 'add' ? (
                  <>
                    <Plus className="w-4 h-4" />
                    Invite User
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
