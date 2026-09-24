'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { PERMISSION_OPTIONS } from '../user-constants'
import type { UserRole } from '../user-constants'
import { UserModal } from './components/user-modal'
import { BulkImportMentorsModal, BulkImportMentorsResultsModal } from './components/bulk-import-mentors-modal'
import { BulkImportStudentsModal } from './components/bulk-import-students-modal'
import type { BulkImportResult } from '../actions'
import type { ProfileRow, UserRow } from './types'
import {
  Search,
  Plus,
  Pencil,
  Loader2,
  CheckCircle,
  XCircle,
  Users as UsersIcon,
  Upload,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type { UserRow, ProfileRow } from './types'

type RoleFilter = 'all' | UserRole

type ModalMode = 'add' | 'edit' | null

const ITEMS_PER_PAGE = 10

const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_OPTIONS.map((o) => [o.value, o.label])
)

function renderStatus(u: UserRow) {
  if (u.kind === 'invite') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] text-xs font-semibold bg-[#FBF7D9] text-[#0F1919] border border-[#0F1919]/10">
        <Clock className="w-3 h-3" />
        Invited
      </span>
    )
  }

  if (u.role === 'student') {
    return u.is_authorized ? (
      <StatusBadge variant="active" size="sm">
        Authorized
      </StatusBadge>
    ) : (
      <StatusBadge variant="pending" size="sm">
        Not authorized
      </StatusBadge>
    )
  }

  if (u.role === 'mentor') {
    return u.is_active ? (
      <StatusBadge variant="active" size="sm">
        Active
      </StatusBadge>
    ) : (
      <span className="text-sm text-muted-foreground">Inactive</span>
    )
  }

  const labels = (u.permissions || []).map((p) => PERMISSION_LABELS[p] || p)
  return (
    <span className="text-sm text-muted-foreground">
      {labels.length > 0 ? labels.join(', ') : 'No permissions assigned'}
    </span>
  )
}

export default function UsersPage() {
  const { supabase, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [showBulkMentors, setShowBulkMentors] = useState(false)
  const [showBulkStudents, setShowBulkStudents] = useState(false)
  const [bulkMentorResult, setBulkMentorResult] = useState<BulkImportResult | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const [{ data: profiles, error: profilesError }, { data: invites, error: authError }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select(
              'id, full_name, email, role, is_authorized, bio, background, hourly_rate, expertise_tags, is_active, permissions, created_at'
            )
            .order('created_at', { ascending: false }),
          supabase
            .from('authorized_users')
            .select(
              'email, role, full_name, bio, background, hourly_rate, expertise_tags, is_active, permissions, created_at'
            ),
        ])

      if (profilesError) throw profilesError
      if (authError) throw authError

      const profileRows: ProfileRow[] = ((profiles as ProfileRow[]) || []).map((p) => ({
        ...p,
        kind: 'profile',
      }))

      const profileEmails = new Set(
        profileRows.map((p) => p.email?.toLowerCase()).filter(Boolean)
      )

      type InviteQueryRow = {
        email: string
        role: UserRole
        full_name: string | null
        bio: string | null
        background: string | null
        hourly_rate: number | null
        expertise_tags: string[] | null
        is_active: boolean
        permissions: string[] | null
        created_at: string
      }

      const inviteRows: UserRow[] = ((invites as InviteQueryRow[]) || [])
        .filter((a) => !profileEmails.has(a.email.toLowerCase()))
        .map((a) => ({
          ...a,
          kind: 'invite',
          id: null,
          is_authorized: true,
        }))

      setUsers([...profileRows, ...inviteRows])
    } catch (error: unknown) {
      console.error('Error fetching users:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      showToast(`Failed to load users: ${message}. Please refresh the page.`, 'error')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (!authLoading) {
      fetchUsers()
    }
  }, [authLoading, fetchUsers])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return users.filter((u) => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter
      const matchesSearch =
        !query ||
        u.full_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
      return matchesRole && matchesSearch
    })
  }, [users, roleFilter, searchQuery])

  // Reset to page 1 when the filtered set changes
  useEffect(() => {
    setCurrentPage(1)
  }, [roleFilter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedUsers = filteredUsers.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  )

  const openAddModal = () => {
    setEditingUser(null)
    setModalMode('add')
  }

  const openEditModal = (u: UserRow) => {
    setEditingUser(u)
    setModalMode('edit')
  }

  const handleModalSuccess = (message: string) => {
    setModalMode(null)
    setEditingUser(null)
    showToast(message, 'success')
    setLoading(true)
    fetchUsers()
  }

  const handleBulkMentorSuccess = (result: BulkImportResult) => {
    setShowBulkMentors(false)
    setBulkMentorResult(result)
    showToast(
      `Successfully imported ${result.successCount} mentor(s)${result.failureCount > 0 ? `. ${result.failureCount} failed.` : ''}`,
      result.failureCount > 0 ? 'error' : 'success'
    )
    setLoading(true)
    fetchUsers()
  }

  const handleBulkStudentSuccess = (message: string) => {
    setShowBulkStudents(false)
    showToast(message, 'success')
    setLoading(true)
    fetchUsers()
  }

  const tabs: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'student', label: 'Students' },
    { key: 'mentor', label: 'Mentors' },
    { key: 'admin', label: 'Admins' },
  ]

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
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-success-bg/90 border-success/30 text-success'
              : 'bg-[#F5E6DE]/90 border-destructive/30 text-destructive'
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
        <UserModal
          mode={modalMode}
          user={editingUser}
          onClose={() => {
            setModalMode(null)
            setEditingUser(null)
          }}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Bulk import modals */}
      {showBulkMentors && (
        <BulkImportMentorsModal
          onClose={() => setShowBulkMentors(false)}
          onSuccess={handleBulkMentorSuccess}
        />
      )}
      {bulkMentorResult && (
        <BulkImportMentorsResultsModal
          result={bulkMentorResult}
          onClose={() => setBulkMentorResult(null)}
        />
      )}
      {showBulkStudents && (
        <BulkImportStudentsModal
          onClose={() => setShowBulkStudents(false)}
          onSuccess={handleBulkStudentSuccess}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-2">Users</h1>
          <p className="text-muted-foreground">
            Manage students, mentors, and admins from one place.
          </p>
        </div>
        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              id="bulk-import"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border-2 border-primary text-primary hover:bg-accent transition-all shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Bulk Import
              <ChevronDown className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setShowBulkMentors(true)}>
                Import Mentors (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowBulkStudents(true)}>
                Import Students (Emails)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={openAddModal}
            id="add-user"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-[#FFFBF3] bg-[#0F1919] hover:bg-[#1C2C2C] rounded-full shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1919]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Invite user
          </button>
        </div>
      </div>

      {/* Segmented role filter */}
      <div className="inline-flex p-1 bg-[#FBF4D7] rounded-full mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRoleFilter(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              roleFilter === tab.key ? 'bg-[#0F1919] text-[#FFFBF3]' : 'text-[#4A5454]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--fg-faint)]" />
        <input
          type="text"
          id="search-users"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-modern pl-10"
        />
      </div>

      {/* Table */}
      <div className="card-modern overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <UsersIcon className="w-8 h-8 text-[var(--fg-faint)]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground font-sans mb-1">No users found</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchQuery || roleFilter !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Click "Invite user" to invite the first account.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" id="users-table">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Role
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedUsers.map((u) => (
                  <tr key={u.id ?? `invite:${u.email}`} className="hover:bg-secondary transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent text-primary flex items-center justify-center font-semibold text-sm flex-shrink-0">
                          {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {u.full_name || (u.kind === 'invite' ? '—' : 'Unnamed User')}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-foreground">{u.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="capitalize">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">{renderStatus(u)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEditModal(u)}
                        id={`edit-${u.id ?? u.email}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary hover:bg-accent transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-6 border-t border-border/80">
            <p className="text-sm text-muted-foreground">
              Showing {(safePage - 1) * ITEMS_PER_PAGE + 1} to{' '}
              {Math.min(safePage * ITEMS_PER_PAGE, filteredUsers.length)} of{' '}
              {filteredUsers.length} users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-white border border-border/60 rounded-[14px] hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 text-sm font-medium rounded-[14px] transition-colors ${
                      safePage === page
                        ? 'bg-[#0F1919] text-[#FFFBF3]'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground bg-white border border-border/60 rounded-[14px] hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
