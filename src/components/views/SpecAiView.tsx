import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SpecStageKey } from '../../types/specai';
import {
  activeStage,
  canEditSpecAi,
  canLockStage,
  stageDef,
  stageStateFor,
} from '../../data/specai';
import { StageRail } from '../specai/StageRail';
import { GateBar } from '../specai/GateBar';
import { Stage1Knowledge } from '../specai/Stage1Knowledge';
import { Stage2Understanding } from '../specai/Stage2Understanding';
import { Stage3Architecture } from '../specai/Stage3Architecture';
import { Stage4Modules } from '../specai/Stage4Modules';
import { Stage5Stories } from '../specai/Stage5Stories';
import { ChevronLeft, Eye, User, AlertTriangle } from 'lucide-react';

/**
 * Spec AI module shell. The stage rail is the spine: it makes the gated pipeline
 * legible so five screens read as one continuous tool.
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
    setActiveNav,
  } = useApp();

  const project =
    projects.find((p) => p.id === currentScope.projectId) ?? projects[0];
  const state = specAiFor(project?.id ?? '');

  // Which stage the user is looking at; defaults to the furthest workable one.
  const [viewingStage, setViewingStage] = useState<SpecStageKey>(
    state.currentStage ?? activeStage(state)
  );

  const readOnly = !canEditSpecAi(currentRole);
  const stage = stageDef(viewingStage);
  const stageState = stageStateFor(viewingStage, state);
  const isLocked = stageState === 'Locked';
  const gate = canLockStage(viewingStage, state);

  // Spec AI's own agent is the only agent-awareness in the workspace.
  const specAgentDegraded = agents.some(
    (a) => a.id === 'agent-specai' && a.status !== 'Active'
  );

  const selectStage = (key: SpecStageKey) => {
    if (stageStateFor(key, state) === 'Locked out') {
      goToSpecStage(state.projectId, key); // surfaces the gating message
      return;
    }
    setViewingStage(key);
  };

  const jumpToArtifact = (target: SpecStageKey) => setViewingStage(target);

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl p-6 md:p-8">
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-500">
          No project is in scope.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in space-y-5 p-6 duration-200 md:p-8">
      {/* ── Module shell header */}
      <div className="space-y-3">
        <button
          onClick={() => setActiveNav('Command Centre')}
          className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
        >
          <ChevronLeft className="h-3 w-3" />
          Command Centre
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              Spec AI
            </h1>
            <p className="mt-1 text-xs text-slate-500 md:text-sm">
              {project.name} — requirements &amp; architecture
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Dual-persona presence */}
            {Object.keys(state.sectionEditors).length > 0 && (
              <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-600">
                PM and Architect both viewing
              </span>
            )}
            <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700">
              <User className="h-3 w-3 text-slate-400" />
              You: {currentRole}
            </span>
          </div>
        </div>
      </div>

      {readOnly && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
          <Eye className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-600">
            You have read-only access to this workspace. Spec AI is the Product Manager and
            Architect’s shared pipeline.
          </span>
        </div>
      )}

      {specAgentDegraded && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
          <span className="text-[11px] font-bold text-amber-900">
            Spec AI generation is degraded right now. See My Services.
          </span>
        </div>
      )}

      {/* ── Rail + stage body */}
      <div className="flex flex-col gap-5 lg:flex-row">
        <StageRail state={state} activeKey={viewingStage} onSelect={selectStage} />

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{stage.title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{stage.subtitle}</p>
          </div>

          {viewingStage === 'knowledge' && (
            <Stage1Knowledge state={state} readOnly={readOnly} locked={isLocked} />
          )}
          {viewingStage === 'understanding' && (
            <Stage2Understanding state={state} readOnly={readOnly} locked={isLocked} />
          )}
          {viewingStage === 'architecture' && (
            <Stage3Architecture state={state} readOnly={readOnly} locked={isLocked} />
          )}
          {viewingStage === 'modules' && (
            <Stage4Modules state={state} readOnly={readOnly} locked={isLocked} />
          )}
          {viewingStage === 'stories' && (
            <Stage5Stories
              state={state}
              readOnly={readOnly}
              onViewSource={(target) => jumpToArtifact(target)}
            />
          )}

          {/* The gate. Stage 5 exports rather than locking, so it has its own action. */}
          {viewingStage !== 'stories' && (
            <GateBar
              label={stage.gateLabel}
              check={gate}
              locked={isLocked}
              readOnly={readOnly}
              confirm={
                viewingStage === 'understanding'
                  ? {
                      title: 'Lock Project Understanding?',
                      body: 'Downstream architecture will be generated from this locked version.',
                    }
                  : undefined
              }
              onLock={() => {
                lockSpecStage(state.projectId, viewingStage);
                const next = stageDef(viewingStage).index + 1;
                const nextKey = (
                  ['knowledge', 'understanding', 'architecture', 'modules', 'stories'] as SpecStageKey[]
                )[next - 1];
                if (nextKey) setViewingStage(nextKey);
              }}
            />
          )}

          {/* Gate-lock permission note — either persona may lock, and it is logged. */}
          {!readOnly && viewingStage !== 'stories' && !isLocked && (
            <p className="text-[10px] text-slate-400">
              Either PM or Architect can lock a stage; the action is logged. Simultaneous edits to
              the same field are resolved last-write-wins and versioned.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
