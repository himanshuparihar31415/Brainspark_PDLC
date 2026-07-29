import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AgentService } from '../../types';
import { canAccessNav, canDeprecateAgent } from '../../data/rbac';
import { ScopeFilterBar, useScopeFilter } from '../common/ScopeFilterBar';
import { MODULE_DEFS } from '../../data/modules';
import {
  Cpu,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  X,
  Search,
  Lock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export const AgentRegistryView: React.FC = () => {
  const { agents, deprecateAgent, setActiveNav, currentRole, moduleActivity, projects } = useApp();

  const [scopeFilter, setScopeFilter] = useScopeFilter();

  const canDeprecate = canDeprecateAgent(currentRole);
  // Version history lives in Prompt Controls, which is tenant-scoped.
  const canViewVersionHistory = canAccessNav(currentRole, 'Prompt Controls');

  const [selectedModule, setSelectedModule] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [filterSearch, setFilterSearch] = useState<string>('');

  const [configDrawerAgent, setConfigDrawerAgent] = useState<AgentService | null>(null);
  const [deprecateTarget, setDeprecateTarget] = useState<AgentService | null>(null);
  const [migrationNote, setMigrationNote] = useState('');

  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Sorting: Problems first (Held, Failed, Drift)
  const sortedAgents = [...agents].sort((a, b) => {
    const aProblem = a.status === 'Held' || !a.lastEvaluationPassed || a.drift.includes('Drift');
    const bProblem = b.status === 'Held' || !b.lastEvaluationPassed || b.drift.includes('Drift');
    if (aProblem && !bProblem) return -1;
    if (!aProblem && bProblem) return 1;
    return 0;
  });

  // Scope narrows the registry to the agents actually exercised by the projects
  // in view, so a tenant or project filter answers "which agents do we depend on".
  const scopedProjectIds = projects
    .filter((p) => {
      if (currentRole === 'Super Admin' && scopeFilter.tenantId !== 'all' && p.tenantId !== scopeFilter.tenantId)
        return false;
      if (scopeFilter.projectId !== 'all' && p.id !== scopeFilter.projectId) return false;
      return true;
    })
    .map((p) => p.id);

  const scopeNarrowed = scopeFilter.tenantId !== 'all' || scopeFilter.projectId !== 'all';
  const agentIdsInScope = new Set(
    moduleActivity
      .filter((m) => scopedProjectIds.includes(m.projectId))
      .map((m) => MODULE_DEFS.find((d) => d.key === m.module)?.agentId)
      .filter((id): id is string => Boolean(id))
  );

  const filteredAgents = sortedAgents.filter((a) => {
    if (scopeNarrowed && !agentIdsInScope.has(a.id)) return false;
    if (selectedModule !== 'All' && a.module !== selectedModule) return false;
    if (selectedStatus !== 'All' && a.status !== selectedStatus) return false;
    if (filterSearch && !a.capability.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const handleDeprecateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!migrationNote.trim()) return;
    if (deprecateTarget) {
      deprecateAgent(deprecateTarget.id, migrationNote.trim());
      setDeprecateTarget(null);
      setMigrationNote('');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Agent Registry</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Every agent-backed capability wired into the platform via API/MCP. Registry status is the runtime gate — only Active services can be invoked.
        </p>
      </div>

      <ScopeFilterBar
        value={scopeFilter}
        onChange={setScopeFilter}
        resultCount={filteredAgents.length}
        resultNoun="agent services"
      />

      {!canDeprecate && (
        <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-px" />
          <div className="text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">Read-only.</span> As {currentRole} you can review
            registry status and held agents, but version deprecation is set on the tenant baseline.
          </div>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Capability or tag search…"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-600"
            />
          </div>

          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-600 font-semibold"
          >
            <option value="All">All Modules</option>
            <option value="SpecAI">SpecAI</option>
            <option value="CodeIQ">CodeIQ</option>
            <option value="Architect Hub">Architect Hub</option>
            <option value="DesignAI">DesignAI</option>
            <option value="IntelliQA">IntelliQA</option>
            <option value="Release Pulse">Release Pulse</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-600 font-semibold"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Held">Held</option>
            <option value="Deprecated">Deprecated</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-medium shrink-0">
          Sorted: <span className="font-bold text-slate-700">Problems first</span>
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredAgents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No agent services registered in this scope.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="py-3 px-4">Capability</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Evaluation</th>
                  <th className="py-3 px-4">Drift</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAgents.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <div>{a.capability}</div>
                          <div className="text-[10px] text-slate-400 font-normal line-clamp-1">{a.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {a.module}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {a.version}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          a.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : a.status === 'Held'
                            ? 'bg-slate-800 text-white border border-slate-700'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            a.status === 'Active'
                              ? 'bg-emerald-500'
                              : a.status === 'Held'
                              ? 'bg-amber-400'
                              : 'bg-amber-500'
                          }`}
                        />
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setActiveNav('Evaluation')}
                        className={`flex items-center gap-1 hover:underline font-semibold cursor-pointer ${
                          a.lastEvaluationPassed ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {a.lastEvaluationPassed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Passed {a.lastEvaluationDate}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Failed {a.lastEvaluationDate}</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          a.drift.includes('Drift') ? 'text-amber-600 font-bold' : 'text-slate-400'
                        }`}
                      >
                        {a.drift}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right relative">
                      <button
                        onClick={() => setOpenActionId(openActionId === a.id ? null : a.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {openActionId === a.id && (
                        <div className="absolute right-4 top-10 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 text-left text-xs text-slate-700 animate-in fade-in">
                          <button
                            onClick={() => {
                              setConfigDrawerAgent(a);
                              setOpenActionId(null);
                            }}
                            className="w-full px-3 py-2 hover:bg-slate-50 text-left font-medium"
                          >
                            View configuration
                          </button>
                          {canViewVersionHistory && (
                            <button
                              onClick={() => {
                                setActiveNav('Prompt Controls');
                                setOpenActionId(null);
                              }}
                              className="w-full px-3 py-2 hover:bg-slate-50 text-left font-medium"
                            >
                              Version history
                            </button>
                          )}
                          {canDeprecate ? (
                            <button
                              onClick={() => {
                                setDeprecateTarget(a);
                                setOpenActionId(null);
                              }}
                              className="w-full px-3 py-2 hover:bg-amber-50 text-amber-700 text-left font-medium"
                            >
                              Deprecate…
                            </button>
                          ) : (
                            <div className="px-3 py-2 text-[10px] leading-snug text-slate-400 border-t border-slate-100">
                              Deprecation is a tenant-level action.
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 7.2 Read-Only Agent Configuration Drawer */}
      {configDrawerAgent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-lg h-full p-6 shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-extrabold text-slate-900">
                  {configDrawerAgent.capability} — configuration
                </h2>
                <button
                  onClick={() => setConfigDrawerAgent(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Read-only banner */}
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p>
                  This view is read-only. Configuration changes are made in the agent-authoring environment and must clear evaluation before going live.
                </p>
              </div>

              {/* Read-Only Fields */}
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                    Name & Module
                  </span>
                  <div className="font-bold text-slate-900 text-sm">{configDrawerAgent.capability}</div>
                  <div className="text-slate-500 mt-0.5">Module: {configDrawerAgent.module}</div>
                </div>

                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                    Description
                  </span>
                  <div className="text-slate-700 mt-0.5 leading-relaxed">{configDrawerAgent.description}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                      Underlying Model
                    </span>
                    <span className="font-mono font-bold text-indigo-600">{configDrawerAgent.underlyingModel}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                      Action Scope
                    </span>
                    <span className="font-semibold text-slate-800">{configDrawerAgent.actionScope}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block mb-1">
                    Permitted Tools
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {configDrawerAgent.permittedTools.map((tool) => (
                      <span key={tool} className="px-2.5 py-1 bg-slate-100 font-mono text-slate-700 rounded-md text-[11px]">
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] block">
                    Memory & Context Settings
                  </span>
                  <div className="text-slate-700 font-medium mt-0.5">{configDrawerAgent.memorySettings}</div>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Token Budget</span>
                    <span className="font-bold text-slate-900">{configDrawerAgent.tokenBudgetPerInvocation.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Cost Ceiling</span>
                    <span className="font-bold text-slate-900">${configDrawerAgent.costCeilingPerInvocation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] block">Rate Limit</span>
                    <span className="font-bold text-slate-900">{configDrawerAgent.rateLimit}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setConfigDrawerAgent(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7.3 Deprecate Dialog */}
      {deprecateTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-extrabold text-slate-900">
                Deprecate {deprecateTarget.capability} {deprecateTarget.version}?
              </h2>
            </div>

            <p className="text-xs text-slate-600">
              Pinned by {deprecateTarget.pinnedByProjectsCount || 2} project(s): Mobile Banking V2, AI Wealth Advisor. Provide a migration path before deprecating.
            </p>

            <form onSubmit={handleDeprecateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Migration note (required)</label>
                <textarea
                  value={migrationNote}
                  onChange={(e) => setMigrationNote(e.target.value)}
                  placeholder="e.g., Migrate invocation calls to SpecAI Engine v2.5.0 before September 1st..."
                  required
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeprecateTarget(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md"
                >
                  Deprecate version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
