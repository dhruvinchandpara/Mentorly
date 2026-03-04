'use client'

import { useAuth } from '@/context/AuthContext'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, Star, IndianRupee, ArrowRight, BookOpen, Sparkles, Filter, X } from 'lucide-react'

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

    const getAvatarGradient = (name: string) => {
        const gradients = [
            'from-indigo-500 to-purple-600',
            'from-blue-500 to-cyan-500',
            'from-emerald-500 to-teal-500',
            'from-amber-500 to-orange-500',
            'from-rose-500 to-pink-500',
            'from-violet-500 to-purple-500',
            'from-sky-500 to-indigo-500',
        ]
        const index = (name?.charCodeAt(0) || 0) % gradients.length
        return gradients[index]
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Navigation */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        Mentorly
                    </Link>
                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                >
                                    Dashboard
                                </Link>
                                <button
                                    onClick={() => signOut()}
                                    className="px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:border-indigo-400 transition-all"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                className="px-5 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/30"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero / Search Section */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800" />
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
                        <p className="text-lg text-indigo-100 max-w-2xl mx-auto">
                            Browse our curated list of industry experts and book 1-on-1 sessions to accelerate your growth.
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="max-w-2xl mx-auto">
                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by name, expertise, or keyword..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 text-base shadow-2xl shadow-indigo-900/30 border-2 border-transparent focus:border-indigo-400 focus:ring-0 outline-none transition-all"
                                id="mentor-search"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
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
                            <Filter className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Filter by expertise:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedExpertise(null)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!selectedExpertise
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                                    }`}
                            >
                                All
                            </button>
                            {allExpertiseTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setSelectedExpertise(selectedExpertise === tag ? null : tag)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedExpertise === tag
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'
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
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {loading ? 'Loading mentors...' : `${filteredMentors.length} mentor${filteredMentors.length !== 1 ? 's' : ''} found`}
                    </p>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 animate-pulse">
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-14 h-14 bg-slate-200 dark:bg-slate-700 rounded-full" />
                                    <div className="flex-1">
                                        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2" />
                                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-20" />
                                    </div>
                                </div>
                                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full mb-2" />
                                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4 mb-4" />
                                <div className="flex gap-2">
                                    <div className="h-7 bg-slate-100 dark:bg-slate-800 rounded-lg w-16" />
                                    <div className="h-7 bg-slate-100 dark:bg-slate-800 rounded-lg w-20" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredMentors.length === 0 ? (
                    /* Empty State */
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <BookOpen className="w-10 h-10 text-indigo-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No mentors found</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            {searchQuery || selectedExpertise
                                ? 'Try adjusting your search query or filters to discover more mentors.'
                                : 'No active mentors available at the moment. Check back soon!'}
                        </p>
                        {(searchQuery || selectedExpertise) && (
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedExpertise(null) }}
                                className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/30"
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
                                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 flex flex-col"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Top Gradient Bar */}
                                <div className={`h-1.5 bg-gradient-to-r ${getAvatarGradient(mentor.profiles?.full_name || '')}`} />

                                <div className="p-6 flex-1 flex flex-col">
                                    {/* Mentor Header */}
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarGradient(mentor.profiles?.full_name || '')} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                                            {getInitials(mentor.profiles?.full_name || '')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {mentor.profiles?.full_name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-sm">
                                                <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
                                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{mentor.hourly_rate}</span>
                                                <span className="text-slate-400">/hour</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bio */}
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 line-clamp-3 leading-relaxed flex-1">
                                        {mentor.bio || 'This mentor hasn\'t added a bio yet.'}
                                    </p>

                                    {/* Expertise Tags */}
                                    {mentor.expertise && mentor.expertise.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-5">
                                            {mentor.expertise.slice(0, 4).map(tag => (
                                                <span
                                                    key={tag}
                                                    className="px-3 py-1 text-xs font-medium bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-500/20"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            {mentor.expertise.length > 4 && (
                                                <span className="px-3 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg">
                                                    +{mentor.expertise.length - 4} more
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* CTA */}
                                    <Link
                                        href={`/mentor/${mentor.id}`}
                                        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-all duration-200 group/btn shadow-sm"
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
            <footer className="py-8 border-t border-slate-200 dark:border-slate-800 text-center text-slate-500 text-sm">
                &copy; {new Date().getFullYear()} Mentorly. All rights reserved.
            </footer>
        </div>
    )
}
