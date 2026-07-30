import React from 'react';
import { SpecAiState, SpecStageKey } from '../../types/specai';
import {
  SPEC_STAGES,
  STORY_TRACKS,
  StoryTrack,
  stageDetail,
  stageStateFor,
  storyTrackCounts,
  workspaceProgress,
} from '../../data/specai';
import { Check, ChevronRight, Lock } from 'lucide-react';

/**
 * The pipeline, as a strip across the top. Horizontal because the stages are the
 * one piece of navigation that is always relevant and never worth a column —
 * across the top it costs one line and leaves the full width to the work.
 */
export const StageStrip: React.FC<{
  state: SpecAiState;
  activeKey: SpecStageKey;
  /** A track is passed only from the story sub-pills. */
  onSelect: (key: SpecStageKey, track?: StoryTrack) => void;
  activeTrack: StoryTrack | 'All';
}> = ({ state, activeKey, onSelect, activeTrack }) => {
  const progress = workspaceProgress(state);
  const trackCounts = storyTrackCounts(state);

  return (
    <nav
      className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white px-2 py-1.5"
      aria-label="Spec AI pipeline stages"
    >
      <span className="mr-1 hidden shrink-0 text-[8.5px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:block">
        Pipeline
      </span>

      {SPEC_STAGES.map((stage, idx) => {
        const status = stageStateFor(stage.key, state);
        const isActive = stage.key === activeKey;
        const lockedOut = status === 'Locked out';

        return (
          <React.Fragment key={stage.key}>
            <button
              onClick={() => onSelect(stage.key)}
              disabled={lockedOut}
              title={
                lockedOut
                  ? 'Finish and lock the previous stage to continue.'
                  : `${stage.title} — ${stageDetail(stage.key, state)}`
              }
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 transition-colors ${
                isActive
                  ? 'bg-indigo-50'
                  : lockedOut
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer hover:bg-slate-100'
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${
                  status === 'Locked'
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-indigo-600 text-white'
                    : status === 'Current'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-200 text-slate-400'
                }`}
              >
                {status === 'Locked' ? (
                  <Check className="h-2.5 w-2.5" />
                ) : lockedOut ? (
                  <Lock className="h-2 w-2" />
                ) : (
                  stage.index
                )}
              </span>

              <span
                className={`whitespace-nowrap text-[10px] font-bold ${
                  isActive ? 'text-indigo-700' : lockedOut ? 'text-slate-400' : 'text-slate-700'
                }`}
              >
                {stage.railLabel}
              </span>

              {/* Only the stage in hand spends space on its detail. */}
              {isActive && (
                <span className="hidden whitespace-nowrap text-[9px] text-slate-400 lg:inline">
                  {stageDetail(stage.key, state)}
                </span>
              )}
            </button>

            {/* Story tracks appear only while you are on that stage. */}
            {stage.key === 'stories' && isActive && (
              <span className="flex shrink-0 items-center gap-1">
                {STORY_TRACKS.map((track) => (
                  <button
                    key={track}
                    onClick={() => onSelect('stories', track)}
                    className={`cursor-pointer whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[9px] font-bold transition-colors ${
                      activeTrack === track
                        ? 'border-indigo-500 bg-indigo-600 text-white'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {track === 'Non-technical' ? 'Non-tech' : 'Technical'}
                    <span
                      className={`ml-1 ${
                        activeTrack === track ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {trackCounts[track]}
                    </span>
                  </button>
                ))}
              </span>
            )}

            {idx < SPEC_STAGES.length - 1 && (
              <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" aria-hidden="true" />
            )}
          </React.Fragment>
        );
      })}

      {/* How much of the workspace has actually been looked at */}
      <div
        className="ml-auto hidden shrink-0 items-center gap-1.5 pl-2 md:flex"
        title={`${progress}% of the pipeline reviewed`}
      >
        <span className="h-1 w-14 overflow-hidden rounded-full bg-slate-100">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500"
            style={{ width: `${progress}%` }}
          />
        </span>
        <span className="whitespace-nowrap text-[9px] font-bold text-slate-400">
          {progress}% reviewed
        </span>
      </div>
    </nav>
  );
};
