import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ArrowRight, Command } from 'lucide-react';

export interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  category?: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  items: PaletteItem[];
  isOpen: boolean;
  onClose: () => void;
  placeholder?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  items,
  isOpen,
  onClose,
  placeholder = 'Search commands, views, agents…',
}) => {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query) return items.slice(0, 12);
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [items, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && filtered[activeIdx]) {
        filtered[activeIdx].action();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, filtered, activeIdx, onClose]);

  if (!isOpen) return null;

  const grouped: Record<string, PaletteItem[]> = {};
  for (const item of filtered) {
    const cat = item.category ?? 'Actions';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="material-smoke absolute inset-0" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg material-acrylic-strong elevation-dialog rounded-2xl border border-white/60 overflow-hidden animate-in fade-in zoom-in-95"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            placeholder={placeholder}
            className="flex-1 bg-transparent type-body-large text-slate-900 outline-none placeholder:text-slate-400"
          />
          <kbd className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 type-caption font-bold text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-6 text-center type-body text-slate-400">No matching commands.</div>
          ) : (
            Object.entries(grouped).map(([category, categoryItems]: [string, PaletteItem[]]) => (
              <div key={category}>
                <div className="px-3 pt-2 pb-1 type-caption font-bold uppercase tracking-wider text-slate-400">
                  {category}
                </div>
                {categoryItems.map((item) => {
                  const idx = filtered.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => { item.action(); onClose(); }}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        idx === activeIdx ? 'bg-indigo-50/80 text-indigo-900' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {item.icon && <span className="shrink-0 text-slate-400">{item.icon}</span>}
                      <div className="min-w-0 flex-1">
                        <div className="type-body-strong truncate">{item.label}</div>
                        {item.description && (
                          <div className="type-caption text-slate-400 truncate">{item.description}</div>
                        )}
                      </div>
                      {item.shortcut && (
                        <kbd className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 type-caption font-mono text-slate-400">
                          {item.shortcut}
                        </kbd>
                      )}
                      {idx === activeIdx && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-indigo-500" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2 type-caption text-slate-400">
          <span className="flex items-center gap-1"><Command className="h-3 w-3" />K to open</span>
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
};
