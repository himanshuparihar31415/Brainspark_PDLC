import React from 'react';
import { useApp } from '../../context/AppContext';
import { Filter, X } from 'lucide-react';

/**
 * Explains why a screen arrived pre-filtered. Shown when a dashboard tile or
 * module card redirects here with a NavIntent; dismissing it clears the filter.
 */
export const LandingNote: React.FC = () => {
  const { navIntent, clearNavIntent } = useApp();

  if (!navIntent?.note) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-2.5">
      <Filter className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
      <span className="flex-1 text-xs font-semibold text-indigo-900">{navIntent.note}</span>
      <button
        onClick={clearNavIntent}
        className="flex shrink-0 cursor-pointer items-center gap-1 text-[11px] font-bold text-indigo-600 transition-colors hover:text-indigo-800"
      >
        Clear
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};
