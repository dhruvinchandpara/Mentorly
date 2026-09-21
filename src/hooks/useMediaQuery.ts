'use client';

import { useSyncExternalStore } from 'react';

function subscribe(query: string, onChange: () => void) {
  const mediaQueryList = window.matchMedia(query);
  mediaQueryList.addEventListener('change', onChange);
  return () => mediaQueryList.removeEventListener('change', onChange);
}

/**
 * Server snapshot is always false (no `window` during SSR) so the client's
 * first render matches the server-rendered HTML; it settles to the real
 * value on the next paint once matchMedia can run.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => subscribe(query, onChange),
    () => window.matchMedia(query).matches,
    () => false
  );
}
