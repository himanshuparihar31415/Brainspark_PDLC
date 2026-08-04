import React from 'react';
import { ObservabilityRun } from '../../types/observability';
import {
  PAYLOAD_POLICY_COPY,
  SLO_STATE_COPY,
  formatMoney,
  formatPct,
  distinctPayloadPolicies,
  formatSecs,
  groupByModule,
  groupByProject,
  moduleLabel,
  rollup,
  sloStateFor,
} from '../../data/observability';
import { OBSERVABILITY_EVENTS } from '../../data/observabilityData';
import { Drill } from '../views/ObservabilityView';
import { RunList } from './RunList';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

/**
 * L3 — department and project operations. Consumption, cost, data policy, failures and
 * dependency health for one account. This is the level an account conversation is
 * had at, so it leads with spend and with what the department's own capture policy
 * permits.
 */
export const ScopeHealth: React.FC<{
  runs: ObservabilityRun[];
  departmentId: string;
  from: Drill;
  onDrill: (d: Drill) => void;
}> = ({ runs, departmentId, from, onDrill }) => {
  const departmentRuns = runs.filter((r) => r.departmentId === departmentId);
  const r = rollup(departmentRuns, OBSERVABILITY_EVENTS);
  const departmentName = departmentRuns[0]?.departmentName ?? 'Department';

  const runIds = new Set(departmentRuns.map((x) => x.id));
  const events = OBSERVABILITY_EVENTS.filter((e) => runIds.has(e.observabilityRunId));

  const projects = groupByProject(departmentRuns, events);
  const modules = groupByModule(departmentRuns, events);

  /* Capture policy in force. An absent payload should read as a policy decision,
     never as data loss, so the department's own setting is stated plainly here. */
  const policies = distinctPayloadPolicies(departmentRuns);
  const restricted = policies.some((p) => p === 'metadata_only' || p === 'disabled');

  /* Dependency failures are attributed upstream, kept distinct from our own faults. */
  const dependencyFailures = events.filter((e) => e.dependencyError);
  const byTool = new Map<string, number>();
  for (const e of dependencyFailures)
    byTool.set(e.toolSlug ?? 'unknown', (byTool.get(e.toolSlug ?? 'unknown') ?? 0) + 1);

  if (departmentRuns.length === 0)
    return (
      <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-500">
        No runs recorded for this department in your scope.
      </p>
    );

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {[
          { label: 'Spend', value: formatMoney(r.costUsd), hint: `${r.tokens.toLocaleString()} tokens` },
          {
            label: 'Success',
            value: formatPct(r.successRate),
            hint: `${r.failed} failed · ${r.partial} partial`,
            state: sloStateFor(r.successRate, 97),
          },
          { label: 'p95 duration', value: formatSecs(r.p95Ms), hint: `${r.runs} runs` },
          {
            label: 'Cache savings',
            value: formatMoney(r.cacheSavingsUsd),
            hint: 'avoided model calls',
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
              {departmentName} by project
            </h2>
            <div className="mt-3 space-y-1.5">
              {projects.map((p) => (
                <div
                  key={p.projectId ?? 'none'}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[11.5px] font-bold text-slate-800">
                      {p.projectName}
                    </div>
                    <div className="text-[9.5px] text-slate-400">
                      {p.runs} runs · {p.accepted} accepted · {formatPct(p.successRate)} success
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-bold text-slate-700">
                    {formatMoney(p.costUsd)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">By module</h2>
            <div className="mt-3 space-y-1.5">
              {modules.map((m) => (
                <button
                  key={m.moduleName}
                  onClick={() => onDrill({ level: 'L2', moduleName: m.moduleName })}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[11.5px] font-bold text-slate-800">
                      {moduleLabel(m.moduleName)}
                    </div>
                    <div className="text-[9.5px] text-slate-400">
                      {m.runs} runs · {m.llmCalls} model calls · {m.toolCalls} tool calls
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-bold text-slate-700">
                    {formatMoney(m.costUsd)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          {/* Data policy in force */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="flex items-center gap-1.5 text-sm font-extrabold tracking-tight text-slate-900">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
              Capture policy
            </h2>
            <div className="mt-2.5 space-y-1.5">
              {policies.map((p) => (
                <div key={p} className="rounded-xl border border-slate-200 px-2.5 py-2">
                  <div className="text-[10.5px] font-bold text-slate-800">
                    {PAYLOAD_POLICY_COPY[p].label}
                  </div>
                  <p className="mt-0.5 text-[9.5px] leading-relaxed text-slate-500">
                    {PAYLOAD_POLICY_COPY[p].hint}
                  </p>
                </div>
              ))}
            </div>
            {restricted && (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] leading-relaxed text-amber-900">
                <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                Some runs cannot be replayed. That is this department's own setting, not a gap in
                capture.
              </p>
            )}
          </section>

          {/* Dependency health */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
              Dependency health
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Upstream failures, kept distinct from our own.
            </p>
            <div className="mt-2.5 space-y-1.5">
              {byTool.size === 0 ? (
                <p className="py-3 text-center text-[10.5px] text-slate-400">
                  No dependency failures in this scope.
                </p>
              ) : (
                [...byTool.entries()].map(([tool, count]) => (
                  <div
                    key={tool}
                    className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/50 px-2.5 py-2"
                  >
                    <span className="min-w-0 truncate font-mono text-[10.5px] font-bold text-rose-800">
                      {tool}
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-rose-700">
                      {count} {count === 1 ? 'failure' : 'failures'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      <RunList
        runs={departmentRuns}
        title={`${departmentName} runs`}
        onOpen={(runId) => onDrill({ level: 'L4', runId, from })}
      />
    </div>
  );
};
