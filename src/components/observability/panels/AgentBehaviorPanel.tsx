import React, { useMemo, useState } from 'react';
import { Bot, RefreshCw, Wrench, TrendingUp } from 'lucide-react';
import { getTokenTrend, getToolUsage, getRetryRate, AGENT_SLUGS, AgentSlug } from '../../../data/observabilityApi';

export const AgentBehaviorPanel: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<AgentSlug>('test_case_generation');

  const tokenTrend = useMemo(() => getTokenTrend(selectedAgent), [selectedAgent]);
  const toolUsage = useMemo(() => getToolUsage(selectedAgent), [selectedAgent]);
  const retryRate = useMemo(() => getRetryRate(selectedAgent), [selectedAgent]);

  const maxTokens = Math.max(...tokenTrend.map((t) => t.avg_tokens), 1);
  const maxToolCalls = Math.max(...toolUsage.tool_breakdown.map((t) => t.call_count), 1);

  return (
    <div className="space-y-5">
      {/* Agent Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <Bot className="h-4 w-4 text-indigo-600" />
        <span className="text-[11px] font-bold text-slate-600">Agent:</span>
        <div className="flex flex-wrap gap-1">
          {AGENT_SLUGS.map((slug) => (
            <button
              key={slug}
              onClick={() => setSelectedAgent(slug)}
              className={`cursor-pointer rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all ${
                selectedAgent === slug
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white/70 text-slate-500 hover:border-indigo-300'
              }`}
            >
              {slug.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <article className="glass-panel rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Avg Tokens</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">
            {Math.round(tokenTrend.reduce((s, t) => s + t.avg_tokens, 0) / Math.max(tokenTrend.length, 1)).toLocaleString()}
          </div>
        </article>
        <article className="glass-panel rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-sky-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Tool Calls/Run</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">
            {toolUsage.avg_tool_calls_per_run.toFixed(1)}
          </div>
        </article>
        <article className="glass-panel rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-amber-600" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Retry Rate</span>
          </div>
          <div className={`mt-2 font-mono text-2xl font-extrabold ${retryRate.retry_rate_pct > 15 ? 'text-rose-700' : 'text-slate-900'}`}>
            {retryRate.retry_rate_pct.toFixed(1)}%
          </div>
        </article>
        <article className="glass-panel rounded-2xl border border-white/60 p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-slate-500" />
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Max Attempts</span>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-slate-900">
            {retryRate.max_attempts_seen}
          </div>
        </article>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Token Trend */}
        <section className="glass-panel rounded-2xl border border-white/60 p-5">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Token Trend</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Daily average token usage for <span className="font-semibold">{selectedAgent.replace(/_/g, ' ')}</span>.
          </p>
          <div className="mt-4 flex items-end gap-[3px]" style={{ height: '120px' }}>
            {tokenTrend.map((t) => {
              const inputH = (t.avg_input / maxTokens) * 100;
              const outputH = (t.avg_output / maxTokens) * 100;
              return (
                <div key={t.period} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: '100%' }}>
                  <div className="flex w-full flex-col items-center justify-end" style={{ height: '100%' }}>
                    <div
                      className="w-full rounded-t bg-indigo-300"
                      style={{ height: `${outputH}%` }}
                      title={`Output: ${t.avg_output}`}
                    />
                    <div
                      className="w-full bg-indigo-600"
                      style={{ height: `${inputH}%` }}
                      title={`Input: ${t.avg_input}`}
                    />
                  </div>
                  <div className="absolute -bottom-4 hidden text-[7px] text-slate-400 group-hover:block">
                    {t.period.slice(5)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex items-center gap-4 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-indigo-600" /> Input
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-indigo-300" /> Output
            </span>
          </div>
        </section>

        {/* Tool Usage */}
        <section className="glass-panel rounded-2xl border border-white/60 p-5">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Tool Usage</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Tool call breakdown for <span className="font-semibold">{selectedAgent.replace(/_/g, ' ')}</span>.
          </p>
          <div className="mt-4 space-y-2.5">
            {toolUsage.tool_breakdown.map((t) => (
              <div key={t.tool_name} className="rounded-xl border border-slate-100 bg-white/50 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800">{t.tool_name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-slate-500">{t.avg_duration_ms}ms avg</span>
                    <span className="font-mono text-[11px] font-bold text-slate-700">{t.call_count}x</span>
                  </div>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-sky-500"
                    style={{ width: `${(t.call_count / maxToolCalls) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-slate-100 pt-2.5">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="text-slate-500">Retried calls</span>
              <span className="font-mono font-bold text-slate-700">
                {retryRate.retried_calls} / {retryRate.total_calls}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
