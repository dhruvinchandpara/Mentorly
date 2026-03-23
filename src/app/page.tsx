'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle, Star, Sparkles, Users, Clock, Video, Calendar, Shield, Zap } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Linear-inspired minimal header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-slate-900 tracking-tight">Mentorly</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/explore"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Browse Mentors
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="btn-primary"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </nav>

            {/* Mobile menu button */}
            <Link href="/login" className="md:hidden btn-primary">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero Section - Clean and spacious */}
        <section className="relative pt-20 pb-24 sm:pt-32 sm:pb-40 overflow-hidden">
          {/* Subtle background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-white to-white" />

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgb(148 163 184) 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-sm font-medium mb-8">
                <Sparkles className="w-3.5 h-3.5" />
                Trusted by 1000+ students worldwide
              </div>

              {/* Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-slate-900 tracking-tight mb-6">
                Master your craft<br />
                with{' '}
                <span className="text-gradient">expert mentors</span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                Connect with industry leaders for 1-on-1 mentorship sessions.
                Get personalized guidance and accelerate your career growth.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                <Link
                  href="/explore"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
                >
                  Browse Mentors
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-all"
                >
                  Become a Mentor
                </Link>
              </div>

              {/* Social Proof Stats */}
              <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span><strong className="text-slate-900 font-semibold">100+</strong> Expert Mentors</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span><strong className="text-slate-900 font-semibold">4.9/5</strong> Average Rating</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span><strong className="text-slate-900 font-semibold">1,000+</strong> Sessions Completed</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section - Cards with icons */}
        <section className="py-20 sm:py-32 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 mb-4 tracking-tight">
                Why choose Mentorly?
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Everything you need to grow your career with expert guidance
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="card-modern p-8 group">
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  World-Class Mentors
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Learn from engineers and leaders at top tech companies who have been where you want to go.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="card-modern p-8 group">
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Seamless Video Sessions
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Book and join sessions directly through Google Meet. No complicated setup required.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="card-modern p-8 group">
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Flexible Scheduling
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Find mentors available at times that work for you. Book sessions in minutes.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="card-modern p-8 group">
                <div className="w-12 h-12 rounded-lg gradient-success flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Guaranteed Quality
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Every mentor is carefully vetted. If you're not satisfied, we'll make it right.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="card-modern p-8 group">
                <div className="w-12 h-12 rounded-lg gradient-success flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Rapid Growth
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Get actionable advice and personalized guidance to accelerate your career trajectory.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="card-modern p-8 group">
                <div className="w-12 h-12 rounded-lg gradient-success flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  Secure Platform
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Your data and payments are protected with enterprise-grade security.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section - Minimal and clean */}
        <section className="py-20 sm:py-32">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="card-modern p-12 sm:p-16 text-center">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 mb-4 tracking-tight">
                  Ready to accelerate your growth?
                </h2>
                <p className="text-lg text-slate-600 mb-8">
                  Join thousands of professionals who are learning from the best in the industry.
                </p>
                <Link
                  href="/explore"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
                >
                  Get Started Today
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Minimal */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-900">Mentorly</span>
            </div>
            <p className="text-sm text-slate-600">
              &copy; {new Date().getFullYear()} Mentorly. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
