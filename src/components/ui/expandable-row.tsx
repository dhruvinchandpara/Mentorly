'use client';

import { useState, type ReactNode, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type ExpandableRowProps = {
  summary: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
};

export function ExpandableRow({
  summary,
  children,
  defaultExpanded = false,
  className,
}: ExpandableRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggle = () => setExpanded((e) => !e);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <div
      className={cn(
        'bg-white border border-border/60 rounded-[16px] shadow-sm hover:shadow-md transition-all',
        className
      )}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className="flex items-center justify-between gap-3 p-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5E55A] rounded-[16px]"
      >
        <div className="flex-1 min-w-0">{summary}</div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-[#7C8585] flex-shrink-0 transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-3">{children}</div>
      )}
    </div>
  );
}
