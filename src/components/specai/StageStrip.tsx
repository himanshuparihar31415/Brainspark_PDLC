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
import { Check } from 'lucide-react';

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
      className="flex items-stretch gap-1.5 overflow-x-auto"
      aria-label="Spec AI pipeline stages"
    >
      {SPEC_STAGES.map((stage) => {
        const status = stageStateFor(stage.key, state);
        const isActive = stage.key === activeKey;
        const ahead = status === 'Ahead';

        return (
          <button
            key={stage.key}
            onClick={() => onSelect(stage.key)}
            title={
              ahead
                ? `${stage.title} — nothing upstream is locked yet, so this is provisional`
                : `${stage.title} — ${stageDetail(stage.key, state)}`
            }
            /*
             * Every stage is its own segment at equal width. Uniform because none
             * of them is more important than the others until you are standing on
             * it, and equal segments make progress readable at a glance.
             */
            className={`platform-card flex min-w-[8.5rem] flex-1 cursor-pointer flex-col justify-center gap-1 px-2.5 py-2 text-left ${
              isActive
                ? '!border-indigo-300/70 !bg-indigo-50/70'
                : ahead
                ? '!border-dashed !border-slate-200/80 text-slate-400'
                : ''
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${
                  status === 'Locked'
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-indigo-600 text-white'
                    : ahead
                    ? 'bg-slate-200 text-slate-500'
                    : 'bg-slate-700 text-white'
                }`}
              >
                {status === 'Locked' ? <Check className="h-2.5 w-2.5" /> : stage.index}
              </span>

              <span
                className={`min-w-0 flex-1 truncate text-[10px] font-bold ${
                  isActive ? 'text-indigo-700' : ahead ? 'text-slate-500' : 'text-slate-700'
                }`}
              >
                {stage.railLabel}
              </span>
            </span>

            {/* Second line: the story tracks on that stage, its detail otherwise */}
            {stage.key === 'stories' && isActive ? (
              <span className="flex items-center gap-1">
                {STORY_TRACKS.map((t) => (
                  <span
                    key={t}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect('stories', t);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        onSelect('stories', t);
                      }
                    }}
                    className={`cursor-pointer rounded border px-1 py-px text-[8.5px] font-bold ${
                      activeTrack === t
                        ? 'border-indigo-500 bg-indigo-600 text-white'
                        : 'border-slate-200 bg-white text-slate-500'
                    }`}
                  >
                    {t === 'Non-technical' ? 'Non-tech' : 'Tech'} {trackCounts[t]}
                  </span>
                ))}
              </span>
            ) : (
              <span
                className={`truncate text-[9px] ${
                  status === 'Locked'
                    ? 'text-emerald-600'
                    : isActive
                    ? 'text-indigo-500'
                    : 'text-slate-400'
                }`}
              >
                {ahead ? 'not locked yet' : stageDetail(stage.key, state)}
              </span>
            )}
          </button>
        );
      })}

      {/* Progress, sized to sit as one more segment rather than crowd a corner */}
      <div
        className="platform-card hidden w-24 shrink-0 flex-col justify-center gap-1 px-2.5 py-2 xl:flex"
        title={`${progress}% of the pipeline reviewed`}
      >
        <span className="text-[9px] font-bold text-slate-500">{progress}% reviewed</span>
        <span className="h-1 overflow-hidden rounded-full bg-slate-100">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500"
            style={{ width: `${progress}%` }}
          />
        </span>
      </div>
    </nav>
  );
};
