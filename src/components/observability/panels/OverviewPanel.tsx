import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { getPlatformAppMetrics, getCostByModule, getErrorRate } from '../../../data/observabilityApi';
import { moduleLabel } from '../../../data/observability';
import { Drill } from '../../views/ObservabilityView';

export const OverviewPanel: React.FC<{ onDrill: (d: Drill) => void }> = ({ onDrill }) => {
  const platform = useMemo(() => getPlatformAppMetrics(), []);
  const costByModule = useMemo(() => getCostByModule(), []);
  const errorRates = useMemo(() => getErrorRate(), []);

  const totalCost = costByModule.reduce((s, m) => s + m.total_cost_usd, 0);
  const totalRuns = costByModule.reduce((s, m) => s + m.run_count, 0);
  const totalErrors = errorRates.reduce((s, e) => s + e.error_count, 0);
  const totalCalls = errorRates.reduce((s, e) => s + e.total_calls, 0);
  const overallErrorRate = totalCalls === 0 ? 0 : (totalErrors / totalCalls) * 100;
  const maxModuleCost = Math.max(...costByModule.map((m) => m.total_cost_usd), 0.01);

  const kpis = [
    { label: 'Active Tenants', value: `${platform.active_tenants}/${platform.total_tenants}`, icon: Users, color: 'text-indigo-600' },
    { label: 'Total Users', value: String(platform.total_users), icon: Users, color: 'text-sky-600' },
    { label: 'Total Runs', value: String(totalRuns), icon: Activity, color: 'text-emerald-600' },
    { label: 'Total Spend', value: `$${totalCost.toFixed(2)}`, icon: DollarSign, color: 'text-amber-600' },
    { label: 'Error Rate', value: `${overallErrorRate.toFixed(1)}%`, icon: AlertTriangle, color: overallErrorRate > 5 ? 'text-rose-600' : 'text-emerald-600' },
    { label: 'Rate Limits', value: String(platform.recent_rate_limit_events), icon: ShieldCheck, color: platform.recent_rate_limit_events > 0 ? 'text-amber-600' : 'text-emerald-600' },
  ];

  return (
    <div className="space-y-5">
      {/* KPI Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <article key={k.label} className="material-acrylic elevation-rest rounded-2xl border border-white/60 p-4">
            <div className="flex items-center gap-2">
              <k.icon className={`h-4 w-4 ${k.color}`} />
              <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                {k.label}
              </span>
            </div>
            <div className="mt-2 font-mono text-2xl font-extrabold tracking-tight text-slate-900">
              {k.value}
            </div>
          </article>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Module Cost Overview */}
        <section className="glass-panel rounded-2xl border border-white/60 p-5">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
            Cost by Module
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            LLM spend distribution across platform modules this period.
          </p>
          <div className="mt-4 space-y-2.5">
            {costByModule.map((m) => (
              <button
                key={m.module}
                onClick={() => onDrill({ level: 'L2', moduleName: m.module })}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-white/50 px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-slate-800">
                      {moduleLabel(m.module)}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-700">
                      ${m.total_cost_usd.toFixed(3)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${(m.total_cost_usd / maxModuleCost) * 100}%` }}
                      />
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {m.run_count} runs
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-indigo-600" />
              </button>
            ))}
          </div>
        </section>

        {/* Error Rates + Auth Summary */}
        <aside className="space-y-4">
          <section className="glass-panel rounded-2xl border border-white/60 p-5">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
              Agent Error Rates
            </h2>
            <div className="mt-3 space-y-2">
              {errorRates
                .filter((e) => e.error_rate_pct > 0)
                .sort((a, b) => b.error_rate_pct - a.error_rate_pct)
                .map((e) => (
                  <div key={e.agent_slug} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white/50 px-3 py-2">
                    <span className="text-[11px] font-semibold text-slate-700">
                      {e.agent_slug.replace(/_/g, ' ')}
                    </span>
                    <span className={`font-mono text-[11px] font-bold ${e.error_rate_pct > 10 ? 'text-rose-600' : 'text-amber-600'}`}>
                      {e.error_rate_pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              {errorRates.every((e) => e.error_rate_pct === 0) && (
                <p className="py-3 text-center text-[11px] text-slate-400">All agents healthy</p>
              )}
            </div>
          </section>

          <section className="glass-panel rounded-2xl border border-white/60 p-5">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
              Auth &amp; Access
            </h2>
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Successful logins</span>
                <span className="font-mono text-[11px] font-bold text-emerald-700">
                  {platform.recent_auth_success}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Failed attempts</span>
                <span className={`font-mono text-[11px] font-bold ${platform.recent_auth_failure > 5 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {platform.recent_auth_failure}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Schema failures</span>
                <span className="font-mono text-[11px] font-bold text-slate-700">
                  {platform.recent_schema_provision_failures}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
              <Zap className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] text-slate-500">
                All services healthy — no provisioning failures
              </span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
