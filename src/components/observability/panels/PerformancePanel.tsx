import React, { useMemo, useState } from 'react';
import { ArrowRight, Clock, Gauge, Timer } from 'lucide-react';
import { getPerfByAgent, getRunBottleneck, AGENT_SLUGS } from '../../../data/observabilityApi';
import { Drill } from '../../views/ObservabilityView';
import { OBSERVABILITY_RUNS } from '../../../data/observabilityData';

export const PerformancePanel: React.FC<{ onDrill: (d: Drill) => void }> = ({ onDrill }) => {
  const perfData = useMemo(() => getPerfByAgent(), []);
  const [selectedRun] = useState(OBSERVABILITY_RUNS[0]?.id ?? '');
  const bottlenecks = useMemo(() => getRunBottleneck(selectedRun), [selectedRun]);

  const globalP50 = Math.round(perfData.reduce((s, p) => s + p.p50_ms * p.call_count, 0) / Math.max(perfData.reduce((s, p) => s + p.call_count, 0), 1));
  const globalP95 = Math.max(...perfData.map((p) => p.p95_ms));
  const totalCalls = perfData.reduce((s, p) => s + p.call_count, 0);
  const maxP95 = Math.max(...perfData.map((p) => p.p95_ms), 1);

  return (
    <div className="space-y-5">
      {/* KPI Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <article className="glass-panel rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-indigo-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Global p50</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">{(globalP50 / 1000).toFixed(1)}s</div>
        </article>
        <article className="glass-panel rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-rose-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Worst p95</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">{(globalP95 / 1000).toFixed(1)}s</div>
        </article>
        <article className="glass-panel rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Total Calls</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">{totalCalls}</div>
        </article>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Agent Latency Table */}
        <section className="glass-panel rounded-2xl border border-white/60 p-5">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Latency by Agent</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Percentile latencies (ms) per agent slug.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Agent', 'p50', 'p95', 'Avg', 'Max', 'Calls'].map((h) => (
                    <th key={h} className="pb-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perfData
                  .sort((a, b) => b.p95_ms - a.p95_ms)
                  .map((p) => (
                    <tr key={p.agent_slug} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 text-[11px] font-semibold text-slate-800">
                        {p.agent_slug.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 font-mono text-[10.5px] text-slate-600">{(p.p50_ms / 1000).toFixed(1)}s</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="h-1.5 overflow-hidden rounded-full bg-slate-100" style={{ width: '3rem' }}>
                            <span
                              className={`block h-full rounded-full ${p.p95_ms > 8000 ? 'bg-rose-500' : p.p95_ms > 5000 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${(p.p95_ms / maxP95) * 100}%` }}
                            />
                          </span>
                          <span className="font-mono text-[10.5px] font-bold text-slate-700">{(p.p95_ms / 1000).toFixed(1)}s</span>
                        </div>
                      </td>
                      <td className="py-2.5 font-mono text-[10.5px] text-slate-600">{(p.avg_ms / 1000).toFixed(1)}s</td>
                      <td className="py-2.5 font-mono text-[10.5px] text-slate-600">{(p.max_ms / 1000).toFixed(1)}s</td>
                      <td className="py-2.5 font-mono text-[10.5px] text-slate-600">{p.call_count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Bottleneck Highlight */}
        <section className="glass-panel rounded-2xl border border-white/60 p-5">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Top Bottlenecks</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Slowest spans in the most recent run.</p>
          <div className="mt-4 space-y-2.5">
            {bottlenecks.map((b, i) => (
              <div key={b.span_id} className="rounded-xl border border-slate-100 bg-white/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800">
                    #{i + 1} {b.name.replace(/_/g, ' ')}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${b.pct_of_total > 35 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                    {b.pct_of_total}%
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-rose-400"
                      style={{ width: `${b.pct_of_total}%` }}
                    />
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">{(b.duration_ms / 1000).toFixed(1)}s</span>
                </div>
                <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[9px] text-slate-500">
                  {b.span_kind}
                </span>
              </div>
            ))}
          </div>
          {selectedRun && (
            <button
              onClick={() => onDrill({ level: 'L4', runId: selectedRun, from: { level: 'L1' } })}
              className="mt-3 flex cursor-pointer items-center gap-1 text-[10.5px] font-bold text-indigo-600 hover:underline"
            >
              Open full timeline <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </section>
      </div>
    </div>
  );
};
