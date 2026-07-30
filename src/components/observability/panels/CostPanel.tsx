import React, { useMemo } from 'react';
import { DollarSign, PiggyBank, TrendingDown } from 'lucide-react';
import { getCostByModule, getCostByAgent, getCacheSavings } from '../../../data/observabilityApi';
import { moduleLabel } from '../../../data/observability';

export const CostPanel: React.FC = () => {
  const costByModule = useMemo(() => getCostByModule(), []);
  const costByAgent = useMemo(() => getCostByAgent(), []);
  const cache = useMemo(() => getCacheSavings(), []);

  const totalCost = costByModule.reduce((s, m) => s + m.total_cost_usd, 0);
  const totalTokens = costByModule.reduce((s, m) => s + m.total_tokens, 0);
  const maxModuleCost = Math.max(...costByModule.map((m) => m.total_cost_usd), 0.01);
  const maxAgentCost = Math.max(...costByAgent.map((a) => a.total_cost), 0.01);

  return (
    <div className="space-y-5">
      {/* KPI Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <article className="glass-panel rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Total Spend</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">${totalCost.toFixed(2)}</div>
          <p className="mt-0.5 text-[10px] text-slate-400">{totalTokens.toLocaleString()} tokens</p>
        </article>
        <article className="glass-panel rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-emerald-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Cache Savings</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-emerald-700">${cache.estimated_savings_usd.toFixed(3)}</div>
          <p className="mt-0.5 text-[10px] text-slate-400">{cache.cache_hit_rate_pct}% hit rate</p>
        </article>
        <article className="glass-panel rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-sky-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Cached Calls</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">{cache.cached_calls}</div>
          <p className="mt-0.5 text-[10px] text-slate-400">of {cache.total_llm_calls} total</p>
        </article>
        <article className="glass-panel rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-indigo-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Avg per Call</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">
            ${(totalCost / Math.max(cache.total_llm_calls, 1)).toFixed(4)}
          </div>
          <p className="mt-0.5 text-[10px] text-slate-400">across all agents</p>
        </article>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Cost by Module */}
        <section className="glass-panel rounded-2xl border border-white/60 p-5">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">By Module</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">LLM cost breakdown grouped by platform module.</p>
          <div className="mt-4 space-y-2">
            {costByModule.map((m) => (
              <div key={m.module} className="rounded-xl border border-slate-100 bg-white/50 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-slate-800">{moduleLabel(m.module)}</span>
                  <span className="font-mono text-[11px] font-bold text-slate-700">${m.total_cost_usd.toFixed(3)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600"
                      style={{ width: `${(m.total_cost_usd / maxModuleCost) * 100}%` }}
                    />
                  </span>
                </div>
                <div className="mt-1 flex gap-3 text-[10px] text-slate-400">
                  <span>{m.run_count} runs</span>
                  <span>{(m.total_tokens / 1000).toFixed(0)}k tokens</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cost by Agent */}
        <section className="glass-panel rounded-2xl border border-white/60 p-5">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">By Agent</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Cost per agent slug, ranked by total spend.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Agent', 'Cost', 'Calls', 'Avg/Call', 'Tokens'].map((h) => (
                    <th key={h} className="pb-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {costByAgent.map((a) => (
                  <tr key={a.agent_slug} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 text-[11px] font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" style={{ opacity: a.total_cost / maxAgentCost }} />
                        {a.agent_slug.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="py-2 font-mono text-[10.5px] font-bold text-slate-700">${a.total_cost.toFixed(3)}</td>
                    <td className="py-2 font-mono text-[10.5px] text-slate-600">{a.invocation_count}</td>
                    <td className="py-2 font-mono text-[10.5px] text-slate-600">${a.avg_cost_per_call.toFixed(4)}</td>
                    <td className="py-2 font-mono text-[10.5px] text-slate-600">{(a.total_tokens / 1000).toFixed(0)}k</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
