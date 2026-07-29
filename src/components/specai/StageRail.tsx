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
import { Check, Lock } from 'lucide-react';

/**
 * The pipeline spine. A persistent rail showing where you are, what is locked
 * behind you, and what is not yet reachable — the thing that makes Spec AI read
 * as one continuous tool rather than five stapled screens.
 *
 * Stage five carries two sub-entries, because a backlog splits into work a
 * stakeholder can accept and work that only exists because of the build.
 */
export const StageRail: React.FC<{
  state: SpecAiState;
  activeKey: SpecStageKey;
  /** A track is passed only from the story sub-entries. */
  onSelect: (key: SpecStageKey, track?: StoryTrack) => void;
  activeTrack: StoryTrack | 'All';
}> = ({ state, activeKey, onSelect, activeTrack }) => {
  const progress = workspaceProgress(state);
  const trackCounts = storyTrackCounts(state);

  return (
    <nav
      className="flex shrink-0 flex-col lg:h-full lg:w-52 xl:w-56"
      aria-label="Spec AI pipeline stages"
    >
      <div className="hidden px-2.5 pb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 lg:block">
        Pipeline
      </div>

      <div className="flex min-h-0 gap-2 overflow-x-auto pb-1 lg:flex-1 lg:flex-col lg:gap-0 lg:overflow-x-visible lg:overflow-y-auto">
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
                  lockedOut ? 'Finish and lock the previous stage to continue.' : stage.subtitle
                }
                className={`flex min-w-[11rem] items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all lg:min-w-0 ${
                  isActive
                    ? 'border-indigo-200 bg-indigo-50/80 shadow-sm'
                    : lockedOut
                    ? 'cursor-not-allowed border-transparent opacity-55'
                    : 'cursor-pointer border-transparent hover:bg-slate-100/80'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
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
                    <Check className="h-3 w-3" />
                  ) : lockedOut ? (
                    <Lock className="h-2.5 w-2.5" />
                  ) : (
                    stage.index
                  )}
                </span>

                <span className="min-w-0">
                  <span
                    className={`block truncate text-[11.5px] font-bold leading-tight ${
                      lockedOut ? 'text-slate-400' : 'text-slate-900'
                    }`}
                  >
                    {stage.railLabel}
                  </span>
                  <span className="mt-0.5 block truncate text-[9.5px] leading-tight text-slate-500">
                    {status === 'Locked' ? 'Locked · ' : status === 'Current' ? 'Current · ' : ''}
                    {stageDetail(stage.key, state)}
                  </span>
                </span>
              </button>

              {/* Story tracks hang off stage five. Shown even at zero, so the shape
                  of the backlog is visible before it has been generated. */}
              {stage.key === 'stories' && (
                <div className="hidden lg:block">
                  {STORY_TRACKS.map((track) => {
                    const count = trackCounts[track];
                    const on = activeKey === 'stories' && activeTrack === track;

                    return (
                      <button
                        key={track}
                        onClick={() => onSelect('stories', track)}
                        disabled={lockedOut}
                        className={`ml-[1.55rem] flex w-[calc(100%-1.55rem)] items-center gap-2 border-l py-1 pl-3 pr-2 text-left transition-colors ${
                          on
                            ? 'border-indigo-400 text-indigo-700'
                            : 'border-slate-200 text-slate-500 hover:text-slate-800'
                        } ${lockedOut ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'}`}
                      >
                        <span className="min-w-0 flex-1 truncate text-[10px] font-semibold">
                          {track}
                        </span>
                        <span className="shrink-0 text-[9.5px] font-bold tabular-nums text-slate-400">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Spine segment between entries */}
              {idx < SPEC_STAGES.length - 1 && (
                <div className="hidden lg:block" aria-hidden="true">
                  <div className="ml-[1.55rem] h-2.5 w-px bg-slate-200" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* How much of the workspace has actually been looked at */}
      <div className="mt-3 hidden rounded-xl border border-slate-200 bg-white p-3 lg:block">
        <strong className="text-[10.5px] font-extrabold text-slate-900">Workspace readiness</strong>
        <div
          className="my-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <small className="text-[10px] text-slate-500">{progress}% reviewed</small>
      </div>
    </nav>
  );
};
