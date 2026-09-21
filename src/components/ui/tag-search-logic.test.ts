import { describe, it, expect } from 'vitest'
import { getNameSuggestions, sessionMatchesTags } from './tag-search-logic'

describe('getNameSuggestions', () => {
  const names = ['Alex Student', 'Alexandra Mentor', 'Mo Mentor', 'Alex Student']

  it('returns nothing for an empty query', () => {
    expect(getNameSuggestions(names, '', [])).toEqual([])
  })

  it('matches case-insensitively on substring', () => {
    expect(getNameSuggestions(names, 'alex', [])).toEqual(['Alex Student', 'Alexandra Mentor'])
  })

  it('deduplicates names', () => {
    expect(getNameSuggestions(names, 'Alex Student', [])).toEqual(['Alex Student'])
  })

  it('excludes already-selected names', () => {
    expect(getNameSuggestions(names, 'alex', ['Alex Student'])).toEqual(['Alexandra Mentor'])
  })

  it('caps suggestions at 8', () => {
    const many = Array.from({ length: 12 }, (_, i) => `Match ${i}`)
    expect(getNameSuggestions(many, 'Match', [])).toHaveLength(8)
  })
})

describe('sessionMatchesTags', () => {
  it('matches everything when no tags are selected', () => {
    expect(sessionMatchesTags('Alex Student', 'Mo Mentor', [])).toBe(true)
  })

  it('matches when the student name is selected', () => {
    expect(sessionMatchesTags('Alex Student', 'Mo Mentor', ['Alex Student'])).toBe(true)
  })

  it('matches when the mentor name is selected (OR semantics)', () => {
    expect(sessionMatchesTags('Alex Student', 'Mo Mentor', ['Someone Else', 'Mo Mentor'])).toBe(true)
  })

  it('does not match when neither name is selected', () => {
    expect(sessionMatchesTags('Alex Student', 'Mo Mentor', ['Someone Else'])).toBe(false)
  })
})
