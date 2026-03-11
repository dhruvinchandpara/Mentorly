'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { addAuthorizedStudent, removeAuthorizedStudent, bulkAddAuthorizedStudents } from '../actions'
import {
    Users,
    Plus,
    Trash2,
    Mail,
    Search,
    Loader2,
    AlertCircle,
    CheckCircle,
    ArrowLeft,
    Upload,
    FileText,
    X
} from 'lucide-react'
import Link from 'next/link'

interface AuthorizedStudent {
    email: string
    created_at: string
}

export default function AuthorizedStudentsPage() {
    const { supabase } = useAuth()
    const [students, setStudents] = useState<AuthorizedStudent[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [newEmail, setNewEmail] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [showBulkImport, setShowBulkImport] = useState(false)
    const [bulkEmails, setBulkEmails] = useState('')
    const [bulkImportLoading, setBulkImportLoading] = useState(false)

    useEffect(() => {
        fetchStudents()
    }, [])

    const fetchStudents = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('authorized_students')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setStudents(data || [])
        } catch (error) {
            console.error('Error fetching authorized students:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newEmail.trim()) return

        setActionLoading(true)
        setMessage(null)
        try {
            const result = await addAuthorizedStudent(newEmail.trim().toLowerCase())
            if (result.success) {
                setMessage({ type: 'success', text: 'Student email added successfully!' })
                setNewEmail('')
                fetchStudents()
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to add student' })
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setActionLoading(false)
        }
    }

    const handleRemoveStudent = async (email: string) => {
        if (!confirm('Are you sure you want to remove this email? The student will no longer be able to log in.')) return

        setActionLoading(true)
        setMessage(null)
        try {
            const result = await removeAuthorizedStudent(email)
            if (result.success) {
                setMessage({ type: 'success', text: 'Student email removed successfully!' })
                fetchStudents()
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to remove student' })
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setActionLoading(false)
        }
    }

    const handleBulkImport = async () => {
        if (!bulkEmails.trim()) {
            setMessage({ type: 'error', text: 'Please enter at least one email address' })
            return
        }

        setBulkImportLoading(true)
        setMessage(null)

        try {
            // Parse emails from text (supports CSV, newline, comma, or semicolon separated)
            const emailList = bulkEmails
                .split(/[\n,;]+/)
                .map(line => {
                    // Handle CSV format: extract email from quotes or commas
                    const match = line.match(/([^\s,;"]+@[^\s,;"]+\.[^\s,;"]+)/)
                    return match ? match[1] : line.trim()
                })
                .filter(email => email.length > 0)

            const result = await bulkAddAuthorizedStudents(emailList)

            if (result.success) {
                setMessage({
                    type: 'success',
                    text: result.message || `Successfully added ${result.added} student(s)!`
                })
                setBulkEmails('')
                setShowBulkImport(false)
                fetchStudents()
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to import students' })
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setBulkImportLoading(false)
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const text = event.target?.result as string
            setBulkEmails(text)
        }
        reader.readAsText(file)
    }

    const filteredStudents = students.filter(s =>
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <Link
                        href="/dashboard/admin"
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Overview
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-indigo-600" />
                        Authorized Students
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Only students whose emails are in this list will be allowed to use the application.
                    </p>
                </div>
            </div>

            {/* Add Student Form */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mb-8">
                <form onSubmit={handleAddStudent} className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="email"
                            required
                            placeholder="student-email@university.edu"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={actionLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-70"
                    >
                        {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        Add Student
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowBulkImport(true)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-200 font-semibold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <Upload className="w-5 h-5" />
                        Bulk Import
                    </button>
                </form>

                {message && (
                    <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'
                        }`}>
                        {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {message.text}
                    </div>
                )}
            </div>

            {/* Students List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search emails..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {filteredStudents.length} Students
                    </span>
                </div>

                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {loading ? (
                        <div className="p-20 text-center">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
                            <p className="mt-4 text-slate-500">Loading student list...</p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No authorized students</h3>
                            <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">
                                {searchQuery ? 'No students match your search.' : 'Add a student email above to grant them access.'}
                            </p>
                        </div>
                    ) : (
                        filteredStudents.map((student) => (
                            <div key={student.email} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                        {student.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{student.email}</p>
                                        <p className="text-xs text-slate-500">Added on {new Date(student.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveStudent(student.email)}
                                    disabled={actionLoading}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                    title="Remove authorization"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Bulk Import Modal */}
            {showBulkImport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-10 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                    <Upload className="w-6 h-6 text-indigo-600" />
                                    Bulk Import Students
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    Import multiple student email addresses at once
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowBulkImport(false)
                                    setBulkEmails('')
                                }}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Instructions */}
                            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
                                <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Supported Formats
                                </h3>
                                <ul className="text-xs text-indigo-700 dark:text-indigo-400 space-y-1 list-disc list-inside">
                                    <li>One email per line</li>
                                    <li>Comma-separated values (CSV)</li>
                                    <li>Semicolon-separated values</li>
                                    <li>Upload a .txt or .csv file</li>
                                </ul>
                                <div className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-mono bg-white dark:bg-slate-950 p-2 rounded border border-indigo-200 dark:border-indigo-800">
                                    student1@university.edu<br />
                                    student2@university.edu<br />
                                    student3@university.edu
                                </div>
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Upload File (Optional)
                                </label>
                                <input
                                    type="file"
                                    accept=".txt,.csv"
                                    onChange={handleFileUpload}
                                    className="block w-full text-sm text-slate-500 dark:text-slate-400
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-lg file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-indigo-50 file:text-indigo-700
                                        hover:file:bg-indigo-100
                                        dark:file:bg-indigo-950/30 dark:file:text-indigo-400
                                        dark:hover:file:bg-indigo-950/50
                                        cursor-pointer"
                                />
                            </div>

                            {/* Text Area */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Email Addresses
                                </label>
                                <textarea
                                    value={bulkEmails}
                                    onChange={(e) => setBulkEmails(e.target.value)}
                                    rows={10}
                                    placeholder="student1@university.edu&#10;student2@university.edu&#10;student3@university.edu"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm font-mono resize-none"
                                />
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    {bulkEmails.split(/[\n,;]+/).filter(e => e.trim()).length} email(s) detected
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-white dark:bg-slate-900 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 rounded-b-2xl">
                            <button
                                onClick={() => {
                                    setShowBulkImport(false)
                                    setBulkEmails('')
                                }}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkImport}
                                disabled={bulkImportLoading || !bulkEmails.trim()}
                                className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {bulkImportLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Import Students
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
