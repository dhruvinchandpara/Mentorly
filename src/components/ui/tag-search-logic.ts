export function getNameSuggestions(
  names: string[],
  query: string,
  excluding: string[]
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const excludeSet = new Set(excluding);
  const unique = Array.from(new Set(names)).filter((n) => !excludeSet.has(n));

  return unique.filter((n) => n.toLowerCase().includes(q)).slice(0, 8);
}

export function sessionMatchesTags(
  studentName: string,
  mentorName: string,
  tags: string[]
): boolean {
  if (tags.length === 0) return true;
  return tags.includes(studentName) || tags.includes(mentorName);
}
