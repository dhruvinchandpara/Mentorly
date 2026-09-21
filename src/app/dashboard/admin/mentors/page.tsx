'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createMentor, updateMentor, toggleMentorStatus as toggleStatusAction, bulkImportMentors } from '../actions'
import type { CreateMentorInput, UpdateMentorInput, BulkImportMentorInput, BulkImportResult } from '../actions'
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
 MoreVertical,
 Upload,
 Download,
 FileText,
} from 'lucide-react'
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/ui/status-badge'

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
 'bg-accent text-primary ',
 'bg-[#702327]/10 text-[#702327] ',
 'bg-sky-100 text-sky-700 ',
 'bg-success-bg text-success ',
 'bg-warning-bg text-warning ',
 'bg-[#F5E6DE] text-destructive ',
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
 placeholder={
 tags.length === 0 ? 'Type and press Enter to add...' : ''
 }
 className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-foreground placeholder-[var(--fg-faint)]"
 />
 </div>
 {filteredSuggestions.length > 0 && (
 <div className="mt-2 flex flex-wrap gap-1.5">
 {filteredSuggestions.slice(0, 6).map((s) => (
 <button
 key={s}
 type="button"
 onClick={() => addTag(s)}
 className="px-2.5 py-1 text-xs font-medium rounded-full border border-border text-primary hover:bg-accent hover:text-primary hover:border-border transition"
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
 className="absolute inset-0 bg-[#0F1919]/60 backdrop-blur-sm"
 onClick={onClose}
 />

 {/* Modal */}
 <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
 {/* Header */}
 <div className="sticky top-0 bg-white px-6 py-5 border-b border-border flex items-center justify-between z-10 rounded-t-2xl">
 <div>
 <h2 className="text-xl font-bold text-foreground font-sans">
 {mode === 'add'
 ? 'Add New Mentor'
 : 'Edit Mentor'}
 </h2>
 <p className="text-sm text-primary mt-0.5">
 {mode === 'add'
 ? 'Create a new mentor account with credentials'
 : `Editing ${mentor?.full_name || 'mentor'}`}
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

 {/* Form */}
 <form onSubmit={handleSave} className="p-6 space-y-6">
 {error && (
 <div className="flex items-center gap-3 p-4 rounded-xl bg-[#F5E6DE] border border-destructive/30 text-destructive text-sm">
 <XCircle className="w-5 h-5 flex-shrink-0" />
 {error}
 </div>
 )}

 {/* Account Info — only for adding new mentors */}
 {mode === 'add' && (
 <div>
 <h3 className="text-sm font-semibold text-foreground font-sans mb-4 flex items-center gap-2">
 <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center text-primary text-xs font-bold">
 1
 </div>
 Account Information
 </h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-foreground mb-1.5">
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
 onChange={(e) =>
 setEmail(e.target.value)
 }
 id="mentor-email"
 placeholder="mentor@example.com"
 className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-foreground placeholder-[var(--fg-faint)] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition text-sm"
 />
 </div>
 </div>
 <p className="mt-2 text-xs text-primary ">
 A temporary password will be generated. You can share it with the mentor.
 </p>
 </div>
 )}

 {/* Background Info */}
 <div>
 <h3 className="text-sm font-semibold text-foreground font-sans mb-4 flex items-center gap-2">
 <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center text-primary text-xs font-bold">
 {mode === 'add' ? '2' : '1'}
 </div>
 Background Information
 </h3>
 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-foreground mb-1.5">
 Professional Bio
 </label>
 <textarea
 value={bio}
 onChange={(e) => setBio(e.target.value)}
 id="mentor-bio"
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
 onChange={(e) =>
 setBackground(e.target.value)
 }
 id="mentor-background"
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
 onChange={(e) =>
 setHourlyRate(e.target.value)
 }
 id="mentor-rate"
 min="0"
 step="0.01"
 placeholder="e.g. 150"
 className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-foreground placeholder-[var(--fg-faint)] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition text-sm"
 />
 </div>
 </div>
 </div>

 {/* Expertise Tags */}
 <div>
 <h3 className="text-sm font-semibold text-foreground font-sans mb-4 flex items-center gap-2">
 <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center text-primary text-xs font-bold">
 {mode === 'add' ? '3' : '2'}
 </div>
 Expertise Tags
 </h3>
 <TagInput tags={expertise} setTags={setExpertise} />
 </div>

 {/* Actions */}
 <div className="flex items-center justify-end gap-3 pt-4 border-t border-border ">
 <button
 type="button"
 onClick={onClose}
 className="px-5 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-accent transition"
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
 className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#0F1919] hover:bg-[#1C2C2C] text-[#FFFBF3] shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
 className="absolute inset-0 bg-[#0F1919]/60 backdrop-blur-sm"
 onClick={onClose}
 />
 <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-border p-6">
 <div className="text-center mb-6">
 <div className="w-14 h-14 rounded-2xl bg-success-bg flex items-center justify-center mx-auto mb-4">
 <CheckCircle className="w-7 h-7 text-success " />
 </div>
 <h3 className="text-lg font-bold text-foreground font-sans">
 Mentor Created Successfully!
 </h3>
 <p className="text-sm text-primary mt-1">
 Share the temporary password below with the mentor.
 </p>
 </div>

 <div className="bg-secondary rounded-xl p-4 mb-6">
 <label className="block text-xs font-medium text-primary mb-2">
 Temporary Password
 </label>
 <div className="flex items-center gap-2">
 <code className="flex-1 text-sm font-mono text-foreground bg-white px-3 py-2 rounded-lg border border-border break-all">
 {tempPassword}
 </code>
 <button
 onClick={copyPassword}
 className="p-2 rounded-lg hover:bg-muted transition text-primary "
 >
 {copied ? (
 <CheckCircle className="w-4 h-4 text-success" />
 ) : (
 <Copy className="w-4 h-4" />
 )}
 </button>
 </div>
 </div>

 <button
 onClick={onClose}
 id="close-success-modal"
 className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#0F1919] hover:bg-[#1C2C2C] text-[#FFFBF3] shadow-lg transition"
 >
 Done
 </button>
 </div>
 </div>
 )
}

// ─── Bulk Import Modal ─────────────────────────────────────────
function BulkImportModal({
 onClose,
 onSuccess,
}: {
 onClose: () => void
 onSuccess: (result: BulkImportResult) => void
}) {
 const [csvContent, setCsvContent] = useState('')
 const [importing, setImporting] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const fileInputRef = useRef<HTMLInputElement>(null)

 const downloadTemplate = () => {
 const template = `Full Name,Email,Bio,Background,Expertise,Hourly Rate
John Doe,john@example.com,Product Manager with 10 years experience,Former PM at Google and Meta,"Product Management,Strategy,Leadership",150
Jane Smith,jane@example.com,Senior Engineer specializing in AI,PhD in ML from Stanford,"Engineering,AI/ML,Data Science",200`

 const blob = new Blob([template], { type: 'text/csv' })
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a')
 a.href = url
 a.download = 'mentor_import_template.csv'
 a.click()
 URL.revokeObjectURL(url)
 }

 const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0]
 if (!file) return

 const reader = new FileReader()
 reader.onload = (event) => {
 const content = event.target?.result as string
 setCsvContent(content)
 }
 reader.readAsText(file)
 }

 const parseCSV = (csv: string): BulkImportMentorInput[] => {
 const lines = csv.trim().split('\n')
 if (lines.length < 2) return []

 const mentors: BulkImportMentorInput[] = []

 // Skip header row
 for (let i = 1; i < lines.length; i++) {
 const line = lines[i].trim()
 if (!line) continue

 // Parse CSV line (handle quoted fields)
 const fields: string[] = []
 let currentField = ''
 let inQuotes = false

 for (let j = 0; j < line.length; j++) {
 const char = line[j]
 if (char === '"') {
 inQuotes = !inQuotes
 } else if (char === ',' && !inQuotes) {
 fields.push(currentField.trim())
 currentField = ''
 } else {
 currentField += char
 }
 }
 fields.push(currentField.trim())

 const [fullName, email, bio, background, expertiseStr, hourlyRateStr] = fields

 const mentor: BulkImportMentorInput = {
 fullName: fullName || '',
 email: email || '',
 bio: bio || '',
 background: background || '',
 expertise: expertiseStr ? expertiseStr.split(',').map(e => e.trim()).filter(Boolean) : [],
 hourlyRate: hourlyRateStr ? parseFloat(hourlyRateStr) : undefined,
 }

 mentors.push(mentor)
 }

 return mentors
 }

 const handleImport = async () => {
 if (!csvContent.trim()) {
 setError('Please upload a CSV file first')
 return
 }

 setImporting(true)
 setError(null)

 try {
 const mentors = parseCSV(csvContent)

 if (mentors.length === 0) {
 setError('No valid mentor data found in CSV')
 setImporting(false)
 return
 }

 const result = await bulkImportMentors(mentors)
 onSuccess(result)
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Failed to import mentors')
 } finally {
 setImporting(false)
 }
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div
 className="absolute inset-0 bg-[#0F1919]/60 backdrop-blur-sm"
 onClick={onClose}
 />
 <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
 {/* Header */}
 <div className="sticky top-0 bg-white px-6 py-5 border-b border-border flex items-center justify-between z-10 rounded-t-2xl">
 <div>
 <h2 className="text-xl font-bold text-foreground font-sans">
 Bulk Import Mentors
 </h2>
 <p className="text-sm text-primary mt-0.5">
 Upload a CSV file to import multiple mentors at once
 </p>
 </div>
 <button
 onClick={onClose}
 className="p-2 rounded-lg hover:bg-accent transition text-primary"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="p-6 space-y-6">
 {error && (
 <div className="flex items-center gap-3 p-4 rounded-xl bg-[#F5E6DE] border border-destructive/30 text-destructive text-sm">
 <XCircle className="w-5 h-5 flex-shrink-0" />
 {error}
 </div>
 )}

 {/* Template Download */}
 <div className="bg-accent border border-border rounded-xl p-4">
 <div className="flex items-start gap-3">
 <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
 <div className="flex-1">
 <h3 className="text-sm font-semibold text-foreground font-sans mb-1">
 Download CSV Template
 </h3>
 <p className="text-xs text-primary mb-3">
 Download the template to see the required format. Include columns: Full Name, Email, Bio, Background, Expertise, Hourly Rate
 </p>
 <button
 onClick={downloadTemplate}
 className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[var(--line-strong)] rounded-lg text-sm font-medium text-primary hover:bg-accent transition"
 >
 <Download className="w-4 h-4" />
 Download Template
 </button>
 </div>
 </div>
 </div>

 {/* File Upload */}
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">
 Upload CSV File
 </label>
 <div className="flex flex-col gap-3">
 <input
 ref={fileInputRef}
 type="file"
 accept=".csv"
 onChange={handleFileUpload}
 className="hidden"
 />
 <button
 onClick={() => fileInputRef.current?.click()}
 className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--line-strong)] rounded-xl hover:border-primary hover:bg-accent transition text-primary font-medium"
 >
 <Upload className="w-5 h-5" />
 {csvContent ? 'Change File' : 'Choose CSV File'}
 </button>
 {csvContent && (
 <div className="bg-success-bg border border-success/30 rounded-lg p-3 flex items-center gap-2">
 <CheckCircle className="w-4 h-4 text-success" />
 <span className="text-sm text-success font-medium">
 File loaded successfully ({parseCSV(csvContent).length} mentor{parseCSV(csvContent).length !== 1 ? 's' : ''} found)
 </span>
 </div>
 )}
 </div>
 </div>

 {/* Preview */}
 {csvContent && (
 <div>
 <label className="block text-sm font-medium text-foreground mb-2">
 Preview
 </label>
 <div className="bg-secondary border border-border rounded-xl p-4 max-h-64 overflow-auto">
 <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
 {csvContent.split('\n').slice(0, 6).join('\n')}
 {csvContent.split('\n').length > 6 && '\n...'}
 </pre>
 </div>
 </div>
 )}

 {/* Actions */}
 <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
 <button
 type="button"
 onClick={onClose}
 className="px-5 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-accent transition"
 >
 Cancel
 </button>
 <button
 onClick={handleImport}
 disabled={importing || !csvContent}
 className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#0F1919] hover:bg-[#1C2C2C] text-[#FFFBF3] shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
 >
 {importing ? (
 <>
 <Loader2 className="w-4 h-4 animate-spin" />
 Importing...
 </>
 ) : (
 <>
 <Upload className="w-4 h-4" />
 Import Mentors
 </>
 )}
 </button>
 </div>
 </div>
 </div>
 </div>
 )
}

// ─── Bulk Import Results Modal ─────────────────────────────────
function BulkImportResultsModal({
 result,
 onClose,
}: {
 result: BulkImportResult
 onClose: () => void
}) {
 const [copiedAll, setCopiedAll] = useState(false)

 const copyAllPasswords = () => {
 if (!result.passwords) return

 const text = result.passwords
 .map(p => `${p.fullName} (${p.email}): ${p.password}`)
 .join('\n')

 navigator.clipboard.writeText(text)
 setCopiedAll(true)
 setTimeout(() => setCopiedAll(false), 2000)
 }

 const downloadPasswords = () => {
 if (!result.passwords) return

 const csv = 'Full Name,Email,Temporary Password\n' +
 result.passwords.map(p => `${p.fullName},${p.email},${p.password}`).join('\n')

 const blob = new Blob([csv], { type: 'text/csv' })
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a')
 a.href = url
 a.download = 'mentor_passwords.csv'
 a.click()
 URL.revokeObjectURL(url)
 }

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div
 className="absolute inset-0 bg-[#0F1919]/60 backdrop-blur-sm"
 onClick={onClose}
 />
 <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
 {/* Header */}
 <div className="sticky top-0 bg-white px-6 py-5 border-b border-border rounded-t-2xl">
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-xl font-bold text-foreground font-sans">
 Import Results
 </h2>
 <p className="text-sm text-primary mt-0.5">
 {result.successCount} of {result.totalProcessed} mentors imported successfully
 </p>
 </div>
 <button
 onClick={onClose}
 className="p-2 rounded-lg hover:bg-accent transition text-primary"
 >
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>

 <div className="p-6 space-y-6">
 {/* Summary Stats */}
 <div className="grid grid-cols-3 gap-4">
 <div className="bg-accent border border-border rounded-xl p-4 text-center">
 <div className="text-2xl font-bold text-foreground">{result.totalProcessed}</div>
 <div className="text-xs text-primary mt-1">Total Processed</div>
 </div>
 <div className="bg-success-bg border border-success/30 rounded-xl p-4 text-center">
 <div className="text-2xl font-bold text-success">{result.successCount}</div>
 <div className="text-xs text-success mt-1">Successful</div>
 </div>
 <div className="bg-[#F5E6DE] border border-destructive/30 rounded-xl p-4 text-center">
 <div className="text-2xl font-bold text-destructive">{result.failureCount}</div>
 <div className="text-xs text-destructive mt-1">Failed</div>
 </div>
 </div>

 {/* Passwords Section */}
 {result.passwords && result.passwords.length > 0 && (
 <div>
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-semibold text-foreground font-sans">
 Temporary Passwords ({result.passwords.length})
 </h3>
 <div className="flex gap-2">
 <button
 onClick={copyAllPasswords}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--line-strong)] rounded-lg text-xs font-medium text-primary hover:bg-accent transition"
 >
 {copiedAll ? (
 <>
 <CheckCircle className="w-3.5 h-3.5" />
 Copied!
 </>
 ) : (
 <>
 <Copy className="w-3.5 h-3.5" />
 Copy All
 </>
 )}
 </button>
 <button
 onClick={downloadPasswords}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0F1919] text-[#FFFBF3] rounded-lg text-xs font-medium hover:bg-[#1C2C2C] transition"
 >
 <Download className="w-3.5 h-3.5" />
 Download CSV
 </button>
 </div>
 </div>
 <div className="bg-secondary border border-border rounded-xl p-4 max-h-64 overflow-auto space-y-2">
 {result.passwords.map((p, idx) => (
 <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-border">
 <div className="flex-1">
 <p className="text-sm font-medium text-foreground">{p.fullName}</p>
 <p className="text-xs text-[var(--fg-faint)]">{p.email}</p>
 </div>
 <code className="text-xs font-mono text-primary bg-accent px-2 py-1 rounded border border-border">
 {p.password}
 </code>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Errors Section */}
 {result.errors && result.errors.length > 0 && (
 <div>
 <h3 className="text-sm font-semibold text-destructive font-sans mb-3">
 Errors ({result.errors.length})
 </h3>
 <div className="bg-[#F5E6DE] border border-destructive/30 rounded-xl p-4 max-h-64 overflow-auto space-y-2">
 {result.errors.map((err, idx) => (
 <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-destructive/30">
 <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
 <div className="flex-1">
 <p className="text-xs font-medium text-destructive">
 Row {err.row}: {err.email}
 </p>
 <p className="text-xs text-destructive mt-0.5">{err.error}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Close Button */}
 <button
 onClick={onClose}
 className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#0F1919] hover:bg-[#1C2C2C] text-[#FFFBF3] shadow-lg transition"
 >
 Done
 </button>
 </div>
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
 const [showBulkImport, setShowBulkImport] = useState(false)
 const [bulkImportResult, setBulkImportResult] = useState<BulkImportResult | null>(null)

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

 const handleBulkImportSuccess = (result: BulkImportResult) => {
 setShowBulkImport(false)
 setBulkImportResult(result)
 showToast(
 `Successfully imported ${result.successCount} mentor(s)${result.failureCount > 0 ? `. ${result.failureCount} failed.` : ''}`,
 result.failureCount > 0 ? 'error' : 'success'
 )
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
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 </div>
 )
 }

 return (
 <div>
 {/* Toast */}
 {toast && (
 <div
 className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-300 ${toast.type === 'success'
 ? 'bg-success-bg/90 border-success/30 text-success '
 : 'bg-[#F5E6DE]/90 border-destructive/30 text-destructive '
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

 {/* Bulk Import Modal */}
 {showBulkImport && (
 <BulkImportModal
 onClose={() => setShowBulkImport(false)}
 onSuccess={handleBulkImportSuccess}
 />
 )}

 {/* Bulk Import Results Modal */}
 {bulkImportResult && (
 <BulkImportResultsModal
 result={bulkImportResult}
 onClose={() => setBulkImportResult(null)}
 />
 )}

 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
 <div>
 <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-2">
 Mentor Management
 </h1>
 <p className="text-muted-foreground">
 Review, approve, and manage all mentor accounts.
 </p>
 </div>
 <div className="flex gap-3">
 <button
 onClick={() => setShowBulkImport(true)}
 id="bulk-import-mentors"
 className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border-2 border-primary text-primary hover:bg-accent transition-all shadow-sm"
 >
 <Upload className="w-4 h-4" />
 Bulk Import
 </button>
 <button
 onClick={() => setModalMode('add')}
 id="add-new-mentor"
 className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-[#FFFBF3] bg-[#0F1919] hover:bg-[#1C2C2C] rounded-full shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1919]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
 >
 <Plus className="w-4 h-4" />
 Add New Mentor
 </button>
 </div>
 </div>

 {/* Controls Row */}
 <div className="flex flex-col sm:flex-row gap-3 mb-4">
 {/* Search */}
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--fg-faint)]" />
 <input
 type="text"
 id="search-mentors"
 placeholder="Search by name, email, or expertise..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="input-modern pl-10"
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
 className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-white text-foreground hover:bg-secondary transition text-sm"
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
 <div className="absolute right-0 mt-2 w-44 bg-white border border-border rounded-xl shadow-lg z-20 overflow-hidden">
 {(
 ['all', 'active', 'pending'] as FilterStatus[]
 ).map((status) => (
 <button
 key={status}
 onClick={() => {
 setFilterStatus(status)
 setShowStatusDropdown(false)
 }}
 className={`w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition capitalize ${filterStatus === status
 ? 'text-[#FFFBF3] font-medium bg-[#0F1919] '
 : 'text-foreground '
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
 ? 'border-[#0F1919]/20 bg-[#0F1919] text-[#FFFBF3] '
 : 'border-border bg-white text-foreground hover:bg-secondary'
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
 <div className="absolute right-0 mt-2 w-56 bg-white border border-border rounded-xl shadow-lg z-20 overflow-hidden max-h-72 overflow-y-auto">
 {allTags.length === 0 ? (
 <p className="px-4 py-3 text-sm text-primary text-center">
 No tags available
 </p>
 ) : (
 allTags.map((tag) => (
 <button
 key={tag}
 onClick={() => toggleTagFilter(tag)}
 className={`w-full text-left px-4 py-2.5 text-sm hover:bg-secondary transition flex items-center gap-2 ${filterTags.includes(tag)
 ? 'text-[#FFFBF3] font-medium bg-[#0F1919] '
 : 'text-foreground '
 } `}
 >
 <span
 className={`w-4 h-4 rounded border flex items-center justify-center transition ${filterTags.includes(tag)
 ? 'border-[#0F1919] bg-[#0F1919] '
 : 'border-[var(--line-strong)] '
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
 className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-[#F5E6DE] border border-destructive/30 transition"
 >
 <XCircle className="w-4 h-4" />
 Clear Filters
 </button>
 )}
 </div>

 {/* Active Tag Filters Display */}
 {filterTags.length > 0 && (
 <div className="flex flex-wrap items-center gap-2 mb-4">
 <span className="text-xs font-medium text-primary ">
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
 <span className="text-sm text-muted-foreground">
 Showing{' '}
 <span className="font-semibold text-foreground">
 {filteredMentors.length}
 </span>{' '}
 of {mentors.length} mentors
 </span>
 <div className="flex-1" />
 <div className="flex items-center gap-3 text-xs">
 <span className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-success" />
 Active: {mentors.filter((m) => m.is_active).length}
 </span>
 <span className="flex items-center gap-1.5">
 <span className="w-2 h-2 rounded-full bg-warning" />
 Pending: {mentors.filter((m) => !m.is_active).length}
 </span>
 </div>
 </div>

 {/* Table */}
 <div className="card-modern overflow-hidden">
 {filteredMentors.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-20 px-6">
 <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
 <AlertCircle className="w-8 h-8 text-[var(--fg-faint)]" />
 </div>
 <h3 className="text-lg font-semibold text-foreground font-sans mb-1">
 {hasActiveFilters
 ? 'No mentors found'
 : 'No mentors yet'}
 </h3>
 <p className="text-sm text-muted-foreground text-center max-w-sm">
 {hasActiveFilters
 ? 'Try adjusting your search or filter criteria.'
 : 'Click "Add New Mentor" to create your first mentor.'}
 </p>
 {!hasActiveFilters && !loading && (
 <>
 <button
 onClick={() => setModalMode('add')}
 className="mt-4 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-[#FFFBF3] bg-[#0F1919] hover:bg-[#1C2C2C] rounded-full shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1919]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
 >
 <Plus className="w-4 h-4" />
 Add New Mentor
 </button>
 <button
 onClick={() => {
 setLoading(true)
 fetchMentors()
 }}
 className="mt-2 btn-secondary"
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
 <tr className="border-b border-border">
 <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
 Mentor
 </th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
 Expertise
 </th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
 Rate
 </th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
 Total Hours
 </th>
 <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
 Status
 </th>
 <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
 Actions
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border ">
 {filteredMentors.map((mentor) => (
 <tr
 key={mentor.id}
 className="hover:bg-secondary transition-colors"
 >
 <td className="px-6 py-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-accent text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
 {mentor.full_name
 ?.charAt(0)
 ?.toUpperCase() || '?'}
 </div>
 <div>
 <p className="text-sm font-medium text-foreground">
 {mentor.full_name ||
 'Unnamed Mentor'}
 </p>
 <p className="text-xs text-[var(--fg-faint)]">
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
 <span className="inline-block px-2 py-0.5 text-xs text-primary ">
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
 <span className="text-xs text-[var(--fg-faint)] italic">
 No expertise listed
 </span>
 )}
 </div>
 </td>
 <td className="px-6 py-4">
 <span className="text-sm font-medium text-foreground">
 {mentor.hourly_rate
 ? `₹${mentor.hourly_rate}/hr`
 : '—'
 }
 </span>
 </td>
 <td className="px-6 py-4">
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent text-primary text-xs font-semibold border border-border ">
 <Clock className="w-3.5 h-3.5" />
 {mentor.total_hours?.toFixed(1) || '0'} hrs
 </span>
 </td>
 <td className="px-6 py-4">
 <StatusBadge variant={mentor.is_active ? 'completed' : 'pending'} size="sm">
 {mentor.is_active
 ? 'Active'
 : 'Pending'}
 </StatusBadge>
 </td>
 <td className="px-6 py-4 text-right">
 <DropdownMenu>
 <DropdownMenuTrigger
 id={`actions-${mentor.id}`}
 className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
 >
 <MoreVertical className="w-4 h-4" />
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-48">
 <DropdownMenuItem
 onClick={() => openEditModal(mentor)}
 >
 <Pencil className="mr-2 h-4 w-4" />
 Edit Profile
 </DropdownMenuItem>
 <DropdownMenuItem
 onClick={() => toggleMentorStatus(mentor.id, mentor.is_active)}
 disabled={actionLoading === mentor.id}
 className={mentor.is_active ? 'text-destructive focus:text-destructive' : 'text-success focus:text-success'}
 >
 {actionLoading === mentor.id ? (
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 ) : mentor.is_active ? (
 <UserX className="mr-2 h-4 w-4" />
 ) : (
 <UserCheck className="mr-2 h-4 w-4" />
 )}
 {mentor.is_active ? 'Deactivate' : 'Approve'}
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
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
