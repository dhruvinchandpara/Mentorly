'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface GoogleAccountConnectionProps {
  userId?: string
  initialConnected?: boolean
}

export function GoogleAccountConnection({ userId, initialConnected = false }: GoogleAccountConnectionProps) {
  const [isConnected, setIsConnected] = useState(initialConnected)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingStatus, setIsFetchingStatus] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const searchParams = useSearchParams()

  // Fetch initial connection status from API
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/auth/google/status')
        if (response.ok) {
          const data = await response.json()
          setIsConnected(data.connected)
        }
      } catch (error) {
        console.error('Failed to fetch Google connection status:', error)
      } finally {
        setIsFetchingStatus(false)
      }
    }

    fetchStatus()
  }, [])

  useEffect(() => {
    // Check for OAuth callback success/error messages
    const googleConnected = searchParams.get('google_connected')
    const googleError = searchParams.get('google_error')

    if (googleConnected === 'true') {
      setIsConnected(true)
      setMessage({ type: 'success', text: 'Google account connected successfully!' })
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (googleError) {
      setMessage({ type: 'error', text: `Failed to connect Google account: ${googleError}` })
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  const handleConnect = () => {
    setIsLoading(true)
    // Redirect to the OAuth connect endpoint
    window.location.href = '/api/auth/google/connect'
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Google account? Students will not be able to book new sessions until you reconnect.')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
      })

      if (response.ok) {
        setIsConnected(false)
        setMessage({ type: 'success', text: 'Google account disconnected successfully' })
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disconnect Google account' })
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetchingStatus) {
    return (
      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Loading Google connection status...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">Google Calendar Integration</h3>
          <p className="text-gray-600 text-sm mb-4">
            Connect your Google account to automatically create Google Meet links for all mentorship sessions. As the admin, you will be the organizer of all meetings, with mentors and students as participants.
          </p>

          {message && (
            <div
              className={`p-3 rounded mb-4 text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-green-700 font-medium">Connected</span>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded border border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {isLoading ? 'Connecting...' : 'Connect Google Account'}
              </button>
            )}
          </div>
        </div>
      </div>

      {!isConnected && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <strong>Important:</strong> You must connect your Google account before students can book sessions.
          All sessions will automatically generate Google Meet links with you as the organizer.
        </div>
      )}
    </div>
  )
}
