import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecStageKey } from '../../types/specai';
import {
  StoryTrack,
  canEditSpecAi,
  stageDef,
  stageGateWarnings,
  stageStateFor,
} from '../../data/specai';
import { StageStrip } from '../specai/StageStrip';
import { StageFooter } from '../specai/StageFooter';
import { StatusBar } from '../specai/StatusBar';
import { Stage1Knowledge } from '../specai/Stage1Knowledge';
import { Stage2Understanding } from '../specai/Stage2Understanding';
import { Stage3Artifacts } from '../specai/Stage3Artifacts';
import { Stage4Modules } from '../specai/Stage4Modules';
import { Stage5Stories } from '../specai/Stage5Stories';

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
 *
 * The forward action lives at the foot of the workspace rather than in the header
 * row, so every stage answers "and then?" in the same corner.
 */
export const SpecAiView: React.FC = () => {
  const { currentScope, currentRole, projects, specAiFor, lockSpecStage, goToSpecStage } = useApp();

  const project = projects.find((p) => p.id === currentScope.projectId) ?? projects[0];
  const state = specAiFor(project?.id ?? '');

  const [viewing, setViewing] = useState<SpecStageKey>(state.currentStage);
  const [track, setTrack] = useState<StoryTrack | 'All'>('All');

  const readOnly = !canEditSpecAi(currentRole);
  const isLocked = stageStateFor(viewing, state) === 'Locked';
  const warnings = stageGateWarnings(viewing, state);
  const next = STAGE_ORDER[STAGE_ORDER.indexOf(viewing) + 1];

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
        <p className="glass-panel rounded-2xl border border-white/60 px-4 py-8 text-center text-xs text-slate-500">
          No project is in scope.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3 lg:p-4">
        {/*
          The strip is the only thing that always holds a row. No stage title — it
          already says which stage you are on, and a heading repeating it was the
          largest thing on screen saying the least.
        */}
        <StageStrip state={state} activeKey={viewing} onSelect={select} activeTrack={track} />

        <div
          className={
            fills
              ? 'flex min-h-0 min-w-0 flex-1 flex-col'
              : 'min-h-0 min-w-0 flex-1 overflow-y-auto pr-0.5'
          }
        >
          {viewing === 'knowledge' && (
            <Stage1Knowledge state={state} readOnly={readOnly} locked={isLocked} />
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

        <StageFooter
          /* The strip's own label, so the button names the segment it moves to. */
          nextTitle={next ? stageDef(next).railLabel : undefined}
          warnings={warnings}
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
          onLockAndContinue={() => {
            lockSpecStage(state.projectId, viewing);
            if (next) select(next);
          }}
          onContinue={() => next && select(next)}
        />
      </div>

      <StatusBar state={state} />
    </div>
  );
};
