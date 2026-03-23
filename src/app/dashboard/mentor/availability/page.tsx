'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import {
  Clock, Calendar, Save, Loader2, ChevronLeft, ChevronRight, X, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface AvailabilitySlot {
  id?: string
  day_of_week: number | null
  start_time: string
  end_time: string
  specific_date: string | null
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function AvailabilityPage() {
  const { profile, supabase } = useAuth()
  const [availability, setAvailability] = useState<Record<number, AvailabilitySlot>>({})
  const [customAvailability, setCustomAvailability] = useState<AvailabilitySlot[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [viewMonth, setViewMonth] = useState(new Date().getMonth())
  const [viewYear, setViewYear] = useState(new Date().getFullYear())

  const fetchAvailability = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    try {
      const { data: availData } = await supabase
        .from('availability')
        .select('*')
        .eq('mentor_id', profile.id)

      if (availData) {
        const weekly: Record<number, AvailabilitySlot> = {}
        const custom: AvailabilitySlot[] = []
        availData.forEach((slot: any) => {
          const parsed = {
            id: slot.id,
            day_of_week: slot.day_of_week,
            start_time: slot.start_time.substring(0, 5),
            end_time: slot.end_time.substring(0, 5),
            specific_date: slot.specific_date
          }
          if (slot.specific_date) {
            custom.push(parsed)
          } else if (slot.day_of_week !== null) {
            weekly[slot.day_of_week] = {
              ...parsed,
              specific_date: null
            }
          }
        })
        setAvailability(weekly)
        setCustomAvailability(custom)
      }
    } catch (err: any) {
      console.error('Error fetching availability:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, profile])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  const toggleDay = (dayIndex: number) => {
    const newAvail = { ...availability }
    if (newAvail[dayIndex]) delete newAvail[dayIndex]
    else newAvail[dayIndex] = { day_of_week: dayIndex, start_time: '09:00', end_time: '17:00', specific_date: null }
    setAvailability(newAvail)
  }

  const updateTime = (dayIndex: number, field: 'start_time' | 'end_time', value: string) => {
    if (!availability[dayIndex]) return
    setAvailability({ ...availability, [dayIndex]: { ...availability[dayIndex], [field]: value } })
  }

  const addCustomSlot = (date: Date) => {
    // Format date as YYYY-MM-DD without timezone conversion
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const newSlot: AvailabilitySlot = {
      day_of_week: null,
      start_time: '09:00',
      end_time: '10:00',
      specific_date: dateStr
    }
    setCustomAvailability([...customAvailability, newSlot])
  }

  const removeCustomSlot = (index: number) => {
    setCustomAvailability(customAvailability.filter((_, i) => i !== index))
  }

  const updateCustomTime = (index: number, field: 'start_time' | 'end_time', value: string) => {
    const updated = [...customAvailability]
    updated[index] = { ...updated[index], [field]: value }
    setCustomAvailability(updated)
  }

  const saveAvailability = async () => {
    if (!profile?.id) return
    setSaving(true)
    try {
      // Delete all current availability and re-insert
      const { error: deleteError } = await supabase.from('availability').delete().eq('mentor_id', profile.id)
      if (deleteError) throw deleteError

      const recurring = Object.values(availability).map(slot => ({
        mentor_id: profile.id,
        day_of_week: slot.day_of_week,
        start_time: `${slot.start_time}:00`,
        end_time: `${slot.end_time}:00`,
        specific_date: null
      }))

      const custom = customAvailability.map(slot => ({
        mentor_id: profile.id,
        day_of_week: null,
        start_time: `${slot.start_time}:00`,
        end_time: `${slot.end_time}:00`,
        specific_date: slot.specific_date
      }))

      const slotsToInsert = [...recurring, ...custom]

      if (slotsToInsert.length > 0) {
        const { error } = await supabase.from('availability').insert(slotsToInsert)
        if (error) throw error
      }

      alert('Availability saved successfully!')
      await fetchAvailability()
    } catch (err: any) {
      console.error('Error saving availability:', err)
      alert(`Failed to save: ${err.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Availability</h1>
        <p className="text-slate-600 text-sm mt-1.5">
          Set your weekly recurring schedule and add date-specific availability.
        </p>
      </div>

      {/* Side-by-side layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Recurring Schedule */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Weekly Recurring Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {DAYS_OF_WEEK.map((day, index) => {
              const isAvailable = !!availability[index]
              return (
                <div key={day} className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${isAvailable ? 'bg-slate-50 border-blue-200' : 'bg-transparent border-slate-100'}`}>
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <input
                      type="checkbox"
                      id={`day-${index}`}
                      checked={isAvailable}
                      onChange={() => toggleDay(index)}
                      className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                    />
                    <label htmlFor={`day-${index}`} className={`text-sm font-medium cursor-pointer ${isAvailable ? 'text-slate-900' : 'text-slate-500'}`}>
                      {day.substring(0, 3)}
                    </label>
                  </div>
                  <div className={`flex items-center gap-2 flex-1 transition-opacity duration-200 ${isAvailable ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                    <input
                      type="time"
                      value={availability[index]?.start_time || '09:00'}
                      onChange={(e) => updateTime(index, 'start_time', e.target.value)}
                      className="w-28 bg-white border border-blue-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <span className="text-slate-400 text-sm">-</span>
                    <input
                      type="time"
                      value={availability[index]?.end_time || '17:00'}
                      onChange={(e) => updateTime(index, 'end_time', e.target.value)}
                      className="w-28 bg-white border border-blue-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              )
            })}
            <div className="pt-3">
              <Button onClick={saveAvailability} disabled={saving} size="sm" className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Schedule
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Date-Specific Slots */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Date-Specific Availability
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Mini Calendar */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
              <div className="flex justify-between items-center mb-2.5">
                <h3 className="text-sm font-semibold text-slate-900">{monthNames[viewMonth]} {viewYear}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      if (viewMonth === 0) {
                        setViewMonth(11)
                        setViewYear(v => v - 1)
                      } else {
                        setViewMonth(v => v - 1)
                      }
                    }}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (viewMonth === 11) {
                        setViewMonth(0)
                        setViewYear(v => v + 1)
                      } else {
                        setViewMonth(v => v + 1)
                      }
                    }}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-xs font-bold text-slate-400 uppercase">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: getFirstDayOfMonth(viewYear, viewMonth) }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: getDaysInMonth(viewYear, viewMonth) }).map((_, i) => {
                  const day = i + 1
                  const dateObj = new Date(viewYear, viewMonth, day)
                  // Use local date format to avoid timezone shifts
                  const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const selectedDateStr = selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : ''
                  const isSelected = selectedDateStr === dateStr
                  const hasSlots = customAvailability.some(s => s.specific_date === dateStr)
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(dateObj)}
                      className={`aspect-square flex flex-col items-center justify-center rounded text-sm transition-all relative ${isSelected ? 'bg-blue-600 text-white font-bold' : 'hover:bg-blue-50'}`}
                    >
                      {day}
                      {hasSlots && <div className={`w-1 h-1 rounded-full absolute bottom-1 ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected Day Slots */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold text-slate-800">
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </h4>
                <Button
                  onClick={() => addCustomSlot(selectedDate)}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2.5"
                >
                  + Add
                </Button>
              </div>

              {customAvailability.filter(s => {
                const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                return s.specific_date === selectedDateStr
              }).length === 0 ? (
                <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">
                    No slots for this date
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customAvailability.map((slot, index) => {
                    const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                    if (slot.specific_date !== selectedDateStr) return null
                    return (
                      <div key={index} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 group">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <input
                          type="time"
                          value={slot.start_time}
                          onChange={(e) => updateCustomTime(index, 'start_time', e.target.value)}
                          className="bg-transparent border-none p-0 text-sm focus:ring-0 w-24"
                        />
                        <span className="text-slate-400 text-sm">-</span>
                        <input
                          type="time"
                          value={slot.end_time}
                          onChange={(e) => updateCustomTime(index, 'end_time', e.target.value)}
                          className="bg-transparent border-none p-0 text-sm focus:ring-0 w-24"
                        />
                        <button
                          onClick={() => removeCustomSlot(index)}
                          className="ml-auto opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200">
              <Button onClick={saveAvailability} disabled={saving} size="sm" className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save All
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
