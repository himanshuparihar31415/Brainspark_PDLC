import React from 'react';
import { useApp } from '../../context/AppContext';
import { canAccessNav } from '../../data/rbac';
import { GitMerge, CheckCircle2, AlertTriangle, Clock, Play, FileCode, Cpu } from 'lucide-react';

export const OrchestrationView: React.FC = () => {
  const { orchestrationPhases, currentScope, setActiveNav, currentRole } = useApp();

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Orchestration</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Live stage pipeline for {currentScope.projectName || 'Mobile Banking V2'}. Automated agent services carry every artifact through the right stage.
        </p>
      </div>

      {/* Pipeline Strip */}
      <div className="space-y-4">
        {orchestrationPhases.map((phase, idx) => (
          <div
            key={phase.id}
            className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
              phase.status === 'Blocked'
                ? 'border-amber-300 ring-2 ring-amber-500/20 bg-amber-50/10'
                : 'border-slate-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                    phase.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : phase.status === 'In Progress'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : phase.status === 'Blocked'
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {idx + 1}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{phase.name}</h3>
                  <div className="text-[11px] text-slate-400 font-semibold">{phase.agentService}</div>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold ${
                  phase.status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : phase.status === 'In Progress'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : phase.status === 'Blocked'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {phase.status}
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-3">{phase.description}</p>

            {phase.blockers && phase.blockers.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Active Blocker:</span>
                  {phase.blockers.map((b, i) => (
                    <p key={i} className="mt-0.5">{b}</p>
                  ))}
                  {canAccessNav(currentRole, 'Evaluation') && (
                    <button
                      onClick={() => setActiveNav('Evaluation')}
                      className="mt-2 text-[11px] font-bold text-indigo-600 hover:underline inline-block"
                    >
                      Go to Evaluation tab to inspect test suite failure →
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Active Artifacts: <strong className="text-slate-800">{phase.activeArtifacts}</strong></span>
              <span className="font-mono">{phase.currentTask}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
