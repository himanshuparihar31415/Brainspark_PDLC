import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecStageKey } from '../../types/specai';
import {
  StoryTrack,
  canEditSpecAi,
  canLockStage,
  stageDef,
  stageStateFor,
} from '../../data/specai';
import { StageRail } from '../specai/StageRail';
import { GateButton, GateNote } from '../specai/StageGate';
import { StatusBar } from '../specai/StatusBar';
import { Stage1Knowledge } from '../specai/Stage1Knowledge';
import { Stage2Understanding } from '../specai/Stage2Understanding';
import { Stage3Artifacts } from '../specai/Stage3Artifacts';
import { Stage4Modules } from '../specai/Stage4Modules';
import { Stage5Stories } from '../specai/Stage5Stories';
import { Eye, AlertTriangle, GitBranch } from 'lucide-react';

const STAGE_ORDER: SpecStageKey[] = [
  'knowledge',
  'understanding',
  'artifacts',
  'modules',
  'stories',
];

/**
 * Spec AI module shell. Full-screen: the platform nav collapses on entry and the
 * header carries the module context, so the stage rail is the only left rail and
 * the working surface gets everything else.
 */
export const SpecAiView: React.FC = () => {
  const {
    currentScope,
    currentRole,
    projects,
    agents,
    specAiFor,
    lockSpecStage,
    goToSpecStage,
    runBoardAction,
  } = useApp();

  const project = projects.find((p) => p.id === currentScope.projectId) ?? projects[0];
  const state = specAiFor(project?.id ?? '');

  const [viewing, setViewing] = useState<SpecStageKey>(state.currentStage);
  /**
   * Board selection lives here because the stage header acts on it too — the
   * copilot, the selection bar, and Find conflicts all reason over one selection.
   */
  const [selected, setSelected] = useState<string[]>([]);
  const [track, setTrack] = useState<StoryTrack | 'All'>('All');

  const readOnly = !canEditSpecAi(currentRole);
  const stage = stageDef(viewing);
  const isLocked = stageStateFor(viewing, state) === 'Locked';
  const gate = canLockStage(viewing, state);

  const specDegraded = agents.some((a) => a.id === 'agent-specai' && a.status !== 'Active');

  /** Stage 1 fills the viewport; the document stages scroll. */
  const fills = viewing === 'knowledge';

  const select = (key: SpecStageKey, nextTrack?: StoryTrack) => {
    if (stageStateFor(key, state) === 'Locked out') {
      goToSpecStage(state.projectId, key); // surfaces the gating message
      return;
    }
    setViewing(key);
    if (key === 'stories') setTrack(nextTrack ?? 'All');
  };

  if (!project) {
    return (
      <div className="p-6">
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-500">
          No project is in scope.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 lg:flex-row lg:gap-4 lg:p-5">
        <StageRail state={state} activeKey={viewing} onSelect={select} activeTrack={track} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          {/* Stage header — identity on the left, the gate on the right */}
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[19px] font-extrabold leading-tight tracking-tight text-slate-900">
                {stage.title}
              </h2>
              <p className="mt-1 text-[11.5px] text-slate-500">{stage.subtitle}</p>
              <GateNote check={gate} locked={isLocked} readOnly={readOnly} />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {readOnly && (
                <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[10px] font-semibold text-slate-600">
                  <Eye className="h-3 w-3 text-slate-400" />
                  Read-only — Spec AI is the PM and Architect’s pipeline
                </span>
              )}

              {viewing === 'knowledge' && !readOnly && (
                <button
                  onClick={() => {
                    runBoardAction(state.projectId, 'conflicts', selected);
                    setSelected([]);
                  }}
                  disabled={isLocked || selected.length < 2}
                  title={
                    selected.length < 2
                      ? 'Select at least two cards — a disagreement is between two things you point at.'
                      : 'Check whether the selected cards agree'
                  }
                  className={`rounded-lg border px-3.5 py-2 text-xs font-bold transition-colors ${
                    isLocked || selected.length < 2
                      ? 'cursor-not-allowed border-slate-200 bg-white text-slate-300'
                      : 'cursor-pointer border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  <GitBranch className="mr-1.5 inline h-3.5 w-3.5" />
                  Compare sources
                </button>
              )}

              {viewing !== 'stories' && (
                <GateButton
                  label={stage.gateLabel}
                  check={gate}
                  locked={isLocked}
                  readOnly={readOnly}
                  confirm={
                    viewing === 'understanding'
                      ? {
                          title: 'Lock Project Understanding?',
                          body: 'Downstream artifacts will be generated from this locked version.',
                        }
                      : undefined
                  }
                  onLock={() => {
                    lockSpecStage(state.projectId, viewing);
                    const next = STAGE_ORDER[STAGE_ORDER.indexOf(viewing) + 1];
                    if (next) setViewing(next);
                  }}
                />
              )}
            </div>
          </header>

          {specDegraded && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
              <span className="text-[11px] font-bold text-amber-900">
                Spec AI generation is degraded right now. See My Services.
              </span>
            </div>
          )}

          <div
            className={
              fills ? 'flex min-h-0 flex-1 flex-col' : 'min-h-0 flex-1 overflow-y-auto pr-0.5'
            }
          >
            {viewing === 'knowledge' && (
              <Stage1Knowledge
                state={state}
                readOnly={readOnly}
                locked={isLocked}
                selectedIds={selected}
                onSelectionChange={setSelected}
              />
            )}
            {viewing === 'understanding' && (
              <Stage2Understanding state={state} readOnly={readOnly} locked={isLocked} />
            )}
            {viewing === 'artifacts' && (
              <Stage3Artifacts state={state} readOnly={readOnly} locked={isLocked} />
            )}
            {viewing === 'modules' && (
              <Stage4Modules state={state} readOnly={readOnly} locked={isLocked} />
            )}
            {viewing === 'stories' && (
              <Stage5Stories
                state={state}
                readOnly={readOnly}
                onViewSource={setViewing}
                track={track}
                onTrackChange={setTrack}
              />
            )}
          </div>
        </div>
      </div>

      <StatusBar state={state} />
    </div>
  );
};
