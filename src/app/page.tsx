import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Nav } from '@/components/marketing/Nav';
import { Hero } from '@/components/marketing/Hero';
import { Pillars } from '@/components/marketing/Pillars';
import { StatBand } from '@/components/marketing/StatBand';
import { Footer } from '@/components/marketing/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main>
        <Hero />
        <Pillars />
        <StatBand />

        {/* CTA band */}
        <section className="bg-primary text-primary-foreground py-24 sm:py-28 text-center">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display font-semibold text-3xl sm:text-4xl tracking-[-0.015em] text-primary-foreground">
              Ready to accelerate your growth?
            </h2>
            <p className="text-lg text-[rgba(255,251,243,.86)] mt-5 mb-8">
              Join thousands of professionals learning from the best in the industry.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold rounded-full bg-[var(--ivory-whisper)] text-primary shadow-[0_14px_30px_rgba(15,25,25,.25)] hover:bg-white transition-colors"
            >
              Get Started Today
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
