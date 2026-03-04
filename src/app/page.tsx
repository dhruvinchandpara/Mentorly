import Link from "next/link";
import { ArrowRight, CheckCircle, Star } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <header className="py-6 px-4 sm:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Mentorly
          </div>
          <div className="flex gap-4 items-center">
            <Link
              href="/explore"
              prefetch={false}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Explore Mentors
            </Link>
            <Link
              href="/login"
              prefetch={false}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/login"
              prefetch={false}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-lg shadow-indigo-500/30"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <section className="py-20 px-4 sm:px-8 max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-7xl font-bold text-slate-900 dark:text-white tracking-tight mb-8">
            Master your craft with <br />
            <span className="text-indigo-600">expert mentors</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-12">
            Connect with industry leaders, get personalized guidance, and accelerate your career growth with 1-on-1 mentorship.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/explore"
              className="px-8 py-4 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-xl shadow-indigo-500/40 flex items-center justify-center gap-2"
            >
              Find a Mentor <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 text-lg font-semibold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Become a Mentor
            </Link>
          </div>
        </section>

        <section className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400">
                  <Star className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">World-Class Mentors</h3>
                <p className="text-slate-600 dark:text-slate-400">Learn from engineers and leaders at top tech companies.</p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Guaranteed Satisfaction</h3>
                <p className="text-slate-600 dark:text-slate-400">If you're not satisfied with your session, we'll refund you.</p>
              </div>
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400">
                  <ArrowRight className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Career Growth</h3>
                <p className="text-slate-600 dark:text-slate-400">Get the guidance you need to take the next step in your career.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} Mentorly. All rights reserved.
      </footer>
    </div>
  );
}
