'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import {
  Users,
  Clock,
  CalendarCheck,
  TrendingUp,
  Mail,
  Loader2,
  Video,
  ArrowRight,
  Radio,
  ArrowUpRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Metrics = {
  totalMentors: number
  pendingApprovals: number
  totalBookings: number
  activeMentors: number
  authorizedStudents: number
}

type SessionInfo = {
  id: string
  studentName: string
  mentorName: string
  startTime: string
  endTime: string
  duration: number
  status: string
  meetLink: string | null
}

export default function AdminHome() {
  const { supabase, loading: authLoading } = useAuth()
  const [metrics, setMetrics] = useState<Metrics>({
    totalMentors: 0,
    pendingApprovals: 0,
    totalBookings: 0,
    activeMentors: 0,
    authorizedStudents: 0,
  })
  const [ongoingSessions, setOngoingSessions] = useState<SessionInfo[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<SessionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      fetchData()
    }
  }, [authLoading])

  const fetchData = async () => {
    try {
      // Fetch metrics
      const { count: totalMentors } = await supabase
        .from('mentors')
        .select('*', { count: 'exact', head: true })

      const { count: pendingApprovals } = await supabase
        .from('mentors')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', false)

      const { count: activeMentors } = await supabase
        .from('mentors')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })

      const { count: authorizedStudents } = await supabase
        .from('authorized_students')
        .select('*', { count: 'exact', head: true })

      setMetrics({
        totalMentors: totalMentors || 0,
        pendingApprovals: pendingApprovals || 0,
        totalBookings: totalBookings || 0,
        activeMentors: activeMentors || 0,
        authorizedStudents: authorizedStudents || 0,
      })

      // Fetch all scheduled sessions
      const { data: sessionsList } = await supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          duration_minutes,
          status,
          meet_link,
          student_profiles:profiles!bookings_student_id_fkey(full_name),
          mentor_profiles:mentors(profiles(full_name))
        `)
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true })

      if (sessionsList && Array.isArray(sessionsList)) {
        const now = new Date()
        const ongoing: SessionInfo[] = []
        const upcoming: SessionInfo[] = []

        sessionsList.forEach((s) => {
          const studentName = (s.student_profiles && typeof s.student_profiles === 'object' && 'full_name' in s.student_profiles)
            ? String(s.student_profiles.full_name || 'Unknown')
            : 'Unknown'

          const mentorName = (s.mentor_profiles && typeof s.mentor_profiles === 'object' && 'profiles' in s.mentor_profiles)
            ? ((s.mentor_profiles.profiles && typeof s.mentor_profiles.profiles === 'object' && 'full_name' in s.mentor_profiles.profiles)
              ? String(s.mentor_profiles.profiles.full_name || 'Unknown')
              : 'Unknown')
            : 'Unknown'

          const session: SessionInfo = {
            id: s.id || '',
            studentName,
            mentorName,
            startTime: s.start_time || new Date().toISOString(),
            endTime: s.end_time || new Date().toISOString(),
            duration: typeof s.duration_minutes === 'number' ? s.duration_minutes : 60,
            status: s.status || 'scheduled',
            meetLink: s.meet_link || null,
          }

          const start = new Date(session.startTime)
          const end = new Date(session.endTime)

          if (now >= start && now <= end) {
            ongoing.push(session)
          } else if (start > now) {
            upcoming.push(session)
          }
        })

        setOngoingSessions(ongoing)
        setUpcomingSessions(upcoming)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const metricCards = [
    { label: 'Total Mentors', value: metrics.totalMentors, icon: Users, color: 'blue', change: null },
    { label: 'Pending Approvals', value: metrics.pendingApprovals, icon: Clock, color: 'amber', change: null },
    { label: 'Total Sessions', value: metrics.totalBookings, icon: CalendarCheck, color: 'emerald', change: null },
    { label: 'Active Mentors', value: metrics.activeMentors, icon: TrendingUp, color: 'violet', change: '+12%' },
    { label: 'Authorized Students', value: metrics.authorizedStudents, icon: Mail, color: 'slate', change: null },
  ]

  const displayedUpcoming = showAllUpcoming ? upcomingSessions : upcomingSessions.slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-2">Dashboard</h1>
        <p className="text-slate-600">
          Welcome back. Here&apos;s an overview of your platform.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metricCards.map((card) => (
          <div key={card.label} className="card-modern p-5 hover-lift">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${
                card.color === 'blue' ? 'bg-blue-50' :
                card.color === 'amber' ? 'bg-amber-50' :
                card.color === 'emerald' ? 'bg-emerald-50' :
                card.color === 'violet' ? 'bg-violet-50' :
                'bg-slate-100'
              } flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${
                  card.color === 'blue' ? 'text-blue-600' :
                  card.color === 'amber' ? 'text-amber-600' :
                  card.color === 'emerald' ? 'text-emerald-600' :
                  card.color === 'violet' ? 'text-violet-600' :
                  'text-slate-600'
                }`} />
              </div>
              {card.change && (
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  {card.change}
                </span>
              )}
            </div>
            <p className="text-2xl font-semibold text-slate-900 mb-1">{card.value}</p>
            <p className="text-sm text-slate-600">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Ongoing Sessions */}
      {ongoingSessions.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <CardTitle className="text-base font-semibold text-slate-900">Live Sessions</CardTitle>
              <Badge variant="destructive" className="ml-auto">
                {ongoingSessions.length} active
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ongoingSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-white border border-red-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {session.studentName} <span className="font-normal text-slate-500">·</span> {session.mentorName}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatTime(session.startTime)} – {formatTime(session.endTime)} · {session.duration} min
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="animate-pulse">Live</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">Upcoming Sessions</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {upcomingSessions.length} scheduled
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <CalendarCheck className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-600">No upcoming sessions.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {displayedUpcoming.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 text-slate-600 flex items-center justify-center">
                        <CalendarCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {session.studentName} <span className="font-normal text-slate-500">·</span> {session.mentorName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatDate(session.startTime)} · {formatTime(session.startTime)} – {formatTime(session.endTime)} · {session.duration} min
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-slate-600 border-slate-300">
                      <Clock className="w-3 h-3 mr-1" />
                      Scheduled
                    </Badge>
                  </div>
                ))}
              </div>

              {upcomingSessions.length > 5 && (
                <button
                  onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                  className="w-full mt-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                >
                  {showAllUpcoming ? 'Show Less' : `Show All (${upcomingSessions.length})`}
                </button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View All Sessions CTA */}
      <Link
        href="/dashboard/admin/sessions"
        className="btn-secondary w-full justify-center"
      >
        View All Sessions
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
