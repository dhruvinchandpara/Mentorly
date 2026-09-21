'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, Sparkles, X } from 'lucide-react';

const LINKS = [
  { label: 'Browse Mentors', href: '/explore' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-all ${
        scrolled
          ? 'bg-[rgba(255,251,243,0.82)] backdrop-blur-xl border-border shadow-[0_1px_2px_rgba(15,25,25,.06),0_1px_3px_rgba(15,25,25,.05)]'
          : 'bg-transparent border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-semibold text-foreground tracking-tight">
              Mentorly
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link href="/login" className="btn-primary">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>

          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMenuOpen((m) => !m)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden flex flex-col gap-1 px-4 pb-5 bg-[rgba(255,251,243,0.96)] backdrop-blur-xl border-t border-border">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="py-2.5 text-sm font-semibold text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="py-2.5 text-sm font-semibold text-foreground"
          >
            Sign In
          </Link>
          <Link href="/login" className="btn-primary mt-2 justify-center">
            Get Started
          </Link>
        </div>
      )}
    </header>
  );
}
