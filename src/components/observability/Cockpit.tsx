import React from 'react';
import { ObservabilityRun } from '../../types/observability';
import {
  OBSERVABILITY_PILLARS,
  SEVERITY_CHIP,
  SLO_STATE_COPY,
  formatMoney,
  groupByModule,
  groupByTenant,
  formatPct,
  formatSecs,
  headlineKpis,
  moduleLabel,
  rankedRisks,
  retryRate,
  rollup,
} from '../../data/observability';
import { AGENT_EXECUTIONS, OBSERVABILITY_EVENTS } from '../../data/observabilityData';
import { Drill } from '../views/ObservabilityView';
import { ArrowRight, TrendingUp } from 'lucide-react';

/**
 * L1 — the executive cockpit. Deliberately outcome-oriented: a small number of
 * tiles read against a target, module comparison, spend, and a ranked risk list
 * with an owner on each. Run counts alone do not evidence value, so the headline
 * numbers are acceptance and unit economics rather than activity.
 */
export const Cockpit: React.FC<{
  runs: ObservabilityRun[];
  onDrill: (d: Drill) => void;
}> = ({ runs, onDrill }) => {
  const r = rollup(runs, OBSERVABILITY_EVENTS);
  const kpis = headlineKpis(r, runs);
  const risks = rankedRisks(runs, AGENT_EXECUTIONS, OBSERVABILITY_EVENTS);

  const modules = groupByModule(runs, OBSERVABILITY_EVENTS);
  const tenants = groupByTenant(runs, OBSERVABILITY_EVENTS);

  const maxModuleCost = Math.max(1, ...modules.map((m) => m.costUsd));

  return (
    <div className="space-y-4">
      {/* The six headline measures */}
      <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => {
          const slo = SLO_STATE_COPY[k.state];
          return (
            <article
              key={k.key}
              title={k.hint}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {k.label}
                </span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${slo.chip}`}>
                  {slo.label}
                </span>
              </div>
              <div className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
                {k.value}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-slate-500">
                <span>{k.target}</span>
                {k.delta && <span className="text-slate-400">· {k.delta}</span>}
              </div>
            </article>
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          {/* Module comparison — every row drills to L2 */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
              Module performance
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Spend, reliability and acceptance per module. Select a row for capability detail.
            </p>

            <div className="mt-3 space-y-1.5">
              {modules.map((m) => {
                const state =
                  m.successRate >= 97 ? 'meeting' : m.successRate >= 90 ? 'at-risk' : 'breached';
                return (
                  <button
                    key={m.moduleName}
                    onClick={() => onDrill({ level: 'L2', moduleName: m.moduleName })}
                    className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[12px] font-bold text-slate-900">
                          {moduleLabel(m.moduleName)}
                        </span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            SLO_STATE_COPY[state].chip
                          }`}
                        >
                          {formatPct(m.successRate)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500"
                            style={{ width: `${(m.costUsd / maxModuleCost) * 100}%` }}
                          />
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-slate-500">
                          {formatMoney(m.costUsd)}
                        </span>
                      </div>
                      <div className="mt-1 text-[9.5px] text-slate-400">
                        {m.runs} runs · {m.accepted} accepted · p95 {formatSecs(m.p95Ms)} ·{' '}
                        {m.llmCalls} model calls
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-indigo-600" />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Tenant spend — the chargeback basis */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
              Spend attribution
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Attributable to tenant, project, module, capability, agent and model — the basis for
              chargeback and budget defence.
            </p>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[30rem] text-left">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Tenant', 'Runs', 'Accepted', 'Tokens', 'Spend', 'Per accepted'].map((h) => (
                      <th
                        key={h}
                        className="pb-2 text-[9px] font-bold uppercase tracking-wider text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr
                      key={t.tenantId}
                      onClick={() => onDrill({ level: 'L3', tenantId: t.tenantId })}
                      className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-2 text-[11px] font-bold text-slate-800">{t.tenantName}</td>
                      <td className="py-2 text-[11px] text-slate-600">{t.runs}</td>
                      <td className="py-2 text-[11px] text-slate-600">{t.accepted}</td>
                      <td className="py-2 font-mono text-[10.5px] text-slate-600">
                        {t.tokens.toLocaleString()}
                      </td>
                      <td className="py-2 font-mono text-[10.5px] font-bold text-slate-800">
                        {formatMoney(t.costUsd)}
                      </td>
                      <td className="py-2 font-mono text-[10.5px] text-slate-600">
                        {t.accepted === 0 ? '—' : formatMoney(t.costPerAcceptedUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-2.5 flex items-center gap-1.5 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              {formatMoney(r.cacheSavingsUsd)} avoided by response caching · retry rate{' '}
              {formatPct(retryRate(runs))} of runs
            </p>
          </section>
        </div>

        {/* Ranked risks, each with an owner */}
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Top risks</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Ranked and owned, not an exception feed.
            </p>

            <div className="mt-3 space-y-2">
              {risks.length === 0 ? (
                <p className="py-4 text-center text-[11px] text-slate-400">
                  Nothing outstanding in this scope.
                </p>
              ) : (
                risks.map((risk) => (
                  <article
                    key={risk.id}
                    className="rounded-xl border border-slate-200 p-2.5 transition-colors hover:border-slate-300"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[8.5px] font-bold uppercase ${
                          SEVERITY_CHIP[risk.severity]
                        }`}
                      >
                        {risk.severity}
                      </span>
                      <span className="text-[9.5px] font-semibold text-slate-400">{risk.owner}</span>
                    </div>
                    <h3 className="mt-1.5 text-[11px] font-bold leading-snug text-slate-900">
                      {risk.title}
                    </h3>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                      {risk.evidence}
                    </p>
                    {risk.runId && (
                      <button
                        onClick={() =>
                          onDrill({ level: 'L4', runId: risk.runId as string, from: { level: 'L1' } })
                        }
                        className="mt-1.5 flex cursor-pointer items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        Open the run <ArrowRight className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>

          {/* The eight pillars, and who owns each */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Coverage</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Eight pillars, correlated by run and trace id. Each stays owned by the team able to act
              on it.
            </p>
            <div className="mt-2.5 space-y-1">
              {OBSERVABILITY_PILLARS.map((p) => (
                <div
                  key={p.key}
                  title={`${p.question} — ${p.signals}`}
                  className="flex cursor-help items-center justify-between gap-2 border-b border-dashed border-slate-100 py-1.5 last:border-0"
                >
                  <span className="min-w-0 truncate text-[10.5px] font-semibold text-slate-700">
                    {p.name}
                  </span>
                  <span className="shrink-0 text-[9.5px] text-slate-400">{p.owner}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
