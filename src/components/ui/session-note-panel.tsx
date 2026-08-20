'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FileText, Lock, Loader2, Check, AlertCircle } from 'lucide-react'
import { saveSessionNote } from '@/app/dashboard/admin/actions'
import { useAuth } from '@/context/AuthContext'

interface SessionNotePanelProps {
  bookingId: string
  /** Whether the editing window has closed (locked by mentor or 24h expired) */
  isLocked: boolean
  /** Set to false for admin read-only view */
  canEdit: boolean
  /** Editor's userId — required when canEdit is true */
  editorId?: string
  initialContent: string | null
  lastEditedByName: string | null
  lastEditedAt: string | null
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function SessionNotePanel({
  bookingId,
  isLocked,
  canEdit,
  editorId,
  initialContent,
  lastEditedByName,
  lastEditedAt,
}: SessionNotePanelProps) {
  const { supabase } = useAuth()
  const [content, setContent] = useState(initialContent || '')
  const [editorName, setEditorName] = useState(lastEditedByName)
  const [editorAt, setEditorAt] = useState(lastEditedAt)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const saveStateRef = useRef(saveState)
  useEffect(() => {
    saveStateRef.current = saveState
  }, [saveState])

  // Sync initial content from props when changed externally (if not currently saving)
  useEffect(() => {
    if (saveStateRef.current !== 'saving') {
      setContent(initialContent || '')
    }
  }, [initialContent])

  useEffect(() => {
    setEditorName(lastEditedByName)
    setEditorAt(lastEditedAt)
  }, [lastEditedByName, lastEditedAt])

  // Real-time Supabase subscription + 3s polling for live co-authoring sync
  useEffect(() => {
    if (!bookingId || !supabase) return

    // 3-second polling to ensure instant syncing across browsers
    const pollInterval = setInterval(async () => {
      if (saveStateRef.current === 'saving') return
      try {
        const { data } = await supabase
          .from('session_notes')
          .select('content, last_edited_at, editor_profile:profiles!session_notes_last_edited_by_fkey(full_name)')
          .eq('booking_id', bookingId)
          .maybeSingle()

        if (data) {
          if (typeof data.content === 'string') {
            setContent(data.content)
          }
          if (data.editor_profile && typeof data.editor_profile === 'object' && 'full_name' in data.editor_profile) {
            setEditorName(String(data.editor_profile.full_name))
          }
          if (data.last_edited_at) {
            setEditorAt(String(data.last_edited_at))
          }
        }
      } catch (e) {
        // Silent catch for background poll
      }
    }, 3000)

    // Supabase Realtime channel listener
    const channel = supabase
      .channel(`session_notes_${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_notes',
          filter: `booking_id=eq.${bookingId}`,
        },
        async (payload: any) => {
          if (saveStateRef.current === 'saving') return
          if (payload.new) {
            if (typeof payload.new.content === 'string') {
              setContent(payload.new.content)
            }
            if (payload.new.last_edited_at) {
              setEditorAt(payload.new.last_edited_at)
            }
          }
        }
      )
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [bookingId, supabase])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  const doSave = useCallback(async (value: string) => {
    if (!editorId) return
    setSaveState('saving')
    setErrorMsg(null)
    const res = await saveSessionNote(bookingId, value, editorId)
    if (res.success) {
      setSaveState('saved')
      setEditorAt(new Date().toISOString())
      setTimeout(() => setSaveState('idle'), 2000)
    } else {
      setSaveState('error')
      setErrorMsg(res.error || 'Failed to save.')
    }
  }, [bookingId, editorId])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContent(val)
    setSaveState('idle')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSave(val), 800)
  }

  // Cleanup debounce on unmount
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  const readonly = isLocked || !canEdit

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Shared Session Note
          </span>
          {isLocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
              <Lock className="w-2.5 h-2.5" />
              Locked
            </span>
          )}
        </div>

        {/* Save state indicator */}
        {canEdit && !isLocked && (
          <div className="flex items-center gap-1.5">
            {saveState === 'saving' && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving…
              </span>
            )}
            {saveState === 'saved' && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <Check className="w-3 h-3" />
                Saved
              </span>
            )}
            {saveState === 'error' && (
              <span className="flex items-center gap-1 text-[11px] text-rose-600 font-medium">
                <AlertCircle className="w-3 h-3" />
                {errorMsg}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Note body */}
      <div className="p-4">
        {readonly ? (
          // Read-only view
          content ? (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">
              No tasks were noted for this session.
            </p>
          )
        ) : (
          // Editable textarea
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            placeholder="Write shared tasks, to-dos, or key takeaways for this session..."
            rows={3}
            className="w-full resize-none text-sm text-slate-700 bg-transparent border-none outline-none placeholder:text-slate-400 leading-relaxed"
          />
        )}

        {/* Last-edited metadata */}
        {(editorName || editorAt) && (
          <p className="mt-3 text-[10px] text-slate-400">
            Last edited{editorName ? ` by ${editorName}` : ''}
            {editorAt ? ` · ${timeAgo(editorAt)}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}

