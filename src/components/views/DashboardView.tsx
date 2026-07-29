import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  DollarSign,
  Cpu,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  ChevronDown,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { currentScope, currentRole, tenants, projects, agents, orchestrationPhases, setActiveNav } = useApp();

  const [drillDownCostOpen, setDrillDownCostOpen] = useState(false);
  const [highlightedPhase, setHighlightedPhase] = useState<string | null>(null);
  const [breadcrumbPath, setBreadcrumbPath] = useState<string[]>([]);

  // Calculate scope numbers
  const scopeTitle =
    currentScope.type === 'platform'
      ? 'Platform-wide roll-up across all tenants'
      : currentScope.type === 'tenant'
      ? `${currentScope.tenantName} — all projects`
      : `${currentScope.projectName}`;

  const headcountVal =
    currentScope.type === 'platform'
      ? tenants.reduce((acc, t) => acc + t.headcount, 0)
      : currentScope.type === 'tenant'
      ? 42
      : 18;

  const totalCostVal =
    currentScope.type === 'platform'
      ? tenants.reduce((acc, t) => acc + t.spend30d, 0)
      : currentScope.type === 'tenant'
      ? 14850
      : 6420;

  const tokensVal =
    currentScope.type === 'platform'
      ? '184.2M'
      : currentScope.type === 'tenant'
      ? '92.4M'
      : '42.1M';

  const completionVal =
    currentScope.type === 'platform'
      ? 62
      : currentScope.type === 'tenant'
      ? 68
      : 74;

  const handleTileClick = (metricName: string) => {
    if (metricName === 'Total cost') {
      setDrillDownCostOpen(!drillDownCostOpen);
      setBreadcrumbPath(['Platform', currentScope.tenantName || 'Incedo Labs', currentScope.projectName || 'Mobile Banking V2', 'AI Spend']);
    } else if (metricName === 'Overall completion') {
      setHighlightedPhase('phase-codeiq');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header & Breadcrumb */}
      <div>
        {breadcrumbPath.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <button
              onClick={() => setBreadcrumbPath([])}
              className="flex items-center gap-1 text-indigo-600 font-semibold hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>‹ Back to previous level</span>
            </button>
            <span>•</span>
            <div className="flex items-center gap-1 text-slate-600">
              {breadcrumbPath.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span>›</span>}
                  <span className={idx === breadcrumbPath.length - 1 ? 'font-bold text-slate-900' : ''}>{item}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">{scopeTitle}</p>
      </div>

      {/* 2.1 Roll-up Tiles (4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Tile 1: Headcount */}
        <div
          onClick={() => handleTileClick('Headcount')}
          title="Click to see where this comes from."
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Team headcount</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight">{headcountVal} people</div>
          <div className="mt-1 text-xs text-slate-500">assigned in {currentScope.type}</div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-600 font-semibold">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +12% vs last month
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Tile 2: Total Cost */}
        <div
          onClick={() => handleTileClick('Total cost')}
          title="Click to see where this comes from."
          className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
            drillDownCostOpen ? 'ring-2 ring-indigo-600 border-indigo-600' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total cost</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" /> Over budget
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
            ${totalCostVal.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500">cumulative AI spend</div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
            <span className="text-slate-500">Target: $12,000/mo</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Tile 3: Tokens Consumed */}
        <div
          onClick={() => handleTileClick('Tokens')}
          title="Click to see where this comes from."
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tokens consumed</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight">{tokensVal}</div>
          <div className="mt-1 text-xs text-slate-500">across all invocations</div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
            <span className="text-indigo-600 font-medium">99.4% Gemini 2.5 Pro/Flash</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Tile 4: Overall Completion */}
        <div
          onClick={() => handleTileClick('Overall completion')}
          title="Click to see where this comes from."
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Overall completion</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              On track
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight">{completionVal}%</div>
          <div className="mt-1 text-xs text-slate-500">of planned work</div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-semibold">
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mr-2">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${completionVal}%` }} />
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </div>
        </div>
      </div>

      {/* 2.2 Quick-Drill (from Cost tile) */}
      {drillDownCostOpen && (
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400">
                Top spend in {currentScope.type}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Breakdown by active capability and project resource consumption
              </p>
            </div>
            <button
              onClick={() => setDrillDownCostOpen(false)}
              className="text-xs text-slate-400 hover:text-white px-3 py-1 bg-slate-800 rounded-lg"
            >
              Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Agent / Project</th>
                  <th className="py-2.5 px-3">Cost</th>
                  <th className="py-2.5 px-3">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr className="hover:bg-slate-800/50">
                  <td className="py-3 px-3 font-mono text-slate-400">#1</td>
                  <td className="py-3 px-3 font-semibold text-white">CodeIQ Generation & Review (Agent)</td>
                  <td className="py-3 px-3 font-mono text-indigo-300">$6,420</td>
                  <td className="py-3 px-3">43.2%</td>
                </tr>
                <tr className="hover:bg-slate-800/50">
                  <td className="py-3 px-3 font-mono text-slate-400">#2</td>
                  <td className="py-3 px-3 font-semibold text-white">AI Wealth Advisor Engine (Project)</td>
                  <td className="py-3 px-3 font-mono text-indigo-300">$5,120</td>
                  <td className="py-3 px-3">34.4%</td>
                </tr>
                <tr className="hover:bg-slate-800/50">
                  <td className="py-3 px-3 font-mono text-slate-400">#3</td>
                  <td className="py-3 px-3 font-semibold text-white">SpecAI Requirement Engine (Agent)</td>
                  <td className="py-3 px-3 font-mono text-indigo-300">$3,310</td>
                  <td className="py-3 px-3">22.4%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2.3 Project Admin Unified Orchestration View */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Where the project stands now
            </h2>
            <p className="text-xs text-slate-500">
              Live PDLC phase strip & automated agent pipeline status
            </p>
          </div>
          <button
            onClick={() => setActiveNav('Orchestration')}
            className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Open Orchestration Center</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Phase Strip Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orchestrationPhases.map((phase) => {
            const isHighlighted = highlightedPhase === phase.id;
            return (
              <div
                key={phase.id}
                onClick={() => setHighlightedPhase(isHighlighted ? null : phase.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isHighlighted
                    ? 'ring-2 ring-indigo-600 bg-indigo-50/20 border-indigo-500 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">{phase.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      phase.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : phase.status === 'In Progress'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : phase.status === 'Blocked'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {phase.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{phase.description}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">{phase.agentService}</span>
                  <span className="font-mono text-slate-500">{phase.completionPercent}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
