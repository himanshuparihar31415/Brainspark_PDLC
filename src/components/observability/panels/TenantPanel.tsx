import React, { useMemo } from 'react';
import { ArrowRight, Building2, DollarSign, Users } from 'lucide-react';
import { getTopConsumers, getTenantObservability } from '../../../data/observabilityApi';
import { Drill } from '../../views/ObservabilityView';

export const TenantPanel: React.FC<{ onDrill: (d: Drill) => void }> = ({ onDrill }) => {
  const consumers = useMemo(() => getTopConsumers(), []);

  const totalCost = consumers.reduce((s, c) => s + c.total_cost_usd, 0);
  const totalRuns = consumers.reduce((s, c) => s + c.run_count, 0);
  const maxCost = Math.max(...consumers.map((c) => c.total_cost_usd), 0.01);

  return (
    <div className="space-y-5">
      {/* KPI Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <article className="platform-card p-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Active Tenants</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">{consumers.length}</div>
        </article>
        <article className="platform-card p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Total Spend</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">${totalCost.toFixed(2)}</div>
        </article>
        <article className="platform-card p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-sky-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Total Runs</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">{totalRuns}</div>
        </article>
      </section>

      {/* Top Consumers Leaderboard */}
      <section className="platform-card p-5">
        <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Top Consumers</h2>
        <p className="mt-0.5 text-[11px] text-slate-500">Tenants ranked by LLM cost — chargeback basis.</p>
        <div className="mt-4 space-y-2.5">
          {consumers.map((c, i) => {
            const tenantObs = getTenantObservability(c.tenant_id);
            return (
              <button
                key={c.tenant_id}
                onClick={() => onDrill({ level: 'L3', tenantId: c.tenant_id })}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-white/50 px-4 py-3 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-extrabold text-indigo-600">
                  #{i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-slate-800">
                      {c.tenant_schema.replace('tenant_', '').replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-[12px] font-extrabold text-slate-900">
                      ${c.total_cost_usd.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600"
                        style={{ width: `${(c.total_cost_usd / maxCost) * 100}%` }}
                      />
                    </span>
                  </div>
                  <div className="mt-1.5 flex gap-4 text-[10px] text-slate-400">
                    <span>{c.run_count} runs</span>
                    <span>{(c.total_tokens / 1000).toFixed(0)}k tokens</span>
                    <span>{tenantObs.active_member_count} members</span>
                    <span>{tenantObs.project_count} projects</span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-indigo-600" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Per-Tenant Detail Cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {consumers.map((c) => {
          const obs = getTenantObservability(c.tenant_id);
          const failureRate = obs.recent_run_count === 0 ? 0 : (obs.recent_run_failures / obs.recent_run_count) * 100;
          return (
            <article key={c.tenant_id} className="platform-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-bold text-slate-800">
                  {c.tenant_schema.replace('tenant_', '').replace(/_/g, ' ')}
                </h3>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${failureRate > 5 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {failureRate.toFixed(1)}% fail
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-y-2 text-[10.5px]">
                <div>
                  <span className="text-slate-400">Members</span>
                  <div className="font-mono font-bold text-slate-700">{obs.active_member_count}</div>
                </div>
                <div>
                  <span className="text-slate-400">Projects</span>
                  <div className="font-mono font-bold text-slate-700">{obs.project_count}</div>
                </div>
                <div>
                  <span className="text-slate-400">Sessions</span>
                  <div className="font-mono font-bold text-slate-700">{obs.recent_session_count}</div>
                </div>
                <div>
                  <span className="text-slate-400">Runs</span>
                  <div className="font-mono font-bold text-slate-700">{obs.recent_run_count}</div>
                </div>
                <div>
                  <span className="text-slate-400">Tools</span>
                  <div className="font-mono font-bold text-slate-700">{obs.enabled_tool_count}</div>
                </div>
                <div>
                  <span className="text-slate-400">Failures</span>
                  <div className={`font-mono font-bold ${obs.recent_run_failures > 5 ? 'text-rose-600' : 'text-slate-700'}`}>
                    {obs.recent_run_failures}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
};
