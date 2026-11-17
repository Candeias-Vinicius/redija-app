import React, { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface HomeSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform);

/** Busca de trabalhos da Home, com atalho Ctrl/⌘ + K para focar de qualquer lugar. */
export const HomeSearchField: React.FC<HomeSearchFieldProps> = ({
  value,
  onChange,
  className = 'flex-1 min-w-0 max-w-xl',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div role="search" className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        id="home-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar trabalhos…"
        aria-label="Buscar trabalhos"
        aria-keyshortcuts={isMac ? 'Meta+K' : 'Control+K'}
        autoComplete="off"
        className="w-full h-9 pl-9 pr-3 sm:pr-16 rounded-lg border bg-surface text-sm text-fg placeholder:text-slate-500"
      />
      <kbd
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded border border-line bg-surface px-1.5 py-0.5 font-sans text-xs text-slate-500"
        aria-hidden="true"
      >
        {isMac ? '⌘' : 'Ctrl'} K
      </kbd>
    </div>
  );
};
