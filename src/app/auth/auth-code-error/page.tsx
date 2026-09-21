'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, ShieldAlert, Mail, HelpCircle } from 'lucide-react'

function ErrorContent() {
  const searchParams = useSearchParams()
  const errorMsg = searchParams.get('error_description') || 'Authentication failed. Please try again or contact support.'
  
  // Check if it's a whitelist error from our trigger
  const isWhitelistError = errorMsg.toLowerCase().includes('unauthorized student') || 
                          errorMsg.toLowerCase().includes('not on the authorized list')

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-accent/50 blur-3xl opacity-50" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[#F5E6DE]/30 blur-3xl opacity-50" />
      </div>

      <div className="relative max-w-lg w-full bg-white rounded-[2rem] shadow-2xl p-8 md:p-12 border border-border text-center">
        {isWhitelistError ? (
          <>
            <div className="w-20 h-20 bg-warning-bg rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
              <ShieldAlert className="w-10 h-10 text-warning" />
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Access Restricted</h1>
            
            <div className="bg-secondary rounded-2xl p-6 mb-8 text-left border border-border">
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Your email <span className="font-semibold text-foreground">{searchParams.get('email') || 'registered address'}</span> is not currently on our authorized student whitelist.
              </p>
              
              <div className="flex gap-4 items-start text-sm text-[var(--fg-faint)]">
                <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p>To maintain a high-quality mentorship experience, we currently only allow pre-approved students to join our platform.</p>
              </div>
            </div>

            <div className="space-y-4">
              <a
                href="mailto:support@mentorly.com"
                className="w-full flex items-center justify-center gap-2 bg-foreground hover:bg-foreground/90 text-white font-semibold py-4 rounded-2xl transition-all shadow-xl shadow-foreground/10 active:scale-[0.98]"
              >
                <Mail className="w-4 h-4" />
                Request Early Access
              </a>
              
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground font-medium py-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Try another account
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-[#F5E6DE] rounded-3xl flex items-center justify-center mx-auto mb-8">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Authentication Problem</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed px-4">
              {errorMsg}
            </p>

            <div className="space-y-4">
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-[var(--primary-hover)] text-white font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Login
              </Link>
              
              <p className="text-xs text-[var(--fg-faint)] font-medium uppercase tracking-widest pt-4">
                Support Reference: #{Math.floor(100000 + Math.random() * 900000)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function AuthCodeError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-sm font-medium text-[var(--fg-faint)]">Checking authorization...</p>
        </div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
