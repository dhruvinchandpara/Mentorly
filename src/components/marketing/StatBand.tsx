const STATS = [
  { value: '100+', label: 'expert mentors across industries' },
  { value: '1,000+', label: 'sessions completed and counting' },
  { value: '15 min', label: 'minimum session length — book only what you need' },
  { value: '24/7', label: 'browse and book, meet over video' },
];

export function StatBand() {
  return (
    <section className="bg-[var(--deep-teal-black)] text-[var(--ivory-whisper)] py-22 sm:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--peach-beige)]">
          Outcomes
        </span>
        <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-[-0.015em] mt-3 text-[var(--ivory-whisper)]">
          Proof, not promises.
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-display font-semibold text-4xl sm:text-5xl text-[var(--peach-beige)]">
                {s.value}
              </div>
              <div className="text-sm text-[var(--fg-on-dark-muted)] mt-2 max-w-[20ch]">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
