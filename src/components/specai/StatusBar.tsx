import React from 'react';
import { SpecSource, SpecAiState } from '../../types/specai';
import { workspaceStoryCompletion } from '../../data/completion';
import { Check, Cloud, CloudOff, Loader2 } from 'lucide-react';

/**
 * Bottom status: autosave, indexing, and delivery rollup — background facts with
 * nowhere else to live. Generation and brief freshness used to sit here too, until
 * the terminal grew its own pending turn and the brief its own out-of-date banner;
 * a status bar repeating the workspace is just a second place to read the same
 * thing and doubt which is current.
 */
export const StatusBar: React.FC<{ state: SpecAiState }> = ({ state }) => {
  const indexing: SpecSource[] = state.sources.filter(
    (s) => s.ingest === 'Parsing' || s.ingest === 'Queued'
  );
  const failed = state.sources.filter((s) => s.ingest === 'Failed');
  const indexed = state.sources.filter((s) => s.ingest === 'Indexed').length;
  const storyRollup = workspaceStoryCompletion(state.modules, state.stories);

  return (
    <div className="glass flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-white/50 px-5 py-2 text-[10px]">
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

      {storyRollup.total > 0 && (
        <span className="ml-auto flex items-center gap-1.5 text-slate-500">
          Module completion:{' '}
          <b className="text-slate-800">
            {storyRollup.done}/{storyRollup.total} · {storyRollup.percent}%
          </b>
        </span>
      )}

    </div>
  );
};
