import React from 'react';
import { SpecSource, SpecAiState } from '../../types/specai';
import { Check, Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react';

/**
 * Bottom status: autosave, indexing, generation and sync. Kept as a thin strip so
 * background state is always visible without competing with the workspace.
 */
export const StatusBar: React.FC<{ state: SpecAiState }> = ({ state }) => {
  const indexing: SpecSource[] = state.sources.filter(
    (s) => s.ingest === 'Parsing' || s.ingest === 'Queued'
  );
  const failed = state.sources.filter((s) => s.ingest === 'Failed');
  const indexed = state.sources.filter((s) => s.ingest === 'Indexed').length;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-slate-200 bg-white/80 px-5 py-2 text-[10px] backdrop-blur">
      {/* Autosave */}
      <span className="flex items-center gap-1.5">
        {state.saveState === 'Saved' ? (
          <>
            <Check className="h-3 w-3 text-emerald-600" />
            <span className="text-slate-500">Saved</span>
          </>
        ) : state.saveState === 'Saving' ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
            <span className="text-slate-500">Saving…</span>
          </>
        ) : (
          <>
            <CloudOff className="h-3 w-3 text-amber-600" />
            <span className="text-amber-700">Offline — changes queued</span>
          </>
        )}
      </span>

      {/* Indexing */}
      <span className="flex items-center gap-1.5">
        {indexing.length > 0 ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
            <span className="text-amber-700">Indexing {indexing[0].name}…</span>
          </>
        ) : failed.length > 0 ? (
          <>
            <CloudOff className="h-3 w-3 text-rose-600" />
            <span className="text-rose-700">
              {failed.length} source{failed.length === 1 ? '' : 's'} could not be read
            </span>
          </>
        ) : (
          <>
            <Cloud className="h-3 w-3 text-slate-400" />
            <span className="text-slate-500">
              {indexed} source{indexed === 1 ? '' : 's'} indexed
            </span>
          </>
        )}
      </span>

      {/* Generation */}
      {state.generating && (
        <span className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
          <span className="text-indigo-700">
            Generating {state.generating}… you can leave this page.
          </span>
        </span>
      )}

      {/* Brief freshness — the one background fact that changes what you should do */}
      {state.brief && (
        <span className="ml-auto flex items-center gap-1.5 text-slate-400">
          <RefreshCw className="h-3 w-3" />
          {state.brief.stale
            ? 'Brief is out of date'
            : `Brief v${state.brief.version} up to date`}
        </span>
      )}
    </div>
  );
};
