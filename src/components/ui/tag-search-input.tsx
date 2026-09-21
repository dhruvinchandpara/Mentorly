'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNameSuggestions } from './tag-search-logic';

type TagSearchInputProps = {
  names: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
};

export function TagSearchInput({
  names,
  selected,
  onChange,
  placeholder,
  className,
}: TagSearchInputProps) {
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = getNameSuggestions(names, query, selected);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (name: string) => {
    onChange([...selected, name]);
    setQuery('');
    setHighlightedIndex(0);
    setOpen(false);
  };

  const removeTag = (name: string) => {
    onChange(selected.filter((t) => t !== name));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, Math.max(suggestions.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[highlightedIndex]) addTag(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Backspace' && query === '' && selected.length > 0) {
      removeTag(selected[selected.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="flex flex-wrap items-center gap-2 min-h-12 px-3 py-2 bg-white border border-border/60 rounded-[14px] focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
        {selected.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-[#FBF4D7] text-[#0F1919] text-xs font-semibold"
          >
            {name}
            <button
              type="button"
              onClick={() => removeTag(name)}
              aria-label={`Remove ${name}`}
              className="p-0.5 rounded-full hover:bg-[#0F1919]/10"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightedIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder || 'Search by student or mentor name...' : ''}
          className="flex-1 min-w-[120px] outline-none text-sm text-foreground placeholder:text-[var(--fg-faint)] bg-transparent"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-border/60 rounded-[14px] shadow-md overflow-hidden">
          {suggestions.map((name, i) => (
            <button
              key={name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(name)}
              className={cn(
                'w-full text-left px-4 py-2 text-sm text-foreground',
                i === highlightedIndex ? 'bg-[#FBF4D7]' : 'hover:bg-muted'
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
