import Link from 'next/link';
import { ArrowRight, Clock, Sparkles, Star, Users } from 'lucide-react';

const STATS = [
  { icon: Users, value: '100+', label: 'Expert Mentors' },
  { icon: Star, value: '4.9/5', label: 'Average Rating' },
  { icon: Clock, value: '1,000+', label: 'Sessions Completed' },
];

export function Hero() {
  return (
    <section className="relative bg-[var(--deep-teal-black)] text-[var(--ivory-whisper)] overflow-hidden">
      <div
        className="absolute right-[-3vw] top-[-8vh] font-display italic font-semibold text-[52vh] leading-none pointer-events-none select-none"
        style={{ color: 'rgba(186,59,65,.16)' }}
        aria-hidden="true"
      >
        &rdquo;
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 pb-24 sm:pt-48 sm:pb-32">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--peach-beige)]">
          <Sparkles className="w-3.5 h-3.5" />
          Trusted by 1,000+ students worldwide
        </span>

        <h1 className="font-display font-semibold text-[clamp(2.5rem,4.6vw,3.9rem)] leading-[1.1] tracking-[-0.02em] mt-5 max-w-[19ch] text-[var(--ivory-whisper)]">
          Accelerate your career with <em className="text-[var(--peach-beige)] not-italic">expert mentors</em>
        </h1>

        <p className="text-lg leading-relaxed text-[var(--fg-on-dark-muted)] max-w-[52ch] mt-10">
          Connect with industry leaders for 1-on-1 mentorship sessions. Get personalized guidance and accelerate your growth &mdash; book instantly, meet over video, on your schedule.
        </p>

        <div className="flex flex-wrap gap-3.5 mt-8">
          <Link href="/explore" className="btn-primary">
            Browse Mentors
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-full border border-[rgba(255,251,243,.25)] bg-[rgba(255,251,243,.06)] text-[var(--ivory-whisper)] hover:bg-[rgba(255,251,243,.12)] transition-colors"
          >
            Become a Mentor
          </Link>
        </div>

        <div className="flex flex-wrap gap-14 mt-16 pt-8 border-t border-[var(--line-on-dark)]">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5">
              <s.icon className="w-4 h-4 text-[var(--lemon-yellow)]" />
              <span className="text-sm text-[var(--fg-on-dark-muted)]">
                <strong className="font-display font-semibold text-[var(--ivory-whisper)] text-base align-middle">
                  {s.value}
                </strong>{' '}
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
