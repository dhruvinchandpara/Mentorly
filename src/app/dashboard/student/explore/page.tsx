'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, ArrowRight, X, Loader2 } from 'lucide-react'
import { useMentors } from '@/hooks/useMentors'

const ITEMS_PER_PAGE = 9

export default function ExploreMentors() {
  const { data: mentors = [], isLoading: loading } = useMentors(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExpertise, setSelectedExpertise] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

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
      'from-primary to-primary/80',
      'from-success to-success/80',
      'from-foreground to-foreground/80',
      'from-warning to-warning/80',
      'from-destructive to-destructive/80',
      'from-info to-info/80',
      'from-muted-foreground to-muted-foreground/80',
    ]
    const index = (name?.charCodeAt(0) || 0) % gradients.length
    return gradients[index]
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-2">
          Find Your Perfect Mentor
        </h1>
        <p className="text-muted-foreground">
          Browse our curated list of industry experts and book 1-on-1 sessions
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--fg-faint)]" />
          <input
            type="text"
            placeholder="Search by name, expertise, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3 text-sm text-foreground bg-white border border-border rounded-lg placeholder:text-[var(--fg-faint)] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-[var(--fg-faint)]" />
            </button>
          )}
        </div>
      </div>

      {/* Expertise Filter Tags */}
      {allExpertiseTags.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-muted-foreground">Filter by expertise:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedExpertise(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                !selectedExpertise
                  ? 'bg-[#0F1919] text-[#FFFBF3] shadow-sm'
                  : 'bg-white text-muted-foreground border border-border hover:border-[var(--line-strong)]'
              }`}
            >
              All
            </button>
            {allExpertiseTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedExpertise(selectedExpertise === tag ? null : tag)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedExpertise === tag
                    ? 'bg-[#0F1919] text-[#FFFBF3] shadow-sm'
                    : 'bg-white text-muted-foreground border border-border hover:border-[var(--line-strong)]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading mentors...' : `${filteredMentors.length} mentor${filteredMentors.length !== 1 ? 's' : ''} found`}
        </p>
        {filteredMentors.length > ITEMS_PER_PAGE && (
          <p className="text-sm text-muted-foreground">
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
                <div className="w-12 h-12 bg-muted rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-32 mb-2" />
                  <div className="h-3 bg-muted rounded w-20" />
                </div>
              </div>
              <div className="h-3 bg-muted rounded w-full mb-2" />
              <div className="h-3 bg-muted rounded w-3/4 mb-4" />
              <div className="flex gap-2">
                <div className="h-6 bg-muted rounded w-16" />
                <div className="h-6 bg-muted rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredMentors.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-[var(--fg-faint)]" />
          </div>
          <div className="text-xl font-semibold text-foreground mb-2">No mentors found</div>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {searchQuery || selectedExpertise
              ? 'Try adjusting your search query or filters to discover more mentors.'
              : 'No active mentors available at the moment. Check back soon!'}
          </p>
          {(searchQuery || selectedExpertise) && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedExpertise(null) }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-[#FFFBF3] bg-[#0F1919] hover:bg-[#1C2C2C] rounded-full shadow-sm transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Mentor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                      <div className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {mentor.profiles?.full_name}
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-success-bg text-success border border-success/30 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        Available
                      </span>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                    {mentor.bio || 'This mentor hasn\'t added a bio yet.'}
                  </p>

                  {/* Expertise Tags */}
                  {mentor.expertise && mentor.expertise.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {mentor.expertise.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 text-xs font-medium bg-accent text-primary border border-primary/30 rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                      {mentor.expertise.length > 3 && (
                        <span className="px-2.5 py-1 text-xs font-medium bg-muted text-muted-foreground rounded-md">
                          +{mentor.expertise.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  <Link
                    href={`/mentor/${mentor.id}`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground hover:bg-[#1C2C2C] text-white rounded-lg font-medium text-sm transition-all shadow-sm group/btn"
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
                className="px-4 py-2 text-sm font-medium text-muted-foreground bg-white hover:bg-secondary border border-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                            ? 'bg-[#0F1919] text-[#FFFBF3] shadow-sm'
                            : 'text-muted-foreground hover:bg-muted'
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
                      <span key={page} className="px-2 text-[var(--fg-faint)]">
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
                className="px-4 py-2 text-sm font-medium text-muted-foreground bg-white hover:bg-secondary border border-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
