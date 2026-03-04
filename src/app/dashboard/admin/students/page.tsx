'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { addAuthorizedStudent, removeAuthorizedStudent } from '../actions'
import {
    Users,
    Plus,
    Trash2,
    Mail,
    Search,
    Loader2,
    AlertCircle,
    CheckCircle,
    ArrowLeft
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
                        Add Authorized Student
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
        </div>
    )
}
