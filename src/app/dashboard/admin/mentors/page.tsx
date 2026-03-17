'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createMentor, updateMentor, toggleMentorStatus as toggleStatusAction } from '../actions'
import type { CreateMentorInput, UpdateMentorInput } from '../actions'
import {
 Search,
 UserCheck,
 UserX,
 Loader2,
 Clock,
 AlertCircle,
 CheckCircle,
 XCircle,
 Filter,
 ChevronDown,
 Plus,
 X,
 Pencil,
 Tag,
 Copy,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────
type MentorWithProfile = {
 id: string
 bio: string | null
 background: string | null
 expertise: string[] | null
 is_active: boolean
 hourly_rate: number | null
 full_name: string | null
 email: string | null
 total_hours: number
}

type FilterStatus = 'all' | 'active' | 'pending'

type ModalMode = 'add' | 'edit' | null

// ─── Tag Colors ──────────────────────────────────────────────────
const TAG_COLORS = [
 'bg-blue-100 text-blue-700 ',
 'bg-purple-100 text-purple-700 ',
 'bg-sky-100 text-sky-700 ',
 'bg-emerald-100 text-emerald-700 ',
 'bg-amber-100 text-amber-700 ',
 'bg-rose-100 text-rose-700 ',
 'bg-teal-100 text-teal-700 ',
 'bg-orange-100 text-orange-700 ',
]

function getTagColor(tag: string): string {
 let hash = 0
 for (let i = 0; i < tag.length; i++) {
 hash = tag.charCodeAt(i) + ((hash << 5) - hash)
 }
 return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

// ─── Expertise Tag Input Component ────────────────────────────────
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

 const SUGGESTIONS = [
 'Product Management',
 'VC',
 'Founder',
 'Engineering',
 'Marketing',
 'Design',
 'Data Science',
 'AI/ML',
 'Sales',
 'Finance',
 'Leadership',
 'Strategy',
 'Growth',
 'Operations',
 ]

 const filteredSuggestions = SUGGESTIONS.filter(
 (s) =>
 !tags.includes(s) &&
 s.toLowerCase().includes(input.toLowerCase()) &&
 input.length > 0
 )

 return (
 <div>
 <div
 className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-blue-200 bg-white min-h-[44px] cursor-text"
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
 placeholder={
 tags.length === 0 ? 'Type and press Enter to add...' : ''
 }
 className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-blue-950 placeholder-slate-400"
 />
 </div>
 {filteredSuggestions.length > 0 && (
 <div className="mt-2 flex flex-wrap gap-1.5">
 {filteredSuggestions.slice(0, 6).map((s) => (
 <button
 key={s}
 type="button"
 onClick={() => addTag(s)}
 className="px-2.5 py-1 text-xs font-medium rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 :bg-blue-950/30 :text-blue-300 transition"
 >
 + {s}
 </button>
 ))}
 </div>
 )}
 </div>
 )
}

// ─── Mentor Modal Component ────────────────────────────────────
function MentorModal({
 mode,
 mentor,
 onClose,
 onSuccess,
}: {
 mode: ModalMode
 mentor?: MentorWithProfile | null
 onClose: () => void
 onSuccess: (message: string, tempPassword?: string) => void
}) {
 const [fullName, setFullName] = useState(mentor?.full_name || '')
 const [email, setEmail] = useState(mentor?.email || '')
 const [bio, setBio] = useState(mentor?.bio || '')
 const [background, setBackground] = useState(mentor?.background || '')
 const [expertise, setExpertise] = useState<string[]>(
 mentor?.expertise || []
 )
 const [hourlyRate, setHourlyRate] = useState(
 mentor?.hourly_rate?.toString() || ''
 )
 const [saving, setSaving] = useState(false)
 const [error, setError] = useState<string | null>(null)

 if (!mode) return null

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault()
 setSaving(true)
 setError(null)

 try {
 if (mode === 'add') {
 const input: CreateMentorInput = {
 fullName,
 email,
 bio,
 background,
 expertise,
 hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
 }
 const result = await createMentor(input)
 if (result.success) {
 onSuccess(
 `Mentor "${fullName}" created successfully!`,
 result.tempPassword
 )
 } else {
 setError(result.error || 'Failed to create mentor.')
 }
 } else {
 const input: UpdateMentorInput = {
 mentorId: mentor!.id,
 bio,
 background,
 expertise,
 hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
 }
 const result = await updateMentor(input)
 if (result.success) {
 onSuccess(`Mentor "${mentor?.full_name}" updated successfully!`)
 } else {
 setError(result.error || 'Failed to update mentor.')
 }
 }
 } catch {
 setError('An unexpected error occurred.')
 } finally {
 setSaving(false)
 }
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 {/* Backdrop */}
 <div
 className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
 onClick={onClose}
 />

 {/* Modal */}
 <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-blue-200 max-h-[90vh] overflow-y-auto">
 {/* Header */}
 <div className="sticky top-0 bg-white px-6 py-5 border-b border-blue-200 flex items-center justify-between z-10 rounded-t-2xl">
 <div>
 <h2 className="text-xl font-bold text-blue-950 ">
 {mode === 'add'
 ? 'Add New Mentor'
 : 'Edit Mentor'}
 </h2>
 <p className="text-sm text-blue-600 mt-0.5">
 {mode === 'add'
 ? 'Create a new mentor account with credentials'
 : `Editing ${mentor?.full_name || 'mentor'}`}
 </p>
 </div>
 <button
 onClick={onClose}
 id="close-modal"
 className="p-2 rounded-lg hover:bg-blue-50 :bg-slate-800 text-blue-600 transition"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Form */}
 <form onSubmit={handleSave} className="p-6 space-y-6">
 {error && (
 <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
 <XCircle className="w-5 h-5 flex-shrink-0" />
 {error}
 </div>
 )}

 {/* Account Info — only for adding new mentors */}
 {mode === 'add' && (
 <div>
 <h3 className="text-sm font-semibold text-blue-950 mb-4 flex items-center gap-2">
 <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
 1
 </div>
 Account Information
 </h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-blue-800 mb-1.5">
 Full Name *
 </label>
 <input
 type="text"
 required
 value={fullName}
 onChange={(e) =>
 setFullName(e.target.value)
 }
 id="mentor-full-name"
 placeholder="e.g. John Doe"
 className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-blue-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-blue-800 mb-1.5">
 Email Address *
 </label>
 <input
 type="email"
 required
 value={email}
 onChange={(e) =>
 setEmail(e.target.value)
 }
 id="mentor-email"
 placeholder="mentor@example.com"
 className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-blue-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
 />
 </div>
 </div>
 <p className="mt-2 text-xs text-blue-600 ">
 A temporary password will be generated. You can share it with the mentor.
 </p>
 </div>
 )}

 {/* Background Info */}
 <div>
 <h3 className="text-sm font-semibold text-blue-950 mb-4 flex items-center gap-2">
 <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
 {mode === 'add' ? '2' : '1'}
 </div>
 Background Information
 </h3>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-blue-800 mb-1.5">
 Professional Bio
 </label>
 <textarea
 value={bio}
 onChange={(e) => setBio(e.target.value)}
 id="mentor-bio"
 rows={3}
 placeholder="A brief professional summary of the mentor..."
 className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-blue-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm resize-none"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-blue-800 mb-1.5">
 Background / Experience
 </label>
 <textarea
 value={background}
 onChange={(e) =>
 setBackground(e.target.value)
 }
 id="mentor-background"
 rows={3}
 placeholder="Relevant work experience, education, and achievements..."
 className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-blue-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm resize-none"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-blue-800 mb-1.5">
 Hourly Rate (₹)
 </label>
 <input
 type="number"
 value={hourlyRate}
 onChange={(e) =>
 setHourlyRate(e.target.value)
 }
 id="mentor-rate"
 min="0"
 step="0.01"
 placeholder="e.g. 150"
 className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-blue-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
 />
 </div>
 </div>
 </div>

 {/* Expertise Tags */}
 <div>
 <h3 className="text-sm font-semibold text-blue-950 mb-4 flex items-center gap-2">
 <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
 {mode === 'add' ? '3' : '2'}
 </div>
 Expertise Tags
 </h3>
 <TagInput tags={expertise} setTags={setExpertise} />
 </div>

 {/* Actions */}
 <div className="flex items-center justify-end gap-3 pt-4 border-t border-blue-200 ">
 <button
 type="button"
 onClick={onClose}
 className="px-5 py-2.5 rounded-xl text-sm font-medium text-blue-800 hover:bg-blue-50 :bg-slate-800 transition"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={
 saving ||
 (mode === 'add' && (!fullName || !email))
 }
 id="save-mentor"
 className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
 >
 {saving ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" />
 {mode === 'add'
 ? 'Creating...'
 : 'Saving...'}
 </>
 ) : mode === 'add' ? (
 <>
 <Plus className="w-4 h-4" />
 Create Mentor
 </>
 ) : (
 <>
 <CheckCircle className="w-4 h-4" />
 Save Changes
 </>
 )}
 </button>
 </div>
 </form>
 </div>
 </div>
 )
}

// ─── Success Modal (shows temp password) ─────────────────────────
function SuccessModal({
 tempPassword,
 onClose,
}: {
 tempPassword: string
 onClose: () => void
}) {
 const [copied, setCopied] = useState(false)

 const copyPassword = () => {
 navigator.clipboard.writeText(tempPassword)
 setCopied(true)
 setTimeout(() => setCopied(false), 2000)
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div
 className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
 onClick={onClose}
 />
 <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-blue-200 p-6">
 <div className="text-center mb-6">
 <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
 <CheckCircle className="w-7 h-7 text-emerald-600 " />
 </div>
 <h3 className="text-lg font-bold text-blue-950 ">
 Mentor Created Successfully!
 </h3>
 <p className="text-sm text-blue-600 mt-1">
 Share the temporary password below with the mentor.
 </p>
 </div>

 <div className="bg-slate-50 rounded-xl p-4 mb-6">
 <label className="block text-xs font-medium text-blue-600 mb-2">
 Temporary Password
 </label>
 <div className="flex items-center gap-2">
 <code className="flex-1 text-sm font-mono text-blue-950 bg-white px-3 py-2 rounded-lg border border-blue-200 break-all">
 {tempPassword}
 </code>
 <button
 onClick={copyPassword}
 className="p-2 rounded-lg hover:bg-slate-200 :bg-slate-700 transition text-blue-700 "
 >
 {copied ? (
 <CheckCircle className="w-4 h-4 text-emerald-600" />
 ) : (
 <Copy className="w-4 h-4" />
 )}
 </button>
 </div>
 </div>

 <button
 onClick={onClose}
 id="close-success-modal"
 className="w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition"
 >
 Done
 </button>
 </div>
 </div>
 )
}

// ─── Main Page Component ────────────────────────────────────────
export default function MentorManagement() {
 const { supabase, loading: authLoading } = useAuth()
 const [mentors, setMentors] = useState<MentorWithProfile[]>([])
 const [loading, setLoading] = useState(true)
 const [searchQuery, setSearchQuery] = useState('')
 const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
 const [filterTags, setFilterTags] = useState<string[]>([])
 const [actionLoading, setActionLoading] = useState<string | null>(null)
 const [toast, setToast] = useState<{
 message: string
 type: 'success' | 'error'
 } | null>(null)
 const [showStatusDropdown, setShowStatusDropdown] = useState(false)
 const [showTagDropdown, setShowTagDropdown] = useState(false)
 const [modalMode, setModalMode] = useState<ModalMode>(null)
 const [editingMentor, setEditingMentor] =
 useState<MentorWithProfile | null>(null)
 const [tempPassword, setTempPassword] = useState<string | null>(null)

 // Collect all unique tags
 const allTags = Array.from(
 new Set(mentors.flatMap((m) => m.expertise || []))
 ).sort()

 const fetchMentors = useCallback(async () => {
 try {
 const { data, error } = await supabase
 .from('mentors')
 .select(`
 id,
 bio,
 background,
 expertise,
 hourly_rate,
 is_active,
 profiles: profiles!inner(
 full_name,
 email
 )
 `)
 .order('is_active', { ascending: true })

 if (error) throw error

 // Fetch completed bookings to calculate hours
 const { data: bookingsData } = await supabase
 .from('bookings')
 .select('mentor_id, duration_minutes')
 .eq('status', 'completed')

 const hoursMap: Record<string, number> = {}
 if (bookingsData) {
 (bookingsData as { mentor_id: string; duration_minutes: number }[]).forEach((b) => {
 const hours = (b.duration_minutes || 60) / 60
 hoursMap[b.mentor_id] = (hoursMap[b.mentor_id] || 0) + hours
 })
 }

 if (data) {
 type MentorRow = {
 id: string
 bio: string
 background: string
 expertise: string[]
 hourly_rate: number
 is_active: boolean
 profiles: { full_name: string | null; email: string | null }
 }

 setMentors(
 (data as unknown as MentorRow[]).map((m) => ({
 id: m.id,
 bio: m.bio,
 background: m.background,
 expertise: m.expertise || [],
 hourly_rate: m.hourly_rate || 0,
 is_active: m.is_active,
 full_name: m.profiles?.full_name || 'Unknown',
 email: m.profiles?.email || '',
 total_hours: hoursMap[m.id] || 0,
 }))
 )
 }
 } catch (error: unknown) {
 console.error('Error fetching mentors:', error)
 const message = error instanceof Error ? error.message : 'Unknown error'
 showToast(`Failed to load mentors: ${message}. Please refresh the page.`, 'error')

 // Set empty state to avoid showing stale data
 setMentors([])
 } finally {
 setLoading(false)
 }
 }, [supabase])

 useEffect(() => {
 if (!authLoading) {
 fetchMentors()
 }
 }, [authLoading, fetchMentors])

 const toggleMentorStatus = async (
 mentorId: string,
 currentStatus: boolean
 ) => {
 setActionLoading(mentorId)
 try {
 const result = await toggleStatusAction({
 mentorId,
 isActive: !currentStatus,
 })

 if (result.error) {
 showToast('Failed to update mentor status.', 'error')
 } else {
 showToast(
 !currentStatus
 ? 'Mentor approved successfully!'
 : 'Mentor deactivated.',
 'success'
 )
 setMentors((prev) =>
 prev.map((m) =>
 m.id === mentorId
 ? { ...m, is_active: !currentStatus }
 : m
 )
 )
 }
 } catch {
 showToast('An unexpected error occurred.', 'error')
 } finally {
 setActionLoading(null)
 }
 }

 const showToast = (message: string, type: 'success' | 'error') => {
 setToast({ message, type })
 setTimeout(() => setToast(null), 3500)
 }

 const handleModalSuccess = (message: string, generatedPassword?: string) => {
 setModalMode(null)
 setEditingMentor(null)
 if (generatedPassword) {
 setTempPassword(generatedPassword)
 }
 showToast(message, 'success')
 setLoading(true)
 fetchMentors()
 }

 const openEditModal = (mentor: MentorWithProfile) => {
 setEditingMentor(mentor)
 setModalMode('edit')
 }

 const toggleTagFilter = (tag: string) => {
 setFilterTags((prev) =>
 prev.includes(tag)
 ? prev.filter((t) => t !== tag)
 : [...prev, tag]
 )
 }

 const clearAllFilters = () => {
 setSearchQuery('')
 setFilterStatus('all')
 setFilterTags([])
 }

 const hasActiveFilters =
 searchQuery || filterStatus !== 'all' || filterTags.length > 0

 // ─── Filtering Logic ───────────────────────────────────────
 const filteredMentors = mentors.filter((mentor) => {
 const matchesSearch =
 !searchQuery ||
 mentor.full_name
 ?.toLowerCase()
 .includes(searchQuery.toLowerCase()) ||
 mentor.email
 ?.toLowerCase()
 .includes(searchQuery.toLowerCase()) ||
 mentor.expertise?.some((e) =>
 e.toLowerCase().includes(searchQuery.toLowerCase())
 )

 const matchesStatus =
 filterStatus === 'all' ||
 (filterStatus === 'active' && mentor.is_active) ||
 (filterStatus === 'pending' && !mentor.is_active)

 const matchesTags =
 filterTags.length === 0 ||
 filterTags.every((tag) => mentor.expertise?.includes(tag))

 return matchesSearch && matchesStatus && matchesTags
 })

 // ─── Loading State ─────────────────────────────────────────
 if (loading) {
 return (
 <div className="flex items-center justify-center h-64">
 <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
 </div>
 )
 }

 return (
 <div>
 {/* Toast */}
 {toast && (
 <div
 className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-300 ${toast.type === 'success'
 ? 'bg-emerald-50/90 border-emerald-200 text-emerald-700 '
 : 'bg-red-50/90 border-red-200 text-red-700 '
 }`}
 >
 {toast.type === 'success' ? (
 <CheckCircle className="w-5 h-5" />
 ) : (
 <XCircle className="w-5 h-5" />
 )}
 <span className="text-sm font-medium">{toast.message}</span>
 </div>
 )}

 {/* Modal */}
 {modalMode && (
 <MentorModal
 mode={modalMode}
 mentor={editingMentor}
 onClose={() => {
 setModalMode(null)
 setEditingMentor(null)
 }}
 onSuccess={handleModalSuccess}
 />
 )}

 {/* Success / Password Modal */}
 {tempPassword && (
 <SuccessModal
 tempPassword={tempPassword}
 onClose={() => setTempPassword(null)}
 />
 )}

 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
 <div>
 <h1 className="text-3xl font-bold text-blue-950 tracking-tight">
 Mentor Management
 </h1>
 <p className="text-blue-600 mt-1">
 Review, approve, and manage all mentor accounts.
 </p>
 </div>
 <button
 onClick={() => setModalMode('add')}
 id="add-new-mentor"
 className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition-all"
 >
 <Plus className="w-4 h-4" />
 Add New Mentor
 </button>
 </div>

 {/* Controls Row */}
 <div className="flex flex-col sm:flex-row gap-3 mb-4">
 {/* Search */}
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input
 type="text"
 id="search-mentors"
 placeholder="Search by name, email, or expertise..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-blue-200 bg-white text-blue-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
 />
 </div>

 {/* Status Filter */}
 <div className="relative">
 <button
 onClick={() => {
 setShowStatusDropdown(!showStatusDropdown)
 setShowTagDropdown(false)
 }}
 id="filter-status"
 className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-blue-800 hover:bg-slate-50 :bg-slate-800 transition text-sm"
 >
 <Filter className="w-4 h-4" />
 <span className="font-medium capitalize">
 {filterStatus === 'all'
 ? 'All Status'
 : filterStatus}
 </span>
 <ChevronDown className="w-4 h-4" />
 </button>
 {showStatusDropdown && (
 <div className="absolute right-0 mt-2 w-44 bg-white border border-blue-200 rounded-xl shadow-lg z-20 overflow-hidden">
 {(
 ['all', 'active', 'pending'] as FilterStatus[]
 ).map((status) => (
 <button
 key={status}
 onClick={() => {
 setFilterStatus(status)
 setShowStatusDropdown(false)
 }}
 className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 :bg-slate-800 transition capitalize ${filterStatus === status
 ? 'text-blue-600 font-medium bg-blue-50 '
 : 'text-blue-800 '
 }`}
 >
 {status === 'all' ? 'All Status' : status}
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Tag Filter */}
 <div className="relative">
 <button
 onClick={() => {
 setShowTagDropdown(!showTagDropdown)
 setShowStatusDropdown(false)
 }}
 id="filter-tags"
 className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition ${filterTags.length > 0
 ? 'border-blue-300 bg-blue-50 text-blue-700 '
 : 'border-blue-200 bg-white text-blue-800 hover:bg-slate-50 :bg-slate-800'
 } `}
 >
 <Tag className="w-4 h-4" />
 <span className="font-medium">
 {filterTags.length > 0
 ? `${filterTags.length} Tag${filterTags.length > 1 ? 's' : ''} `
 : 'Filter by Tag'}
 </span>
 <ChevronDown className="w-4 h-4" />
 </button>
 {showTagDropdown && (
 <div className="absolute right-0 mt-2 w-56 bg-white border border-blue-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-72 overflow-y-auto">
 {allTags.length === 0 ? (
 <p className="px-4 py-3 text-sm text-blue-600 text-center">
 No tags available
 </p>
 ) : (
 allTags.map((tag) => (
 <button
 key={tag}
 onClick={() => toggleTagFilter(tag)}
 className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 :bg-slate-800 transition flex items-center gap-2 ${filterTags.includes(tag)
 ? 'text-blue-600 font-medium bg-blue-50 '
 : 'text-blue-800 '
 } `}
 >
 <span
 className={`w-4 h-4 rounded border flex items-center justify-center transition ${filterTags.includes(tag)
 ? 'border-blue-600 bg-blue-600 '
 : 'border-blue-300 '
 } `}
 >
 {filterTags.includes(tag) && (
 <CheckCircle className="w-3 h-3 text-white " />
 )}
 </span>
 {tag}
 </button>
 ))
 )}
 </div>
 )}
 </div>

 {/* Clear Filters */}
 {hasActiveFilters && (
 <button
 onClick={clearAllFilters}
 id="clear-filters"
 className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 :bg-red-950/30 border border-red-200 transition"
 >
 <XCircle className="w-4 h-4" />
 Clear Filters
 </button>
 )}
 </div>

 {/* Active Tag Filters Display */}
 {filterTags.length > 0 && (
 <div className="flex flex-wrap items-center gap-2 mb-4">
 <span className="text-xs font-medium text-blue-600 ">
 Filtering by:
 </span>
 {filterTags.map((tag) => (
 <button
 key={tag}
 onClick={() => toggleTagFilter(tag)}
 className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition hover:opacity-80 ${getTagColor(tag)} `}
 >
 {tag}
 <X className="w-3 h-3" />
 </button>
 ))}
 </div>
 )}

 {/* Stats Bar */}
 <div className="flex items-center gap-4 mb-6">
 <span className="text-sm text-blue-600 ">
 Showing{' '}
 <span className="font-semibold text-blue-950 ">
 {filteredMentors.length}
 </span>{' '}
 of {mentors.length} mentors
 </span>
 <div className="flex-1" />
 <div className="flex items-center gap-3 text-xs">
 <span className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-emerald-500" />
 Active: {mentors.filter((m) => m.is_active).length}
 </span>
 <span className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-amber-500" />
 Pending: {mentors.filter((m) => !m.is_active).length}
 </span>
 </div>
 </div>

 {/* Table */}
 <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
 {filteredMentors.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 px-6">
 <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
 <AlertCircle className="w-8 h-8 text-slate-400 " />
 </div>
 <h3 className="text-lg font-semibold text-blue-950 mb-1">
 {hasActiveFilters
 ? 'No mentors found'
 : 'No mentors yet'}
 </h3>
 <p className="text-sm text-blue-600 text-center max-w-sm">
 {hasActiveFilters
 ? 'Try adjusting your search or filter criteria.'
 : 'Click "Add New Mentor" to create your first mentor.'}
 </p>
 {!hasActiveFilters && !loading && (
 <>
 <button
 onClick={() => setModalMode('add')}
 className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition-all"
 >
 <Plus className="w-4 h-4" />
 Add New Mentor
 </button>
 <button
 onClick={() => {
 setLoading(true)
 fetchMentors()
 }}
 className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white border border-blue-200 text-blue-800 hover:border-blue-400 transition-all"
 >
 <AlertCircle className="w-4 h-4" />
 Retry Loading
 </button>
 </>
 )}
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full" id="mentors-table">
 <thead>
 <tr className="border-b border-blue-200 ">
 <th className="text-left px-6 py-4 text-xs font-semibold text-blue-600 uppercase tracking-wider">
 Mentor
 </th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-blue-600 uppercase tracking-wider">
 Expertise
 </th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-blue-600 uppercase tracking-wider">
 Rate
 </th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-blue-600 uppercase tracking-wider">
 Total Hours
 </th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-blue-600 uppercase tracking-wider">
 Status
 </th>
 <th className="text-right px-6 py-4 text-xs font-semibold text-blue-600 uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {filteredMentors.map((mentor) => (
 <tr
 key={mentor.id}
 className="hover:bg-slate-50 :bg-slate-800/50 transition-colors"
 >
 <td className="px-6 py-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
 {mentor.full_name
 ?.charAt(0)
 ?.toUpperCase() || '?'}
 </div>
 <div>
 <p className="text-sm font-medium text-blue-950 ">
 {mentor.full_name ||
 'Unnamed Mentor'}
 </p>
 <p className="text-xs text-blue-600 ">
 {mentor.email}
 </p>
 </div>
 </div>
 </td>
 <td className="px-6 py-4">
 <div className="flex flex-wrap gap-1.5 max-w-[280px]">
 {mentor.expertise &&
 mentor.expertise.length > 0 ? (
 <>
 {mentor.expertise
 .slice(0, 3)
 .map((skill) => (
 <span
 key={skill}
 className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${getTagColor(skill)} `}
 >
 {skill}
 </span>
 ))}
 {mentor.expertise
 .length > 3 && (
 <span className="inline-block px-2 py-0.5 text-xs text-blue-600 ">
 +
 {mentor
 .expertise
 .length -
 3}{' '}
 more
 </span>
 )}
 </>
 ) : (
 <span className="text-xs text-slate-400 italic">
 No expertise listed
 </span>
 )}
 </div>
 </td>
 <td className="px-6 py-4">
 <span className="text-sm font-medium text-blue-950 ">
 {mentor.hourly_rate
 ? `₹${mentor.hourly_rate}/hr`
 : '—'
 }
 </span >
 </td >
 <td className="px-6 py-4">
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 ">
 <Clock className="w-3.5 h-3.5" />
 {mentor.total_hours?.toFixed(1) || '0'} hrs
 </span>
 </td>
 <td className="px-6 py-4">
 <span
 className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${mentor.is_active
 ? 'bg-emerald-50 text-emerald-700 '
 : 'bg-amber-50 text-amber-700 '
 }`}
 >
 <span
 className={`w-1.5 h-1.5 rounded-full ${mentor.is_active ? 'bg-emerald-500' : 'bg-amber-500'}`}
 />
 {mentor.is_active
 ? 'Active'
 : 'Pending'}
 </span>
 </td>
 <td className="px-6 py-4 text-right">
 <div className="flex items-center justify-end gap-2">
 <button
 onClick={() =>
 openEditModal(mentor)
 }
 id={`edit-${mentor.id}`}
 className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 :bg-slate-800 border border-blue-200 transition"
 >
 <Pencil className="w-3.5 h-3.5" />
 Edit
 </button>
 <button
 onClick={() =>
 toggleMentorStatus(
 mentor.id,
 mentor.is_active
 )
 }
 disabled={
 actionLoading ===
 mentor.id
 }
 id={`action-${mentor.id}`}
 className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${mentor.is_active
 ? 'bg-red-50 text-red-600 hover:bg-red-100 :bg-red-950/50 border border-red-200 '
 : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 :bg-emerald-950/50 border border-emerald-200 '
 }`}
 >
 {actionLoading ===
 mentor.id ? (
 <Loader2 className="w-3.5 h-3.5 animate-spin" />
 ) : mentor.is_active ? (
 <>
 <UserX className="w-3.5 h-3.5" />
 Deactivate
 </>
 ) : (
 <>
 <UserCheck className="w-3.5 h-3.5" />
 Approve
 </>
 )}
 </button>
 </div>
 </td>
 </tr >
 ))}
 </tbody >
 </table >
 </div >
 )}
 </div >
 </div >
 )
}
