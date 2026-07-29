import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AgentEvaluation } from '../../types';
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export const EvaluationView: React.FC = () => {
  const { evaluations } = useApp();

  const evaluationKeys = Object.keys(evaluations);
  const [selectedAgentKey, setSelectedAgentKey] = useState<string>(evaluationKeys[0] || 'agent-specai');

  const currentEval: AgentEvaluation = evaluations[selectedAgentKey] || evaluations['agent-specai'];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Evaluation</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Golden-dataset results for every agent service, against configured thresholds. Passing every threshold promotes a service to Active automatically.
        </p>
      </div>

      {/* Agent Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {evaluationKeys.map((key) => {
          const item = evaluations[key];
          const isSelected = selectedAgentKey === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedAgentKey(key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 border ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{item.capability}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  item.overallPassed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {item.version}
              </span>
            </button>
          );
        })}
      </div>

      {/* Per-agent Evaluation Results */}
      {currentEval && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            {/* Header Block */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900">{currentEval.capability}</h2>
                  <span className="font-mono text-xs text-slate-500 font-bold px-2 py-0.5 bg-slate-100 rounded-md">
                    {currentEval.version}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Last Golden Evaluation Run: {currentEval.lastRunDate}</p>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold ${
                  currentEval.overallPassed
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {currentEval.overallPassed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Passed
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600" /> Failed
                  </>
                )}
              </span>
            </div>

            {/* Metrics Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="py-2.5 px-4">Metric</th>
                    <th className="py-2.5 px-4">Result</th>
                    <th className="py-2.5 px-4">Configured Threshold</th>
                    <th className="py-2.5 px-4">Pass / Fail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {currentEval.metrics.map((m) => (
                    <tr key={m.metric} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-slate-900">{m.metric}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{m.result}%</td>
                      <td className="py-3 px-4 text-slate-500">{m.threshold}%</td>
                      <td className="py-3 px-4">
                        {m.passed ? (
                          <span className="text-emerald-700 font-bold font-sans flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Passed
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold font-sans flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" /> ✗ below threshold
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Dynamic Gate Statement */}
            <div
              className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-3 ${
                currentEval.overallPassed
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}
            >
              {currentEval.overallPassed ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>All thresholds cleared — promoted to Active in the Registry.</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>One or more thresholds not met — held out of the Registry until re-evaluated.</span>
                </>
              )}
            </div>
          </div>

          {/* 8.2 Evaluation History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <span>Evaluation history</span>
              </h3>
              <span className="text-xs text-slate-400">Regressions between versions are highlighted.</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="py-2.5 px-4">Version</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Result</th>
                    <th className="py-2.5 px-4">Changed Metrics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentEval.history.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{h.version}</td>
                      <td className="py-3 px-4 text-slate-500">{h.date}</td>
                      <td className="py-3 px-4 font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] ${
                            h.result === 'Passed' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {h.result}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{h.changedMetrics}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
