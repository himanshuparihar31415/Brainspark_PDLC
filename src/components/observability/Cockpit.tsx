import React, { useMemo, useState } from 'react';
import { ObservabilityRun } from '../../types/observability';
import {
  SEVERITY_CHIP,
  SLO_STATE_COPY,
  formatMoney,
  formatPct,
  formatSecs,
  groupByModule,
  groupByTenant,
  headlineKpis,
  moduleLabel,
  rankedRisks,
  retryRate,
  rollup,
} from '../../data/observability';
import { AGENT_EXECUTIONS, OBSERVABILITY_EVENTS } from '../../data/observabilityData';
import {
  OPS_DOMAIN_COPY,
  OpsDomain,
  buildOpsAnswers,
} from '../../data/opsAnswers';
import { Drill } from '../views/ObservabilityView';
import { ArrowRight, TrendingUp } from 'lucide-react';

type Tab = 'overview' | OpsDomain;

/**
 * L1 cockpit — overridden to answer Reliability / Tenant / Drift / Security /
 * Trends questions as first-class cards, while keeping module spend and drill
 * into L2–L5. Numbers come from the same scoped runs/events as the timeline.
 */
export const Cockpit: React.FC<{
  runs: ObservabilityRun[];
  onDrill: (d: Drill) => void;
}> = ({ runs, onDrill }) => {
  const [tab, setTab] = useState<Tab>('reliability');

  const events = OBSERVABILITY_EVENTS;
  const r = rollup(runs, events);
  const kpis = headlineKpis(r, runs);
  const risks = rankedRisks(runs, AGENT_EXECUTIONS, events);
  const modules = groupByModule(runs, events);
  const tenants = groupByTenant(runs, events);
  const answers = useMemo(() => buildOpsAnswers(runs), [runs]);
  const maxModuleCost = Math.max(1, ...modules.map((m) => m.costUsd));

  const tabs: { id: Tab; label: string }[] = [
    { id: 'reliability', label: 'Reliability' },
    { id: 'tenant', label: 'Tenant' },
    { id: 'drift', label: 'Drift' },
    { id: 'security', label: 'Security' },
    { id: 'trends', label: 'Trends' },
    { id: 'debug', label: 'Must-answer' },
    { id: 'overview', label: 'Portfolio' },
  ];

  const domainAnswers =
    tab === 'overview' ? [] : answers.filter((a) => a.domain === tab);
  const domainMeta = tab === 'overview' ? null : OPS_DOMAIN_COPY[tab];

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-1.5" aria-label="Observability lenses">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-[10.5px] font-bold transition-colors ${
              tab === t.id
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab !== 'overview' && domainMeta && (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
              {domainMeta.label}
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">{domainMeta.blurb}</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
            {domainAnswers.map((a) => {
              const slo = SLO_STATE_COPY[a.state];
              return (
                <article
                  key={a.id}
                  className="glass-panel flex flex-col rounded-2xl border border-white/60 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-semibold leading-snug text-slate-600">
                      {a.question}
                    </p>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${slo.chip}`}>
                      {slo.label}
                    </span>
                  </div>
                  <div className="mt-2 text-lg font-extrabold tracking-tight text-slate-900">
                    {a.answer}
                  </div>
                  <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-500">{a.detail}</p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-3">
                    {a.runId && (
                      <button
                        onClick={() =>
                          onDrill({ level: 'L4', runId: a.runId as string, from: { level: 'L1' } })
                        }
                        className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        Open run <ArrowRight className="h-2.5 w-2.5" />
                      </button>
                    )}
                    {a.moduleName && (
                      <button
                        onClick={() => onDrill({ level: 'L2', moduleName: a.moduleName as string })}
                        className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        Module <ArrowRight className="h-2.5 w-2.5" />
                      </button>
                    )}
                    {a.tenantId && (
                      <button
                        onClick={() => onDrill({ level: 'L3', tenantId: a.tenantId as string })}
                        className="flex cursor-pointer items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        Tenant <ArrowRight className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'overview' && (
        <>
          <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {kpis.map((k) => {
              const slo = SLO_STATE_COPY[k.state];
              return (
                <article
                  key={k.key}
                  title={k.hint}
                  className="glass-panel rounded-2xl border border-white/60 p-4"
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
              <section className="glass-panel rounded-2xl border border-white/60 p-4">
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
                        className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200/80 bg-white/50 px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
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
                                className="block h-full rounded-full bg-indigo-600"
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

              <section className="glass-panel rounded-2xl border border-white/60 p-4">
                <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
                  Spend attribution
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Chargeback basis by tenant — same IDs as Portal tenancy.
                </p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[30rem] text-left">
                    <thead>
                      <tr className="border-b border-slate-200">
                        {['Tenant', 'Runs', 'Accepted', 'Tokens', 'Spend', 'Per accepted'].map(
                          (h) => (
                            <th
                              key={h}
                              className="pb-2 text-[9px] font-bold uppercase tracking-wider text-slate-400"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {tenants.map((t) => (
                        <tr
                          key={t.tenantId}
                          onClick={() => onDrill({ level: 'L3', tenantId: t.tenantId })}
                          className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
                        >
                          <td className="py-2 text-[11px] font-bold text-slate-800">
                            {t.tenantName}
                          </td>
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
                  {formatMoney(r.cacheSavingsUsd)} avoided by caching · retry rate{' '}
                  {formatPct(retryRate(runs))} of runs
                </p>
              </section>
            </div>

            <aside>
              <section className="glass-panel rounded-2xl border border-white/60 p-4">
                <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Top risks</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">Ranked and owned.</p>
                <div className="mt-3 space-y-2">
                  {risks.length === 0 ? (
                    <p className="py-4 text-center text-[11px] text-slate-400">
                      Nothing outstanding in this scope.
                    </p>
                  ) : (
                    risks.map((risk) => (
                      <article
                        key={risk.id}
                        className="rounded-xl border border-slate-200/80 bg-white/50 p-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[8.5px] font-bold uppercase ${
                              SEVERITY_CHIP[risk.severity]
                            }`}
                          >
                            {risk.severity}
                          </span>
                          <span className="text-[9.5px] font-semibold text-slate-400">
                            {risk.owner}
                          </span>
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
                              onDrill({
                                level: 'L4',
                                runId: risk.runId as string,
                                from: { level: 'L1' },
                              })
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
            </aside>
          </div>
        </>
      )}
    </div>
  );
};
