'use client';

import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { PreSessionQueue } from './components/pre-session-queue';
import { PostSessionQueue } from './components/post-session-queue';

export default function ApprovalsPage() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [activeTab, setActiveTab] = useState<'pre' | 'post'>('pre');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[20px] border border-border/60 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center">
            <ClipboardCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-foreground">Approvals</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review and act on pre-session requests and submitted session reports
            </p>
          </div>
        </div>
      </div>

      {!isDesktop && (
        <div className="inline-flex p-1 bg-[#FBF4D7] rounded-full">
          <button
            onClick={() => setActiveTab('pre')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'pre' ? 'bg-[#0F1919] text-[#FFFBF3]' : 'text-[#4A5454]'
            }`}
          >
            Pre-session
          </button>
          <button
            onClick={() => setActiveTab('post')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              activeTab === 'post' ? 'bg-[#0F1919] text-[#FFFBF3]' : 'text-[#4A5454]'
            }`}
          >
            Post-session
          </button>
        </div>
      )}

      {isDesktop ? (
        <div className="grid grid-cols-2 gap-6 items-start">
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
            <PreSessionQueue />
          </div>
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
            <PostSessionQueue />
          </div>
        </div>
      ) : activeTab === 'pre' ? (
        <PreSessionQueue />
      ) : (
        <PostSessionQueue />
      )}
    </div>
  );
}
