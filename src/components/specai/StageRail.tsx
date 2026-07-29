import React from 'react';
import { SpecAiState, SpecStageKey } from '../../types/specai';
import { SPEC_STAGES, stageStateFor } from '../../data/specai';
import { stageDetail } from '../../data/specai';
import { Check, Circle, Lock } from 'lucide-react';

/** Share of the pipeline that is version-locked. */
const readiness = (state: SpecAiState): number =>
  Math.round((state.lockedStages.length / SPEC_STAGES.length) * 100);

/**
 * The pipeline spine. A persistent rail showing where you are, what is locked
 * behind you, and what is not yet reachable — the thing that makes Spec AI read
 * as one continuous tool rather than five stapled screens.
 */
export const StageRail: React.FC<{
  state: SpecAiState;
  activeKey: SpecStageKey;
  onSelect: (key: SpecStageKey) => void;
}> = ({ state, activeKey, onSelect }) => (
  <nav className="shrink-0 lg:w-56" aria-label="Spec AI pipeline stages">
    <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
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
                  : stage.title
              }
              className={`flex min-w-[10rem] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all lg:min-w-0 ${
                isActive
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : lockedOut
                  ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                  : 'cursor-pointer border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  status === 'Locked'
                    ? 'bg-emerald-100 text-emerald-700'
                    : status === 'Current'
                    ? 'bg-blue-600 text-white'
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
                  className={`block truncate text-xs font-bold ${
                    lockedOut ? 'text-slate-400' : 'text-slate-900'
                  }`}
                >
                  {stage.railLabel}
                </span>
                <span
                  className={`block text-[10px] font-semibold ${
                    status === 'Locked'
                      ? 'text-emerald-600'
                      : status === 'Current'
                      ? 'text-blue-600'
                      : 'text-slate-400'
                  }`}
                >
                  {status === 'Locked'
                    ? '● Locked'
                    : status === 'Current'
                    ? '● Current'
                    : '● Locked out'}
                </span>
                {/* What is actually in this stage right now */}
                <span className="block truncate text-[9px] text-slate-400">
                  {stageDetail(stage.key, state)}
                </span>
              </span>
            </button>

            {/* Connector between rail entries, vertical on desktop */}
            {idx < SPEC_STAGES.length - 1 && (
              <div className="hidden justify-start pl-[1.4rem] lg:flex" aria-hidden="true">
                <Circle className="h-1 w-1 fill-slate-300 text-slate-300" />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>

    {/* Readiness — how much of the pipeline is settled */}
    <div className="mt-4 hidden rounded-xl border border-slate-200 bg-white p-3 lg:block">
      <strong className="text-[11px] font-extrabold text-slate-900">Workspace readiness</strong>
      <div className="my-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500"
          style={{ width: `${readiness(state)}%` }}
        />
      </div>
      <small className="text-[10px] text-slate-500">{readiness(state)}% locked</small>
    </div>
  </nav>
);
