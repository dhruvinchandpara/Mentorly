'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, Star, ArrowRight, BookOpen, Sparkles, Filter, X } from 'lucide-react'

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

export default function ExplorePage() {
 const { supabase, profile, signOut, user } = useAuth()
 const [mentors, setMentors] = useState<MentorCard[]>([])
 const [loading, setLoading] = useState(true)
 const [searchQuery, setSearchQuery] = useState('')
 const [selectedExpertise, setSelectedExpertise] = useState<string | null>(null)

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

 const getInitials = (name: string) => {
 return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
 }

 const getAvatarColor = (name: string) => {
 const gradients = [
 'from-blue-500 to-purple-600',
 'from-blue-500 to-cyan-500',
 'from-emerald-500 to-teal-500',
 'from-amber-500 to-orange-500',
 'from-rose-500 to-pink-500',
 'from-violet-500 to-purple-500',
 'from-sky-500 to-blue-500',
 ]
 const index = (name?.charCodeAt(0) || 0) % gradients.length
 return gradients[index]
 }

 return (
 <div className="min-h-screen bg-slate-50 ">
 {/* Navigation */}
 <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-blue-200 ">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
 <Link href="/" className="text-2xl font-bold text-blue-700">
 Mentorly
 </Link>
 <div className="flex items-center gap-4">
 {user ? (
 <>
 <Link
 href="/dashboard"
 className="text-sm font-medium text-blue-700 hover:text-blue-600 :text-blue-400 transition-colors"
 >
 Dashboard
 </Link>
 <button
 onClick={() => signOut()}
 className="px-4 py-2 text-sm font-medium bg-white border border-blue-200 rounded-lg text-blue-800 hover:border-blue-400 transition-all"
 >
 Sign Out
 </button>
 </>
 ) : (
 <Link
 href="/login"
 className="px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/30"
 >
 Sign In
 </Link>
 )}
 </div>
 </div>
 </header>

 {/* Hero / Search Section */}
 <section className="relative overflow-hidden">
 <div className="absolute inset-0 bg-blue-700" />
 <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-50" />
 <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
 <div className="text-center mb-10">
 <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-6 border border-white/20">
 <Sparkles className="w-4 h-4" />
 Discover Top Mentors
 </div>
 <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
 Find Your Perfect Mentor
 </h1>
 <p className="text-lg text-blue-100 max-w-2xl mx-auto">
 Browse our curated list of industry experts and book 1-on-1 sessions to accelerate your growth.
 </p>
 </div>

 {/* Search Bar */}
 <div className="max-w-2xl mx-auto">
 <div className="relative group">
 <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
 <input
 type="text"
 placeholder="Search by name, expertise, or keyword..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl text-blue-950 placeholder-slate-400 text-base shadow-2xl shadow-blue-900/30 border-2 border-transparent focus:border-blue-400 focus:ring-0 outline-none transition-all"
 id="mentor-search"
 />
 {searchQuery && (
 <button
 onClick={() => setSearchQuery('')}
 className="absolute right-5 top-1/2 -translate-y-1/2 p-1 hover:bg-blue-50 :bg-slate-800 rounded-full transition-colors"
 >
 <X className="w-4 h-4 text-slate-400" />
 </button>
 )}
 </div>
 </div>
 </div>
 </section>

 {/* Main Content */}
 <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
 {/* Expertise Filter Tags */}
 {allExpertiseTags.length > 0 && (
 <div className="mb-8">
 <div className="flex items-center gap-3 mb-4">
 <Filter className="w-4 h-4 text-blue-600" />
 <span className="text-sm font-medium text-blue-700 ">Filter by expertise:</span>
 </div>
 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => setSelectedExpertise(null)}
 className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!selectedExpertise
 ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
 : 'bg-white text-blue-700 border border-blue-200 hover:border-blue-400 :border-blue-500'
 }`}
 >
 All
 </button>
 {allExpertiseTags.map(tag => (
 <button
 key={tag}
 onClick={() => setSelectedExpertise(selectedExpertise === tag ? null : tag)}
 className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedExpertise === tag
 ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
 : 'bg-white text-blue-700 border border-blue-200 hover:border-blue-400 :border-blue-500'
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
 <p className="text-sm text-blue-600 ">
 {loading ? 'Loading mentors...' : `${filteredMentors.length} mentor${filteredMentors.length !== 1 ? 's' : ''} found`}
 </p>
 </div>

 {/* Loading State */}
 {loading ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {[...Array(6)].map((_, i) => (
 <div key={i} className="bg-white rounded-2xl p-6 border border-blue-200 animate-pulse">
 <div className="flex items-center gap-4 mb-5">
 <div className="w-14 h-14 bg-slate-200 rounded-full" />
 <div className="flex-1">
 <div className="h-5 bg-slate-200 rounded w-32 mb-2" />
 <div className="h-4 bg-blue-50 rounded w-20" />
 </div>
 </div>
 <div className="h-4 bg-blue-50 rounded w-full mb-2" />
 <div className="h-4 bg-blue-50 rounded w-3/4 mb-4" />
 <div className="flex gap-2">
 <div className="h-7 bg-blue-50 rounded-lg w-16" />
 <div className="h-7 bg-blue-50 rounded-lg w-20" />
 </div>
 </div>
 ))}
 </div>
 ) : filteredMentors.length === 0 ? (
 /* Empty State */
 <div className="text-center py-20">
 <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
 <BookOpen className="w-10 h-10 text-blue-500" />
 </div>
 <h3 className="text-xl font-semibold text-blue-950 mb-2">No mentors found</h3>
 <p className="text-blue-600 max-w-md mx-auto">
 {searchQuery || selectedExpertise
 ? 'Try adjusting your search query or filters to discover more mentors.'
 : 'No active mentors available at the moment. Check back soon!'}
 </p>
 {(searchQuery || selectedExpertise) && (
 <button
 onClick={() => { setSearchQuery(''); setSelectedExpertise(null) }}
 className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/30"
 >
 Clear Filters
 </button>
 )}
 </div>
 ) : (
 /* Mentor Grid */
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {filteredMentors.map((mentor, index) => (
 <div
 key={mentor.id}
 className="group bg-white rounded-2xl border border-blue-200 overflow-hidden hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-300 :border-blue-700 transition-all duration-300 flex flex-col"
 style={{ animationDelay: `${index * 50}ms` }}
 >
 {/* Top Gradient Bar */}
 <div className={`h-1.5 ${getAvatarColor(mentor.profiles?.full_name || '')}`} />

 <div className="p-6 flex-1 flex flex-col">
 {/* Mentor Header */}
 <div className="flex items-center gap-4 mb-5">
 <div className={`w-14 h-14 rounded-full ${getAvatarColor(mentor.profiles?.full_name || '')} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
 {getInitials(mentor.profiles?.full_name || '')}
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="text-lg font-bold text-blue-950 truncate group-hover:text-blue-600 :text-blue-400 transition-colors">
 {mentor.profiles?.full_name}
 </h3>
 {mentor.is_active && (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 mt-1">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
 Available
 </span>
 )}
 </div>
 </div>

 {/* Bio */}
 <p className="text-sm text-blue-700 mb-5 line-clamp-3 leading-relaxed flex-1">
 {mentor.bio || 'This mentor hasn\'t added a bio yet.'}
 </p>

 {/* Expertise Tags */}
 {mentor.expertise && mentor.expertise.length > 0 && (
 <div className="flex flex-wrap gap-2 mb-5">
 {mentor.expertise.slice(0, 4).map(tag => (
 <span
 key={tag}
 className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg border border-blue-100 "
 >
 {tag}
 </span>
 ))}
 {mentor.expertise.length > 4 && (
 <span className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg">
 +{mentor.expertise.length - 4} more
 </span>
 )}
 </div>
 )}

 {/* CTA */}
 <Link
 href={`/mentor/${mentor.id}`}
 className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-blue-600 :bg-blue-700 text-white rounded-xl font-medium text-sm transition-all duration-200 group/btn shadow-sm"
 >
 View Profile
 <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
 </Link>
 </div>
 </div>
 ))}
 </div>
 )}
 </main>

 {/* Footer */}
 <footer className="py-8 border-t border-blue-200 text-center text-blue-600 text-sm">
 &copy; {new Date().getFullYear()} Mentorly. All rights reserved.
 </footer>
 </div>
 )
}
