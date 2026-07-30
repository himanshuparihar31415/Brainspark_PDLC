import React from 'react';
import { ObservabilityRun } from '../../types/observability';
import {
  SLO_STATE_COPY,
  agentProfiles,
  formatMoney,
  formatPct,
  formatSecs,
  groupByCapability,
  moduleLabel,
  rollup,
  sloStateFor,
} from '../../data/observability';
import {
  AGENT_CATALOG,
  AGENT_EXECUTIONS,
  OBSERVABILITY_EVENTS,
} from '../../data/observabilityData';
import { Drill } from '../views/ObservabilityView';
import { RunList } from './RunList';

/**
 * L2 — module and capability health. Per-capability trend, plus the per-agent cost
 * profile that makes the optimisation target obvious: which agent consumes the most
 * budget per invocation.
 */
export const ModuleHealth: React.FC<{
  runs: ObservabilityRun[];
  moduleName: string;
  from: Drill;
  onDrill: (d: Drill) => void;
}> = ({ runs, moduleName, from, onDrill }) => {
  const moduleRuns = runs.filter((r) => r.moduleName === moduleName);
  const r = rollup(moduleRuns, OBSERVABILITY_EVENTS);

  const runIds = new Set(moduleRuns.map((x) => x.id));
  const executions = AGENT_EXECUTIONS.filter((e) => runIds.has(e.observabilityRunId));
  const profiles = agentProfiles(executions);
  const maxCost = Math.max(0.0001, ...profiles.map((p) => p.costUsd));

  const capabilities = groupByCapability(moduleRuns, OBSERVABILITY_EVENTS);

  if (moduleRuns.length === 0)
    return (
      <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-500">
        No runs recorded for {moduleLabel(moduleName)} in this scope.
      </p>
    );

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        {[
          { label: 'Runs', value: String(r.runs), hint: `${r.completed} completed` },
          {
            label: 'Success',
            value: formatPct(r.successRate),
            hint: 'target ≥ 97%',
            state: sloStateFor(r.successRate, 97),
          },
          {
            label: 'p95 duration',
            value: formatSecs(r.p95Ms),
            hint: `p50 ${formatSecs(r.p50Ms)}`,
            state: sloStateFor(r.p95Ms, 45_000, false),
          },
          { label: 'Spend', value: formatMoney(r.costUsd), hint: `${r.llmCalls} model calls` },
          {
            label: 'Per accepted',
            value: r.accepted === 0 ? '—' : formatMoney(r.costPerAcceptedUsd),
            hint: `${r.accepted} accepted`,
            state: r.accepted === 0 ? undefined : sloStateFor(r.costPerAcceptedUsd, 0.4, false),
          },
        ].map((t) => (
          <article key={t.label} className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-1.5">
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                {t.label}
              </span>
              {t.state && (
                <span
                  className={`shrink-0 rounded px-1 py-0.5 text-[8.5px] font-bold ${
                    SLO_STATE_COPY[t.state].chip
                  }`}
                >
                  {SLO_STATE_COPY[t.state].label}
                </span>
              )}
            </div>
            <div className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">
              {t.value}
            </div>
            <div className="text-[9.5px] text-slate-400">{t.hint}</div>
          </article>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Per-capability */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">By capability</h2>
          <div className="mt-3 space-y-1.5">
            {capabilities.map((c) => (
              <div
                key={c.capability}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-[11px] font-bold text-slate-800">
                    {c.capability}
                  </div>
                  <div className="text-[9.5px] text-slate-400">
                    {c.runs} runs · {formatPct(c.successRate)} success · p95 {formatSecs(c.p95Ms)}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[11px] font-bold text-slate-700">
                  {formatMoney(c.costUsd)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Per-agent cost profile */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Agent profiles</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Ranked by spend. Attempts above invocations is loop cost being paid twice.
          </p>

          <div className="mt-3 space-y-2">
            {profiles.map((p) => {
              /* Resolved from the catalog, so a slug reads as the thing it names. */
              const def = AGENT_CATALOG.find((a) => a.slug === p.agentName);
              return (
              <div key={p.agentName} title={def?.description}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate font-mono text-[10.5px] font-bold text-slate-800">
                    {def?.name ?? p.agentName}
                  </span>
                  {def && (
                    <span className="shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[8.5px] font-bold text-slate-500">
                      {def.agentType.replace('_', ' ')}
                    </span>
                  )}
                  <span className="shrink-0 font-mono text-[10px] text-slate-500">
                    {formatMoney(p.costUsd)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500"
                    style={{ width: `${(p.costUsd / maxCost) * 100}%` }}
                  />
                </div>
                <div className="mt-0.5 text-[9.5px] text-slate-400">
                  {p.invocations} invocations · {p.attempts} attempts ·{' '}
                  {formatMoney(p.costPerInvocation)} each · p95 {formatSecs(p.p95Ms)}
                  {p.failureRate > 0 && ` · ${formatPct(p.failureRate)} failed`}
                </div>
              </div>
              );
            })}
          </div>
        </section>
      </div>

      <RunList
        runs={moduleRuns}
        title={`${moduleLabel(moduleName)} runs`}
        onOpen={(runId) => onDrill({ level: 'L4', runId, from })}
      />
    </div>
  );
};
