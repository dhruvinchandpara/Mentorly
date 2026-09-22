'use client'

import { useState } from 'react'
import { bulkAddAuthorizedStudents } from '../../actions'
import { X, Upload, FileText, XCircle, Loader2 } from 'lucide-react'

export function BulkImportStudentsModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: (message: string) => void
}) {
  const [bulkEmails, setBulkEmails] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const handleImport = async () => {
    if (!bulkEmails.trim()) {
      setError('Please enter at least one email address')
      return
    }

    setImporting(true)
    setError(null)

    try {
      const emailList = bulkEmails
        .split(/[\n,;]+/)
        .map((line) => {
          const match = line.match(/([^\s,;"]+@[^\s,;"]+\.[^\s,;"]+)/)
          return match ? match[1] : line.trim()
        })
        .filter((email) => email.length > 0)

      const result = await bulkAddAuthorizedStudents(emailList)

      if (result.success) {
        onSuccess(result.message || `Successfully invited ${result.added} student(s)!`)
      } else {
        setError(result.error || 'Failed to import students')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import students')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1919]/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-5 border-b border-border flex items-center justify-between z-10 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-foreground font-sans flex items-center gap-3">
              <Upload className="w-6 h-6 text-primary" />
              Bulk Import Students
            </h2>
            <p className="text-sm text-primary mt-1">
              Invite multiple student emails at once — they&apos;ll be able to sign in with Google
              right away.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent text-primary transition"
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

          <div className="bg-accent border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground font-sans mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Supported Formats
            </h3>
            <ul className="text-xs text-primary space-y-1 list-disc list-inside">
              <li>One email per line</li>
              <li>Comma-separated values (CSV)</li>
              <li>Semicolon-separated values</li>
              <li>Upload a .txt or .csv file</li>
            </ul>
            <div className="mt-3 text-xs text-primary font-mono bg-white p-2 rounded border border-border">
              student1@university.edu
              <br />
              student2@university.edu
              <br />
              student3@university.edu
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Upload File (Optional)
            </label>
            <input
              type="file"
              accept=".txt,.csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-primary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-primary hover:file:bg-accent cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email Addresses
            </label>
            <textarea
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              rows={10}
              placeholder={'student1@university.edu\nstudent2@university.edu\nstudent3@university.edu'}
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-foreground placeholder-[var(--fg-faint)] focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition text-sm font-mono resize-none"
            />
            <p className="mt-2 text-xs text-primary">
              {bulkEmails.split(/[\n,;]+/).filter((e) => e.trim()).length} email(s) detected
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-border flex items-center justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-accent transition"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={importing || !bulkEmails.trim()}
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
                Import Students
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
