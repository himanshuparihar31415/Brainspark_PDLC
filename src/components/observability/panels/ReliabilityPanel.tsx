import React, { useMemo } from 'react';
import { AlertOctagon, HeartPulse, Shield } from 'lucide-react';
import { getErrorRate, getProviderHealth, getFallbackRate } from '../../../data/observabilityApi';

export const ReliabilityPanel: React.FC = () => {
  const errorRates = useMemo(() => getErrorRate(), []);
  const providers = useMemo(() => getProviderHealth(), []);
  const fallback = useMemo(() => getFallbackRate(), []);

  const totalCalls = errorRates.reduce((s, e) => s + e.total_calls, 0);
  const totalErrors = errorRates.reduce((s, e) => s + e.error_count, 0);
  const overallErrorRate = totalCalls === 0 ? 0 : (totalErrors / totalCalls) * 100;
  const maxCalls = Math.max(...errorRates.map((e) => e.total_calls), 1);

  return (
    <div className="space-y-5">
      {/* KPI Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <article className="glass-panel rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-rose-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Error Rate</span>
          </div>
          <div className={`mt-2 font-mono text-2xl font-extrabold ${overallErrorRate > 5 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {overallErrorRate.toFixed(1)}%
          </div>
          <p className="mt-0.5 text-[10px] text-slate-400">{totalErrors} errors / {totalCalls} calls</p>
        </article>
        <article className="glass-panel rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-emerald-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Providers</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">{providers.length}</div>
          <p className="mt-0.5 text-[10px] text-slate-400">{providers.filter((p) => p.error_count === 0).length} fully healthy</p>
        </article>
        <article className="glass-panel rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Fallback Rate</span>
          </div>
          <div className={`mt-2 font-mono text-2xl font-extrabold ${fallback.fallback_rate_pct > 5 ? 'text-amber-700' : 'text-slate-900'}`}>
            {fallback.fallback_rate_pct.toFixed(1)}%
          </div>
          <p className="mt-0.5 text-[10px] text-slate-400">{fallback.fallback_hits} of {fallback.total_llm_calls} calls</p>
        </article>
        <article className="glass-panel rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-sky-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Avg Latency</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">
            {(providers.reduce((s, p) => s + p.avg_latency_ms * p.total_calls, 0) / Math.max(providers.reduce((s, p) => s + p.total_calls, 0), 1) / 1000).toFixed(1)}s
          </div>
          <p className="mt-0.5 text-[10px] text-slate-400">weighted by call volume</p>
        </article>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Error Rate per Agent */}
        <section className="glass-panel rounded-2xl border border-white/60 p-5">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Error Rate by Agent</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Per-agent error distribution with volume context.</p>
          <div className="mt-4 space-y-2">
            {errorRates
              .sort((a, b) => b.error_rate_pct - a.error_rate_pct)
              .map((e) => (
                <div key={e.agent_slug} className="rounded-xl border border-slate-100 bg-white/50 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800">{e.agent_slug.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        e.error_rate_pct > 10 ? 'bg-rose-50 text-rose-700' :
                        e.error_rate_pct > 0 ? 'bg-amber-50 text-amber-700' :
                        'bg-emerald-50 text-emerald-700'
                      }`}>
                        {e.error_rate_pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full rounded-full bg-indigo-400"
                        style={{ width: `${(e.total_calls / maxCalls) * 100}%` }}
                      />
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {e.error_count}/{e.total_calls} calls
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </section>

        <div className="space-y-4">
          {/* Provider Health */}
          <section className="glass-panel rounded-2xl border border-white/60 p-5">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Provider Health</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">LLM provider uptime and average latency.</p>
            <div className="mt-4 space-y-2">
              {providers.map((p) => (
                <div key={p.provider} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white/50 px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${p.error_count === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="text-[12px] font-bold capitalize text-slate-800">{p.provider}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-mono text-[10.5px] font-bold text-slate-700">{p.error_rate_pct.toFixed(1)}%</div>
                      <div className="text-[9px] text-slate-400">error rate</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[10.5px] font-bold text-slate-700">{(p.avg_latency_ms / 1000).toFixed(1)}s</div>
                      <div className="text-[9px] text-slate-400">avg latency</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[10.5px] text-slate-600">{p.total_calls}</div>
                      <div className="text-[9px] text-slate-400">calls</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Fallback Breakdown */}
          <section className="glass-panel rounded-2xl border border-white/60 p-5">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Fallback Breakdown</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Which agents triggered provider fallbacks.</p>
            <div className="mt-3 space-y-1.5">
              {fallback.by_agent
                .filter((a) => a.fallback_count > 0)
                .map((a) => (
                  <div key={a.agent_slug} className="flex items-center justify-between rounded-lg bg-amber-50/60 px-3 py-2">
                    <span className="text-[11px] font-semibold text-slate-700">{a.agent_slug.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-[11px] font-bold text-amber-700">{a.fallback_count}x</span>
                  </div>
                ))}
              {fallback.by_agent.every((a) => a.fallback_count === 0) && (
                <p className="py-3 text-center text-[11px] text-emerald-600">No fallbacks triggered</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
