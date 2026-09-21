import { CalendarClock, ShieldCheck, Users, Video } from 'lucide-react';

const ITEMS = [
  {
    icon: Users,
    title: 'World-class mentors',
    description: 'Learn from engineers and leaders at top companies who have been where you want to go.',
  },
  {
    icon: Video,
    title: '1-on-1 video sessions',
    description: 'Book and join sessions directly through Google Meet. No complicated setup required.',
  },
  {
    icon: CalendarClock,
    title: 'Flexible scheduling',
    description: 'Find mentors available at times that work for you. Book sessions in minutes.',
  },
  {
    icon: ShieldCheck,
    title: 'Vetted & secure',
    description: "Every mentor is carefully vetted, and your data is protected end-to-end.",
  },
];

export function Pillars() {
  return (
    <section className="bg-secondary py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="eyebrow text-xs font-bold uppercase tracking-[0.16em] text-primary">
            The Mentorly method
          </span>
          <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-[-0.015em] text-foreground mt-3">
            Everything you need to grow, guided by people who&rsquo;ve done it.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-11">
          {ITEMS.map((item) => (
            <article
              key={item.title}
              className="bg-card border border-border rounded-[20px] shadow-[0_1px_2px_rgba(15,25,25,.06),0_1px_3px_rgba(15,25,25,.05)] p-7 transition-transform hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(15,25,25,.08),0_2px_4px_rgba(15,25,25,.05)]"
            >
              <span className="inline-flex w-11 h-11 items-center justify-center rounded-xl bg-accent text-primary">
                <item.icon className="w-5 h-5" strokeWidth={2} />
              </span>
              <h3 className="font-bold text-lg text-foreground mt-4 mb-2">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
