import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LEVELS,
  ObservabilityLevel,
  canViewPayloads,
  filterRuns,
  moduleLabel,
} from '../../data/observability';
import { OBSERVABILITY_RUNS } from '../../data/observabilityData';
import { ObsDashboard } from '../observability/ObsDashboard';
import { ModuleHealth } from '../observability/ModuleHealth';
import { ScopeHealth } from '../observability/ScopeHealth';
import { RunTimeline } from '../observability/RunTimeline';
import { EventEvidence } from '../observability/EventEvidence';
import { ChevronRight, Eye, EyeOff } from 'lucide-react';

/**
 * Where the user is in the drill-down. One consistent path from any tile, so
 * navigation is learned once — and detail and sensitivity increase together as
 * the user descends.
 */
export type Drill =
  | { level: 'L1' }
  | { level: 'L2'; moduleName: string }
  | { level: 'L3'; tenantId: string; moduleName?: string }
  | { level: 'L4'; runId: string; from: Drill }
  | { level: 'L5'; runId: string; eventId: string; from: Drill };

/**
 * PDLC Observability — one governed view of how AI-assisted delivery performs,
 * from portfolio outcomes down to the exact model call.
 *
 * Five levels of progressive disclosure. Navigation depth and access rights are
 * separate controls: reaching L5 does not grant the right to read payloads, and
 * content is never surfaced above L4 regardless of the viewer's role.
 */
export const ObservabilityView: React.FC = () => {
  const { currentRole, currentScope } = useApp();

  const [drill, setDrill] = useState<Drill>({ level: 'L1' });

  /*
   * Scope is applied before anything is displayed. A Department Admin's "enterprise"
   * view is their own tenant — the layout keys on role, the numbers key on scope.
   */
  const scopedRuns = filterRuns(OBSERVABILITY_RUNS, {
    tenantId: currentScope.tenantId ?? undefined,
    projectId: currentScope.projectId ?? undefined,
  });

  const mayReadPayloads = canViewPayloads(currentRole);

  const crumbs: { level: ObservabilityLevel; label: string; go: () => void }[] = [
    { level: 'L1', label: LEVELS.L1.label, go: () => setDrill({ level: 'L1' }) },
  ];

  if (drill.level === 'L2')
    crumbs.push({
      level: 'L2',
      label: moduleLabel(drill.moduleName),
      go: () => setDrill(drill),
    });

  if (drill.level === 'L3') {
    const name = scopedRuns.find((r) => r.tenantId === drill.tenantId)?.tenantName ?? 'Tenant';
    crumbs.push({ level: 'L3', label: name, go: () => setDrill(drill) });
  }

  if (drill.level === 'L4' || drill.level === 'L5') {
    const run = OBSERVABILITY_RUNS.find((r) => r.id === drill.runId);
    const back = drill.from;
    if (back.level === 'L2')
      crumbs.push({ level: 'L2', label: moduleLabel(back.moduleName), go: () => setDrill(back) });
    if (back.level === 'L3')
      crumbs.push({
        level: 'L3',
        label: OBSERVABILITY_RUNS.find((r) => r.tenantId === back.tenantId)?.tenantName ?? 'Tenant',
        go: () => setDrill(back),
      });

    crumbs.push({
      level: 'L4',
      label: run ? `${run.capability} · ${run.runId}` : 'Run',
      go: () =>
        setDrill(
          drill.level === 'L5'
            ? { level: 'L4', runId: drill.runId, from: drill.from }
            : drill
        ),
    });
  }

  if (drill.level === 'L5') crumbs.push({ level: 'L5', label: 'Event evidence', go: () => setDrill(drill) });

  return (
    <div className="density-compact p-4 lg:p-6">
      <header className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              PDLC Observability
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Platform cost, performance, reliability, agent behavior, and tenant economics —
              aligned with the Observability API surface, with drill-down to run timelines.
            </p>
          </div>

          {/* Access rights are stated, not implied by how deep you can navigate */}
          <span
            title={
              mayReadPayloads
                ? 'Your role may read sanitized prompt and response content at L5.'
                : 'Your role can reach L5 but not read prompt or response content there.'
            }
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-bold ${
              mayReadPayloads
                ? 'border-slate-200 bg-slate-50 text-slate-600'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            {mayReadPayloads ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {mayReadPayloads ? 'Payload access granted' : 'Payload access withheld'}
          </span>
        </div>

        {/* Drill path */}
        <nav className="mt-3 flex flex-wrap items-center gap-1" aria-label="Drill-down path">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <React.Fragment key={`${c.level}-${i}`}>
                <button
                  onClick={c.go}
                  disabled={isLast}
                  className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ${
                    isLast
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <span className="mr-1 font-mono text-[9px] text-slate-400">{c.level}</span>
                  {c.label}
                </button>
                {!isLast && <ChevronRight className="h-3 w-3 text-slate-300" />}
              </React.Fragment>
            );
          })}
        </nav>
      </header>

      {drill.level === 'L1' && <ObsDashboard onDrill={setDrill} />}
      {drill.level === 'L2' && (
        <ModuleHealth runs={scopedRuns} moduleName={drill.moduleName} onDrill={setDrill} from={drill} />
      )}
      {drill.level === 'L3' && (
        <ScopeHealth runs={scopedRuns} tenantId={drill.tenantId} onDrill={setDrill} from={drill} />
      )}
      {drill.level === 'L4' && (
        <RunTimeline runId={drill.runId} onDrill={setDrill} from={drill} />
      )}
      {drill.level === 'L5' && (
        <EventEvidence
          eventId={drill.eventId}
          mayReadPayloads={mayReadPayloads}
          onBack={() => setDrill({ level: 'L4', runId: drill.runId, from: drill.from })}
        />
      )}
    </div>
  );
};
