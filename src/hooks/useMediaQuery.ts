'use client';

import { useEffect, useState } from 'react';

/**
 * Starts false (matching SSR, where `window` doesn't exist) and updates
 * after mount to avoid a hydration mismatch. Callers that need a
 * desktop-first default should treat the first render as "mobile" and
 * expect it to settle within one effect tick.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener('change', listener);
    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
