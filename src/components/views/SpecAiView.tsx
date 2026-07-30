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
import { StageStrip } from '../specai/StageStrip';
import { GateButton } from '../specai/StageGate';
import { StatusBar } from '../specai/StatusBar';
import { Stage1Knowledge } from '../specai/Stage1Knowledge';
import { Stage2Understanding } from '../specai/Stage2Understanding';
import { Stage3Artifacts } from '../specai/Stage3Artifacts';
import { Stage4Modules } from '../specai/Stage4Modules';
import { Stage5Stories } from '../specai/Stage5Stories';
import { Eye, GitBranch } from 'lucide-react';

const STAGE_ORDER: SpecStageKey[] = [
  'knowledge',
  'understanding',
  'artifacts',
  'modules',
  'stories',
];

/**
 * Spec AI module shell. Full-screen: the platform nav collapses on entry, and the
 * stage strip across the top is the only chrome — there is no stage heading,
 * because the strip already says where you are.
 */
export const SpecAiView: React.FC = () => {
  const {
    currentScope,
    currentRole,
    projects,
    specAiFor,
    lockSpecStage,
    goToSpecStage,
    runBoardAction,
  } = useApp();

  const project = projects.find((p) => p.id === currentScope.projectId) ?? projects[0];
  const state = specAiFor(project?.id ?? '');

  const [viewing, setViewing] = useState<SpecStageKey>(state.currentStage);
  /**
   * Board selection lives here because the action row acts on it too — the agent,
   * the selection bar, and Compare sources all reason over one selection.
   */
  const [selected, setSelected] = useState<string[]>([]);
  const [track, setTrack] = useState<StoryTrack | 'All'>('All');

  const readOnly = !canEditSpecAi(currentRole);
  const stage = stageDef(viewing);
  const isLocked = stageStateFor(viewing, state) === 'Locked';
  const gate = canLockStage(viewing, state);

  /** Stage 1 fills the viewport; the document stages scroll. */
  const fills = viewing === 'knowledge';

  const select = (key: SpecStageKey, nextTrack?: StoryTrack) => {
    setViewing(key);
    goToSpecStage(state.projectId, key);
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
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-3 lg:p-4">
        <div className="flex flex-wrap items-stretch gap-2">
          <div className="min-w-0 flex-1">
            <StageStrip state={state} activeKey={viewing} onSelect={select} activeTrack={track} />
          </div>
          {/*
            No stage title. The strip already says which stage you are on, and a
            heading repeating it was the largest thing on screen saying the least.
            Only the actions survive, on one slim row.
          */}
          {(viewing !== 'stories' || readOnly) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {readOnly && (
                <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                  <Eye className="h-3 w-3 text-slate-400" />
                  Read-only — Spec AI belongs to the PM and Architect
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
                  className={`rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                    isLocked || selected.length < 2
                      ? 'cursor-not-allowed border-slate-200 bg-white text-slate-300'
                      : 'cursor-pointer border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  <GitBranch className="mr-1.5 inline h-3 w-3" />
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
          )}
        </div>

        <div
          className={
            fills
              ? 'flex min-h-0 min-w-0 flex-1 flex-col'
              : 'min-h-0 min-w-0 flex-1 overflow-y-auto pr-0.5'
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

      <StatusBar state={state} />
    </div>
  );
};
