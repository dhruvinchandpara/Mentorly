'use client'

import { useRef, useState } from 'react'
import { bulkImportMentors } from '../../actions'
import type { BulkImportMentorInput, BulkImportResult } from '../../actions'
import {
  X,
  Upload,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'

function parseCSV(csv: string): BulkImportMentorInput[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []

  const mentors: BulkImportMentorInput[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const fields: string[] = []
    let currentField = ''
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim())
        currentField = ''
      } else {
        currentField += char
      }
    }
    fields.push(currentField.trim())

    const [fullName, email, bio, background, expertiseStr, hourlyRateStr] = fields

    mentors.push({
      fullName: fullName || '',
      email: email || '',
      bio: bio || '',
      background: background || '',
      expertise: expertiseStr
        ? expertiseStr.split(',').map((e) => e.trim()).filter(Boolean)
        : [],
      hourlyRate: hourlyRateStr ? parseFloat(hourlyRateStr) : undefined,
    })
  }

  return mentors
}

export function BulkImportMentorsModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: (result: BulkImportResult) => void
}) {
  const [csvContent, setCsvContent] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const template = `Full Name,Email,Bio,Background,Expertise,Hourly Rate
John Doe,john@example.com,Product Manager with 10 years experience,Former PM at Google and Meta,"Product Management,Strategy,Leadership",150
Jane Smith,jane@example.com,Senior Engineer specializing in AI,PhD in ML from Stanford,"Engineering,AI/ML,Data Science",200`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mentor_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setCsvContent(content)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!csvContent.trim()) {
      setError('Please upload a CSV file first')
      return
    }

    setImporting(true)
    setError(null)

    try {
      const mentors = parseCSV(csvContent)

      if (mentors.length === 0) {
        setError('No valid mentor data found in CSV')
        setImporting(false)
        return
      }

      const result = await bulkImportMentors(mentors)
      onSuccess(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import mentors')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0F1919]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-5 border-b border-border flex items-center justify-between z-10 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-foreground font-sans">Bulk Import Mentors</h2>
            <p className="text-sm text-primary mt-0.5">
              Upload a CSV file to import multiple mentors at once
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent transition text-primary">
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
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground font-sans mb-1">
                  Download CSV Template
                </h3>
                <p className="text-xs text-primary mb-3">
                  Include columns: Full Name, Email, Bio, Background, Expertise, Hourly Rate
                </p>
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-[var(--line-strong)] rounded-lg text-sm font-medium text-primary hover:bg-accent transition"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Upload CSV File
            </label>
            <div className="flex flex-col gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[var(--line-strong)] rounded-xl hover:border-primary hover:bg-accent transition text-primary font-medium"
              >
                <Upload className="w-5 h-5" />
                {csvContent ? 'Change File' : 'Choose CSV File'}
              </button>
              {csvContent && (
                <div className="bg-success-bg border border-success/30 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm text-success font-medium">
                    File loaded successfully ({parseCSV(csvContent).length} mentor
                    {parseCSV(csvContent).length !== 1 ? 's' : ''} found)
                  </span>
                </div>
              )}
            </div>
          </div>

          {csvContent && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Preview</label>
              <div className="bg-secondary border border-border rounded-xl p-4 max-h-64 overflow-auto">
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                  {csvContent.split('\n').slice(0, 6).join('\n')}
                  {csvContent.split('\n').length > 6 && '\n...'}
                </pre>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-accent transition"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || !csvContent}
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
                  Import Mentors
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function BulkImportMentorsResultsModal({
  result,
  onClose,
}: {
  result: BulkImportResult
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0F1919]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-5 border-b border-border rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground font-sans">Import Results</h2>
              <p className="text-sm text-primary mt-0.5">
                {result.successCount} of {result.totalProcessed} mentors imported successfully
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent transition text-primary">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-accent border border-border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{result.totalProcessed}</div>
              <div className="text-xs text-primary mt-1">Total Processed</div>
            </div>
            <div className="bg-success-bg border border-success/30 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-success">{result.successCount}</div>
              <div className="text-xs text-success mt-1">Successful</div>
            </div>
            <div className="bg-[#F5E6DE] border border-destructive/30 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-destructive">{result.failureCount}</div>
              <div className="text-xs text-destructive mt-1">Failed</div>
            </div>
          </div>

          {result.successCount > 0 && (
            <div className="bg-accent border border-border rounded-xl p-4 text-sm text-primary">
              Imported mentors can sign in with Google right away — no passwords to share.
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-destructive font-sans mb-3">
                Errors ({result.errors.length})
              </h3>
              <div className="bg-[#F5E6DE] border border-destructive/30 rounded-xl p-4 max-h-64 overflow-auto space-y-2">
                {result.errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 bg-white rounded-lg border border-destructive/30"
                  >
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-destructive">
                        Row {err.row}: {err.email}
                      </p>
                      <p className="text-xs text-destructive mt-0.5">{err.error}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#0F1919] hover:bg-[#1C2C2C] text-[#FFFBF3] shadow-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
