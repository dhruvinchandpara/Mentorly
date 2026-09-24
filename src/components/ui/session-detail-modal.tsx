'use client'

import { Calendar, Clock, BookOpen, ListChecks } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/status-badge'

export type SessionDetail = {
  mentorName: string
  startTime: string
  endTime: string
  durationMinutes: number
  status: 'completed' | 'rejected' | 'cancelled'
  rejectionReason?: string | null
  keyInsights?: string | null
  studentActionables?: string | null
}

type SessionDetailModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: SessionDetail | null
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

const formatTime = (d: string) =>
  new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

export function SessionDetailModal({ open, onOpenChange, session }: SessionDetailModalProps) {
  if (!session) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-[20px] border border-[#E8E1D2] ring-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#0F1919] font-semibold">
            Session with {session.mentorName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#4A5454]">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(session.startTime)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(session.startTime)} – {formatTime(session.endTime)} ({session.durationMinutes} min)
          </span>
          {session.status === 'completed' && <StatusBadge variant="completed">Completed</StatusBadge>}
          {session.status === 'rejected' && <StatusBadge variant="rejected">Rejected by Admin</StatusBadge>}
          {session.status === 'cancelled' && <StatusBadge variant="cancelled">Cancelled</StatusBadge>}
        </div>

        {session.status === 'rejected' && session.rejectionReason && (
          <div className="text-sm text-destructive bg-[#F5E6DE] border border-destructive/20 p-3 rounded-[12px]">
            <span className="font-semibold">Reason: </span>
            {session.rejectionReason}
          </div>
        )}

        {session.status === 'completed' && (
          <div className="space-y-3">
            <div className="rounded-[14px] border border-[#E8E1D2] bg-[#FBF4D7]/40 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#4A5454] uppercase tracking-wide">
                <BookOpen className="w-3.5 h-3.5" />
                What happened in this session
              </p>
              <p className="mt-2 text-sm text-[#0F1919] leading-relaxed whitespace-pre-wrap">
                {session.keyInsights || 'The mentor did not leave a summary for this session.'}
              </p>
            </div>

            <div className="rounded-[14px] border border-[#E8E1D2] bg-[#FBF4D7]/40 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#4A5454] uppercase tracking-wide">
                <ListChecks className="w-3.5 h-3.5" />
                Key actionables
              </p>
              <p className="mt-2 text-sm text-[#0F1919] leading-relaxed whitespace-pre-wrap">
                {session.studentActionables || 'No actionables were noted for this session.'}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
