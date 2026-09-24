'use client';

import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { PreSessionQueue } from './components/pre-session-queue';
import { PostSessionQueue } from './components/post-session-queue';

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<'pre' | 'post'>('pre');
  const [preCount, setPreCount] = useState(0);
  const [postCount, setPostCount] = useState(0);

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

      <div className="flex items-center gap-3 border-b border-border">
        <button
          onClick={() => setActiveTab('pre')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pre'
              ? 'border-[#0F1919] text-[#0F1919]'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Pre-session ({preCount})
        </button>
        <button
          onClick={() => setActiveTab('post')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'post'
              ? 'border-[#0F1919] text-[#0F1919]'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Post-session ({postCount})
        </button>
      </div>

      <div className={activeTab === 'pre' ? '' : 'hidden'}>
        <PreSessionQueue onCountChange={setPreCount} />
      </div>
      <div className={activeTab === 'post' ? '' : 'hidden'}>
        <PostSessionQueue onCountChange={setPostCount} />
      </div>
    </div>
  );
}
