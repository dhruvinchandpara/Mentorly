'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  Mail,
  UserPlus,
  Loader2,
  UserCheck,
  AlertCircle,
  ShieldCheck,
  Shield,
} from 'lucide-react'
import { grantAdminRole } from '../actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type AdminUser = {
  id: string
  full_name: string | null
  email: string | null
}

export default function ManageAdmins() {
  const { supabase, loading: authLoading } = useAuth()
  const [adminEmail, setAdminEmail] = useState('')
  const [adminActionLoading, setAdminActionLoading] = useState(false)
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) fetchAdmins()
  }, [authLoading])

  const fetchAdmins = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'admin')
        .order('full_name', { ascending: true })

      if (data) setAdmins(data)
    } catch (error) {
      console.error('Error fetching admins:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGrantAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminEmail.trim()) return

    setAdminActionLoading(true)
    setAdminMessage(null)
    try {
      const result = await grantAdminRole(adminEmail.trim().toLowerCase())
      if (result.success) {
        setAdminMessage({ type: 'success', text: result.message || 'Admin role granted!' })
        setAdminEmail('')
        fetchAdmins()
      } else {
        setAdminMessage({ type: 'error', text: result.error || 'Failed to grant admin role' })
      }
    } catch (error: any) {
      setAdminMessage({ type: 'error', text: error.message || 'An error occurred' })
    } finally {
      setAdminActionLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-blue-950 tracking-tight">Manage Admins</h1>
        <p className="text-blue-600 text-sm mt-1">Grant admin access and view existing administrators.</p>
      </div>

      {/* Grant Admin Access */}
      <Card className="border-blue-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-base text-blue-950">Grant Admin Access</CardTitle>
          </div>
          <CardDescription>
            Promote an existing user to help manage the platform. The user must have already signed up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGrantAdmin} className="flex gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
              <Input
                type="email"
                required
                placeholder="Enter user email address"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="pl-9 border-blue-200 focus-visible:ring-blue-500"
              />
            </div>
            <Button
              type="submit"
              disabled={adminActionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {adminActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Grant Access
            </Button>
          </form>

          {adminMessage && (
            <div className={`mt-4 p-4 rounded-lg flex items-center gap-3 text-sm ${adminMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
              {adminMessage.type === 'success' ? <UserCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {adminMessage.text}
            </div>
          )}

          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Important Note</h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              Promoting a user to Admin gives them full access to all data, including the ability to approve mentors, manage bookings, and authorize students.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Existing Admins */}
      <Card className="border-blue-100 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-base text-blue-950">Current Administrators</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : admins.length === 0 ? (
            <p className="text-sm text-blue-400 py-8 text-center">No administrators found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-blue-50/50 hover:bg-blue-50/50">
                  <TableHead className="text-blue-600 font-semibold">Name</TableHead>
                  <TableHead className="text-blue-600 font-semibold">Email</TableHead>
                  <TableHead className="text-blue-600 font-semibold text-right">Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id} className="hover:bg-blue-50/30">
                    <TableCell className="font-medium text-blue-950">{admin.full_name || 'Unknown'}</TableCell>
                    <TableCell className="text-blue-600">{admin.email}</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                        <Shield className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
