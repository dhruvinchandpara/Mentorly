'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'

function ErrorContent() {
 const searchParams = useSearchParams()
 const errorMsg = searchParams.get('error_description') || 'Authentication failed. Please try again or contact support.'

 return (
 <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
 <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-blue-200 text-center">
 <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
 <AlertCircle className="w-8 h-8 text-red-600 " />
 </div>

 <h1 className="text-2xl font-bold text-blue-950 mb-3">Authentication Error</h1>
 <p className="text-blue-700 mb-8 leading-relaxed">
 {errorMsg}
 </p>

 <div className="space-y-3">
 <Link
 href="/login"
 className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
 >
 <ArrowLeft className="w-4 h-4" />
 Back to Login
 </Link>

 <p className="text-xs text-blue-600 pt-4">
 Common issues: Using an unauthorized email, browser cookie settings, or an expired link.
 </p>
 </div>
 </div>
 </div>
 )
}

export default function AuthCodeError() {
 return (
 <Suspense fallback={
 <div className="min-h-screen bg-slate-50 flex items-center justify-center">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
 </div>
 }>
 <ErrorContent />
 </Suspense>
 )
}
