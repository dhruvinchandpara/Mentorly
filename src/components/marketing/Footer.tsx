import Link from 'next/link';
import { Sparkles } from 'lucide-react';

const COLUMNS = [
  {
    heading: 'For students',
    links: [
      { label: 'Browse mentors', href: '/explore' },
      { label: 'Sign in', href: '/login' },
    ],
  },
  {
    heading: 'For mentors',
    links: [
      { label: 'Become a mentor', href: '/login' },
      { label: 'Sign in', href: '/login' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[var(--deep-teal-black)] text-[var(--fg-on-dark)] pt-18 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-between gap-12">
          <div className="max-w-[34ch]">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-semibold text-[var(--ivory-whisper)]">
                Mentorly
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-[var(--fg-on-dark-muted)] mt-4">
              Connect with expert mentors for 1-on-1 video sessions and accelerate your career growth.
            </p>
          </div>

          <div className="flex flex-wrap gap-14">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--peach-beige)] mb-3.5">
                  {col.heading}
                </div>
                {col.links.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    className="block text-sm text-[var(--fg-on-dark-muted)] hover:text-[var(--ivory-whisper)] py-1.5 transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2 mt-14 pt-6 border-t border-[var(--line-on-dark)] text-sm text-[var(--fg-on-dark-muted)]">
          <span>&copy; {new Date().getFullYear()} Mentorly. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
