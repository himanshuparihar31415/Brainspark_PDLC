import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { OrchestrationPhase, Task } from '../../types';
import { TileKey } from './RollupTiles';
import { formatUsd } from '../../data/modules';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Circle,
  ChevronDown,
  ExternalLink,
  User,
  Hourglass,
  ArrowRight,
} from 'lucide-react';

const STATUS_DOT: Record<OrchestrationPhase['status'], { icon: React.ElementType; cls: string }> = {
  Completed: { icon: CheckCircle2, cls: 'text-emerald-600' },
  'In Progress': { icon: Clock, cls: 'text-indigo-600' },
  Blocked: { icon: AlertTriangle, cls: 'text-amber-600' },
  Pending: { icon: Circle, cls: 'text-slate-300' },
};

const STATUS_CHIP: Record<OrchestrationPhase['status'], string> = {
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'In Progress': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Blocked: 'bg-amber-50 text-amber-700 border-amber-200',
  Pending: 'bg-slate-100 text-slate-600 border-slate-200',
};

/**
 * One computed sentence answering "should I be worried today", derived from the
 * same numbers the tiles and rails already show.
 */
const healthHeadline = (
  completion: number,
  blockerCount: number,
  reviewCount: number
): { tone: 'good' | 'warn' | 'bad'; text: string } => {
  if (completion < 55) {
    return {
      tone: 'bad',
      text: `Behind — completion ${55 - completion}% under plan${
        blockerCount > 0 ? `, ${blockerCount} blocker${blockerCount === 1 ? '' : 's'}` : ''
      }.`,
    };
  }
  if (blockerCount > 0 || reviewCount > 2) {
    const parts: string[] = [];
    if (blockerCount > 0) parts.push(`${blockerCount} blocker${blockerCount === 1 ? '' : 's'}`);
    if (reviewCount > 2) parts.push('review backlog rising');
    return { tone: 'warn', text: `At risk — ${parts.join(', ')}.` };
  }
  return { tone: 'good', text: 'On track — no blockers, review queue clear.' };
};

interface ProjectPhaseStripProps {
  /** Which tile is filtering the strip in place, if any. */
  activeFilter: TileKey | null;
  completion: number;
}

/**
 * The Project Admin lower strip. Deliberately NOT the admin tiers' module
 * roll-up cards: this is one project's pipeline seen completely, which is the
 * question a Project Admin actually logs in with.
 */
export const ProjectPhaseStrip: React.FC<ProjectPhaseStripProps> = ({
  activeFilter,
  completion,
}) => {
  const {
    orchestrationPhases,
    tasks,
    currentScope,
    navigateTo,
    approveTaskArtifact,
    setActiveNav,
  } = useApp();

  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  const projectTasks = tasks.filter((t) => t.project === currentScope.projectName);
  const awaitingReview = projectTasks
    .filter((t) => t.status === 'Needs Approval')
    .sort((a, b) => (b.reviewHoursOpen ?? 0) - (a.reviewHoursOpen ?? 0));

  const blockerRows = orchestrationPhases.flatMap((p) =>
    (p.blockerDetails ?? []).map((b) => ({ ...b, phase: p.name }))
  );

  const health = healthHeadline(completion, blockerRows.length, awaitingReview.length);

  // Headcount tile filter → who is assigned to what right now.
  const showAssignments = activeFilter === 'headcount';
  // Cost modal footer → most expensive work surfaced in place.
  const showCosts = activeFilter === 'cost';

  const tasksForPhase = (phase: OrchestrationPhase): Task[] =>
    projectTasks.filter((t) => phase.name.toLowerCase().includes(t.module.toLowerCase()));

  const phaseCost = (phase: OrchestrationPhase): number =>
    tasksForPhase(phase).reduce((sum, t) => sum + (t.costUsd ?? 0), 0);

  // Completion tile filter → phases re-ordered worst-first, in place.
  const phases =
    activeFilter === 'completion'
      ? [...orchestrationPhases].sort((a, b) => a.completionPercent - b.completionPercent)
      : showCosts
      ? [...orchestrationPhases].sort((a, b) => phaseCost(b) - phaseCost(a))
      : orchestrationPhases;

  const toneCls =
    health.tone === 'good'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : health.tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-rose-200 bg-rose-50 text-rose-900';

  return (
    <div className="space-y-5 border-t border-slate-200 pt-6">
      {/* Health headline */}
      <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 ${toneCls}`}>
        {health.tone === 'good' ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0" />
        )}
        <span className="text-xs font-bold">{health.text}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            Where the project stands now
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {currentScope.projectName} · live phase pipeline
            {activeFilter === 'completion' && ' — sorted furthest behind first'}
            {showAssignments && ' — showing current assignments'}
            {showCosts && ' — sorted by attributed AI spend'}
          </p>
        </div>
        <button
          onClick={() => setActiveNav('Orchestration')}
          className="flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
        >
          <span className="hidden sm:inline">Open Orchestration Center</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Awaiting review — turns the dashboard from a report into a worklist */}
      {awaitingReview.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50/40">
          <div className="flex items-center justify-between border-b border-indigo-200 px-4 py-2.5">
            <span className="text-xs font-extrabold text-indigo-900">
              Awaiting review ({awaitingReview.length})
            </span>
            <button
              onClick={() => navigateTo('My Tasks')}
              className="flex cursor-pointer items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
            >
              Open queue <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-indigo-100">
            {awaitingReview.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <Hourglass className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-slate-900">{t.title}</div>
                  <div className="text-[10px] text-slate-500">
                    {t.module} · {t.assignee}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    (t.reviewHoursOpen ?? 0) > 24
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-white text-slate-600'
                  }`}
                  title="Review turnaround time so far"
                >
                  {t.reviewHoursOpen ?? 0}h open
                </span>
                <button
                  onClick={() => approveTaskArtifact(t.id)}
                  className="shrink-0 cursor-pointer rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white transition-colors hover:bg-indigo-700"
                >
                  Approve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase pipeline */}
      <div className="space-y-2">
        {phases.map((phase) => {
          const { icon: Dot, cls } = STATUS_DOT[phase.status];
          const isOpen = expandedPhase === phase.id;
          const phaseTasks = tasksForPhase(phase);

          return (
            <div
              key={phase.id}
              className={`overflow-hidden rounded-xl border transition-all ${
                isOpen ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 bg-white'
              }`}
            >
              <button
                onClick={() => setExpandedPhase(isOpen ? null : phase.id)}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
              >
                <Dot className={`h-4 w-4 shrink-0 ${cls}`} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs font-bold text-slate-900">{phase.name}</span>
                    {(phase.blockerDetails?.length ?? 0) > 0 && (
                      <span className="shrink-0 rounded-md bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                        {phase.blockerDetails?.length} blocked
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    {phase.activeArtifacts} items · {phase.agentService}
                    {showCosts && phaseCost(phase) > 0 && (
                      <span className="ml-1.5 font-mono font-bold text-slate-700">
                        {formatUsd(phaseCost(phase))}
                      </span>
                    )}
                  </div>
                </div>

                <div className="hidden w-28 shrink-0 sm:block">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        phase.status === 'Blocked' ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${phase.completionPercent}%` }}
                    />
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                    STATUS_CHIP[phase.status]
                  }`}
                >
                  {phase.status}
                </span>

                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="border-t border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] leading-relaxed text-slate-600">{phase.description}</p>
                  {phase.currentTask && (
                    <p className="mt-1.5 text-[11px] font-medium text-slate-800">
                      Now: {phase.currentTask}
                    </p>
                  )}

                  {phaseTasks.length > 0 ? (
                    <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {phaseTasks.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 px-3 py-2">
                          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-800">
                            {t.title}
                          </span>
                          {showAssignments && (
                            <span className="flex shrink-0 items-center gap-1 text-[10px] text-slate-500">
                              <User className="h-3 w-3" />
                              {t.assignee}
                            </span>
                          )}
                          {showCosts && (
                            <span className="shrink-0 font-mono text-[10px] font-bold text-slate-700">
                              {formatUsd(t.costUsd ?? 0)}
                            </span>
                          )}
                          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-[11px] text-slate-400">No tasks in this phase yet.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Blockers rail — the daily triage list */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50/60 px-4 py-2.5">
          <span className="text-xs font-extrabold text-slate-900">
            Blockers ({blockerRows.length})
          </span>
        </div>
        {blockerRows.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-slate-500">
            Nothing blocked right now.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {blockerRows.map((b, idx) => (
              <div key={idx} className="flex items-start gap-3 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-900">{b.item}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500">{b.phase}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-700">
                    <User className="h-3 w-3 text-slate-400" />
                    {b.owner}
                  </div>
                  <div
                    className={`mt-0.5 font-mono text-[10px] font-bold ${
                      b.hoursBlocked > 24 ? 'text-rose-600' : 'text-slate-500'
                    }`}
                  >
                    {b.hoursBlocked}h blocked
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Secondary path out of the in-place headcount filter */}
      {showAssignments && (
        <button
          onClick={() =>
            navigateTo('Team', { note: `Managing the ${currentScope.projectName} roster.` })
          }
          className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
        >
          Manage team <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
