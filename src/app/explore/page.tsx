'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, Star, ArrowRight, Sparkles, X, ChevronDown } from 'lucide-react'

interface MentorCard {
 id: string
 bio: string
 expertise: string[]
 hourly_rate: number
 is_active: boolean
 profiles: {
 full_name: string
 email: string
 }
}

const ITEMS_PER_PAGE = 9

export default function ExplorePage() {
 const { supabase, profile, signOut, user } = useAuth()
 const [mentors, setMentors] = useState<MentorCard[]>([])
 const [loading, setLoading] = useState(true)
 const [searchQuery, setSearchQuery] = useState('')
 const [selectedExpertise, setSelectedExpertise] = useState<string | null>(null)
 const [currentPage, setCurrentPage] = useState(1)

 useEffect(() => {
 fetchMentors()
 }, [])

 const fetchMentors = async () => {
 setLoading(true)
 try {
 const { data, error } = await supabase
 .from('mentors')
 .select(`
 id,
 bio,
 expertise,
 hourly_rate,
 is_active,
 profiles!inner (
 full_name,
 email
 )
 `)
 .eq('is_active', true)

 if (error) {
 console.error('Error fetching mentors:', error)
 } else {
 setMentors(data || [])
 }
 } catch (error) {
 console.error('Error:', error)
 } finally {
 setLoading(false)
 }
 }

 // Collect all unique expertise tags
 const allExpertiseTags = useMemo(() => {
 const tags = new Set<string>()
 mentors.forEach(m => m.expertise?.forEach(t => tags.add(t)))
 return Array.from(tags).sort()
 }, [mentors])

 // Filter mentors based on search query and selected expertise
 const filteredMentors = useMemo(() => {
 return mentors.filter(mentor => {
 const query = searchQuery.toLowerCase()
 const matchesSearch = !query ||
 mentor.profiles?.full_name?.toLowerCase().includes(query) ||
 mentor.bio?.toLowerCase().includes(query) ||
 mentor.expertise?.some(tag => tag.toLowerCase().includes(query))

 const matchesExpertise = !selectedExpertise ||
 mentor.expertise?.includes(selectedExpertise)

 return matchesSearch && matchesExpertise
 })
 }, [mentors, searchQuery, selectedExpertise])

 // Pagination
 const totalPages = Math.ceil(filteredMentors.length / ITEMS_PER_PAGE)
 const paginatedMentors = filteredMentors.slice(
 (currentPage - 1) * ITEMS_PER_PAGE,
 currentPage * ITEMS_PER_PAGE
 )

 // Reset to page 1 when filters change
 useEffect(() => {
 setCurrentPage(1)
 }, [searchQuery, selectedExpertise])

 const getInitials = (name: string) => {
 return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
 }

 const getAvatarColor = (name: string) => {
 const gradients = [
 'from-blue-500 to-blue-600',
 'from-emerald-500 to-emerald-600',
 'from-violet-500 to-violet-600',
 'from-amber-500 to-amber-600',
 'from-rose-500 to-rose-600',
 'from-cyan-500 to-cyan-600',
 'from-indigo-500 to-indigo-600',
 ]
 const index = (name?.charCodeAt(0) || 0) % gradients.length
 return gradients[index]
 }

 return (
 <div className="min-h-screen bg-white">
 {/* Navigation */}
 <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex justify-between items-center h-16">
 <Link href="/" className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
 <Sparkles className="w-4 h-4 text-white" />
 </div>
 <span className="text-lg font-semibold text-slate-900 tracking-tight">Mentorly</span>
 </Link>

 <div className="flex items-center gap-4">
 {user ? (
 <>
 <Link
 href="/dashboard"
 className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline-block"
 >
 Dashboard
 </Link>
 <button
 onClick={() => signOut()}
 className="btn-ghost text-sm"
 >
 Sign Out
 </button>
 </>
 ) : (
 <>
 <Link
 href="/login"
 className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline-block"
 >
 Sign In
 </Link>
 <Link href="/login" className="btn-primary">
 Get Started
 </Link>
 </>
 )}
 </div>
 </div>
 </div>
 </header>

 {/* Hero / Search Section */}
 <section className="relative bg-slate-50 border-b border-slate-200">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
 <div className="text-center mb-8">
 <h1 className="text-4xl sm:text-5xl font-semibold text-slate-900 tracking-tight mb-3">
 Find Your Perfect Mentor
 </h1>
 <p className="text-lg text-slate-600 max-w-2xl mx-auto">
 Browse our curated list of industry experts and book 1-on-1 sessions
 </p>
 </div>

 {/* Search Bar */}
 <div className="max-w-2xl mx-auto">
 <div className="relative">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input
 type="text"
 placeholder="Search by name, expertise, or keyword..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-12 pr-12 py-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
 />
 {searchQuery && (
 <button
 onClick={() => setSearchQuery('')}
 className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-md transition-colors"
 >
 <X className="w-4 h-4 text-slate-400" />
 </button>
 )}
 </div>
 </div>
 </div>
 </section>

 {/* Main Content */}
 <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
 {/* Expertise Filter Tags */}
 {allExpertiseTags.length > 0 && (
 <div className="mb-8">
 <div className="flex items-center gap-2 mb-4">
 <span className="text-sm font-medium text-slate-700">Filter by expertise:</span>
 </div>
 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => setSelectedExpertise(null)}
 className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${!selectedExpertise
 ? 'bg-blue-600 text-white shadow-sm'
 : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400'
 }`}
 >
 All
 </button>
 {allExpertiseTags.map(tag => (
 <button
 key={tag}
 onClick={() => setSelectedExpertise(selectedExpertise === tag ? null : tag)}
 className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedExpertise === tag
 ? 'bg-blue-600 text-white shadow-sm'
 : 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400'
 }`}
 >
 {tag}
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Results Count */}
 <div className="flex items-center justify-between mb-6">
 <p className="text-sm text-slate-600">
 {loading ? 'Loading mentors...' : `${filteredMentors.length} mentor${filteredMentors.length !== 1 ? 's' : ''} found`}
 </p>
 {filteredMentors.length > ITEMS_PER_PAGE && (
 <p className="text-sm text-slate-600">
 Page {currentPage} of {totalPages}
 </p>
 )}
 </div>

 {/* Loading State */}
 {loading ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {[...Array(6)].map((_, i) => (
 <div key={i} className="card-modern p-6 animate-pulse">
 <div className="flex items-center gap-3 mb-4">
 <div className="w-12 h-12 bg-slate-200 rounded-full" />
 <div className="flex-1">
 <div className="h-4 bg-slate-200 rounded w-32 mb-2" />
 <div className="h-3 bg-slate-100 rounded w-20" />
 </div>
 </div>
 <div className="h-3 bg-slate-100 rounded w-full mb-2" />
 <div className="h-3 bg-slate-100 rounded w-3/4 mb-4" />
 <div className="flex gap-2">
 <div className="h-6 bg-slate-100 rounded w-16" />
 <div className="h-6 bg-slate-100 rounded w-20" />
 </div>
 </div>
 ))}
 </div>
 ) : filteredMentors.length === 0 ? (
 /* Empty State */
 <div className="text-center py-20">
 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
 <Search className="w-8 h-8 text-slate-400" />
 </div>
 <h3 className="text-xl font-semibold text-slate-900 mb-2">No mentors found</h3>
 <p className="text-slate-600 max-w-md mx-auto mb-6">
 {searchQuery || selectedExpertise
 ? 'Try adjusting your search query or filters to discover more mentors.'
 : 'No active mentors available at the moment. Check back soon!'}
 </p>
 {(searchQuery || selectedExpertise) && (
 <button
 onClick={() => { setSearchQuery(''); setSelectedExpertise(null) }}
 className="btn-primary"
 >
 Clear Filters
 </button>
 )}
 </div>
 ) : (
 <>
 {/* Mentor Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
 {paginatedMentors.map((mentor) => (
 <div
 key={mentor.id}
 className="card-modern overflow-hidden hover-lift group"
 >
 {/* Top Gradient Bar */}
 <div className={`h-1 bg-gradient-to-r ${getAvatarColor(mentor.profiles?.full_name || '')}`} />

 <div className="p-6">
 {/* Mentor Header */}
 <div className="flex items-center gap-3 mb-4">
 <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(mentor.profiles?.full_name || '')} flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
 {getInitials(mentor.profiles?.full_name || '')}
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="text-base font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
 {mentor.profiles?.full_name}
 </h3>
 <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 mt-1">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
 Available
 </span>
 </div>
 </div>

 {/* Bio */}
 <p className="text-sm text-slate-600 mb-4 line-clamp-3 leading-relaxed">
 {mentor.bio || 'This mentor hasn\'t added a bio yet.'}
 </p>

 {/* Expertise Tags */}
 {mentor.expertise && mentor.expertise.length > 0 && (
 <div className="flex flex-wrap gap-2 mb-4">
 {mentor.expertise.slice(0, 3).map(tag => (
 <span
 key={tag}
 className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-md"
 >
 {tag}
 </span>
 ))}
 {mentor.expertise.length > 3 && (
 <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-md">
 +{mentor.expertise.length - 3}
 </span>
 )}
 </div>
 )}

 {/* CTA */}
 <Link
 href={`/mentor/${mentor.id}`}
 className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-all shadow-sm group/btn"
 >
 View Profile
 <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
 </Link>
 </div>
 </div>
 ))}
 </div>

 {/* Pagination */}
 {totalPages > 1 && (
 <div className="flex justify-center items-center gap-2">
 <button
 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
 disabled={currentPage === 1}
 className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Previous
 </button>

 <div className="flex items-center gap-1">
 {[...Array(totalPages)].map((_, i) => {
 const page = i + 1
 // Show first, last, current, and adjacent pages
 if (
 page === 1 ||
 page === totalPages ||
 (page >= currentPage - 1 && page <= currentPage + 1)
 ) {
 return (
 <button
 key={page}
 onClick={() => setCurrentPage(page)}
 className={`w-10 h-10 text-sm font-medium rounded-lg transition-all ${
 currentPage === page
 ? 'bg-blue-600 text-white shadow-sm'
 : 'text-slate-700 hover:bg-slate-100'
 }`}
 >
 {page}
 </button>
 )
 } else if (
 page === currentPage - 2 ||
 page === currentPage + 2
 ) {
 return (
 <span key={page} className="px-2 text-slate-400">
 ...
 </span>
 )
 }
 return null
 })}
 </div>

 <button
 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
 disabled={currentPage === totalPages}
 className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Next
 </button>
 </div>
 )}
 </>
 )}
 </main>

 {/* Footer */}
 <footer className="border-t border-slate-200 py-8">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center">
 <Sparkles className="w-3 h-3 text-white" />
 </div>
 <span className="text-sm font-medium text-slate-900">Mentorly</span>
 </div>
 <p className="text-sm text-slate-600">
 &copy; {new Date().getFullYear()} Mentorly. All rights reserved.
 </p>
 </div>
 </div>
 </footer>
 </div>
 )
}
