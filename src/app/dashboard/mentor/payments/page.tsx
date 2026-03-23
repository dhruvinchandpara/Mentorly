'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, TrendingUp, Clock, Calendar, Loader2, Search
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface Booking {
  id: string
  student_id: string
  start_time: string
  duration_minutes: number
  status: string
  profiles: { full_name: string }
}

interface MentorProfile {
  hourly_rate: number
}

export default function PaymentsPage() {
  const { profile, supabase } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      // Fetch mentor profile for hourly rate
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('hourly_rate')
        .eq('id', profile.id)
        .single()

      setMentorProfile(mentorData)

      // Fetch completed bookings
      const { data: bookingData } = await supabase
        .from('bookings')
        .select(`
          id, student_id, start_time, duration_minutes, status,
          profiles!bookings_student_id_fkey(full_name)
        `)
        .eq('mentor_id', profile.id)
        .eq('status', 'completed')
        .order('start_time', { ascending: false })

      setBookings(bookingData || [])
    } catch (err: any) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, profile])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const hourlyRate = mentorProfile?.hourly_rate || 0

  // Calculate earnings
  const totalEarned = bookings.reduce((sum, booking) => {
    const duration = booking.duration_minutes || 60
    const earned = (hourlyRate * duration) / 60
    return sum + earned
  }, 0)

  // Current month earnings
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthBookings = bookings.filter(b =>
    new Date(b.start_time) >= currentMonthStart
  )
  const currentMonthEarnings = currentMonthBookings.reduce((sum, booking) => {
    const duration = booking.duration_minutes || 60
    const earned = (hourlyRate * duration) / 60
    return sum + earned
  }, 0)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  // Filter bookings by search
  const filteredBookings = searchQuery
    ? bookings.filter(b =>
        b.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : bookings

  // Calculate last 6 months data for graphs
  const getLast6MonthsData = () => {
    const months = []
    const monthlyData: Record<string, { earnings: number; sessions: number }> = {}

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      months.push(monthKey)
      monthlyData[monthKey] = { earnings: 0, sessions: 0 }
    }

    bookings.forEach(booking => {
      const bookingDate = new Date(booking.start_time)
      const monthKey = bookingDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

      if (monthlyData[monthKey]) {
        const duration = booking.duration_minutes || 60
        const earned = (hourlyRate * duration) / 60
        monthlyData[monthKey].earnings += earned
        monthlyData[monthKey].sessions += 1
      }
    })

    return { months, data: monthlyData }
  }

  const { months, data: monthlyData } = getLast6MonthsData()
  const maxEarnings = Math.max(...months.map(m => monthlyData[m].earnings), 1)
  const maxSessions = Math.max(...months.map(m => monthlyData[m].sessions), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Payments</h1>
        <p className="text-slate-600 text-sm mt-1.5">
          Track your earnings and payment history.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Current Month Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">₹{Math.round(currentMonthEarnings).toLocaleString('en-IN')}</p>
                <p className="text-xs text-slate-500 mt-1">From {currentMonthBookings.length} sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">₹{Math.round(totalEarned).toLocaleString('en-IN')}</p>
                <p className="text-xs text-slate-500 mt-1">Since joining</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings & Sessions Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart - Monthly Earnings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Monthly Earnings (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-56 pt-4">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-[10px] text-slate-500">
                <span>₹{Math.round(maxEarnings / 1000)}k</span>
                <span>₹{Math.round(maxEarnings / 2000)}k</span>
                <span>₹0</span>
              </div>

              {/* Chart area */}
              <div className="ml-12 h-full relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between mb-8">
                  <div className="border-t border-slate-200"></div>
                  <div className="border-t border-slate-200"></div>
                  <div className="border-t border-slate-200"></div>
                </div>

                {/* SVG Line Chart */}
                <div className="absolute inset-0 mb-8">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgb(37, 99, 235)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="rgb(37, 99, 235)" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>

                    {/* Area under line */}
                    <path
                      d={`M ${months.map((month, i) => {
                        const x = (i / (months.length - 1)) * 100
                        const earnings = monthlyData[month].earnings
                        const y = 100 - ((earnings / maxEarnings) * 100 || 0)
                        return `${i === 0 ? 'M' : 'L'} ${x},${y}`
                      }).join(' ')} L 100,100 L 0,100 Z`}
                      fill="url(#lineGradient)"
                    />

                    {/* Line */}
                    <polyline
                      points={months.map((month, i) => {
                        const x = (i / (months.length - 1)) * 100
                        const earnings = monthlyData[month].earnings
                        const y = 100 - ((earnings / maxEarnings) * 100 || 0)
                        return `${x},${y}`
                      }).join(' ')}
                      fill="none"
                      stroke="rgb(37, 99, 235)"
                      strokeWidth="0.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>

                {/* Interactive overlay with data points */}
                <div className="absolute inset-0 mb-8 flex">
                  {months.map((month, i) => {
                    const earnings = monthlyData[month].earnings
                    const sessions = monthlyData[month].sessions
                    const yPercent = maxEarnings > 0 ? ((earnings / maxEarnings) * 100) : 0
                    const isHovered = hoveredMonth === month
                    const xPercent = (i / (months.length - 1)) * 100

                    return (
                      <div
                        key={month}
                        className="absolute top-0 bottom-0 flex flex-col justify-end items-center cursor-pointer group"
                        style={{
                          left: `${xPercent}%`,
                          transform: 'translateX(-50%)',
                          width: '60px'
                        }}
                        onMouseEnter={() => setHoveredMonth(month)}
                        onMouseLeave={() => setHoveredMonth(null)}
                      >
                        {/* Tooltip */}
                        {isHovered && (
                          <div className="absolute bottom-full mb-2 bg-slate-900 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap z-10 shadow-lg">
                            <div className="font-semibold text-blue-300">{month}</div>
                            <div className="mt-1">₹{Math.round(earnings).toLocaleString('en-IN')}</div>
                            <div className="text-slate-300 text-[10px]">{sessions} session{sessions !== 1 ? 's' : ''}</div>
                            {/* Arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                            </div>
                          </div>
                        )}

                        {/* Hover area and data point */}
                        <div
                          className="w-full flex justify-center items-end"
                          style={{ height: `${100 - yPercent}%` }}
                        >
                          <div
                            className={`w-3 h-3 rounded-full bg-white border-2 transition-all ${
                              isHovered
                                ? 'border-blue-600 scale-150 shadow-lg'
                                : 'border-blue-500 group-hover:scale-125'
                            }`}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-slate-500">
                  {months.map(month => (
                    <span key={month} className="flex-1 text-center">{month}</span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart - Sessions Completed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Sessions Completed (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-56 pt-4">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-[10px] text-slate-500">
                <span>{Math.ceil(maxSessions)}</span>
                <span>{Math.ceil(maxSessions / 2)}</span>
                <span>0</span>
              </div>

              {/* Chart area */}
              <div className="ml-12 h-full relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between mb-8">
                  <div className="border-t border-slate-200"></div>
                  <div className="border-t border-slate-200"></div>
                  <div className="border-t border-slate-200"></div>
                </div>

                {/* Bars container */}
                <div className="absolute inset-0 mb-8 flex items-end justify-between gap-2 px-2">
                  {months.map(month => {
                    const sessions = monthlyData[month].sessions
                    const heightPercent = maxSessions > 0 ? (sessions / maxSessions) * 100 : 0

                    return (
                      <div key={month} className="flex-1 flex flex-col items-center justify-end h-full group">
                        {/* Value label on hover */}
                        {sessions > 0 && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-1 text-[10px] font-semibold text-emerald-700 bg-white px-1 rounded">
                            {sessions}
                          </div>
                        )}
                        {/* Bar */}
                        <div
                          className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t transition-all group-hover:from-emerald-700 group-hover:to-emerald-500"
                          style={{
                            height: `${heightPercent}%`,
                            minHeight: sessions > 0 ? '8px' : '0px'
                          }}
                          title={`${month}: ${sessions} sessions`}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-slate-500 px-2">
                  {months.map(month => (
                    <span key={month} className="flex-1 text-center">{month}</span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Session Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Per-Session Breakdown</CardTitle>
            <p className="text-xs text-slate-500">{filteredBookings.length} completed sessions</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Session List */}
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {searchQuery ? 'No sessions match your search.' : 'No completed sessions yet.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredBookings.map(booking => {
                const studentName = booking.profiles?.full_name || 'Unknown Student'
                const duration = booking.duration_minutes || 60
                const earned = Math.round((hourlyRate * duration) / 60)

                return (
                  <div key={booking.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{studentName}</p>
                        <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(booking.start_time)}
                          <Clock className="w-3 h-3 ml-2" />
                          {duration} min
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">₹{earned.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-slate-500">@₹{hourlyRate}/hr</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {filteredBookings.length > 10 && (
            <p className="text-xs text-slate-500 text-center pt-4">
              💡 Tip: Payments are processed at month-end
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
