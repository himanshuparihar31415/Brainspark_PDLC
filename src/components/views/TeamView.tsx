import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PdlcRole, TeamMember } from '../../types';
import { LandingNote } from '../common/LandingNote';
import { ScopeFilterBar, useScopeFilter } from '../common/ScopeFilterBar';
import {
  Users,
  UserPlus,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const TeamView: React.FC = () => {
  const {
    teamMembers: allTeamMembers,
    assignTeamMember,
    currentRole,
    currentScope,
    navIntent,
  } = useApp();

  const [scopeFilter, setScopeFilter] = useScopeFilter();

  // Roster is scoped twice over: the header scope sets the ceiling, the filter
  // narrows within it. A Tenant Admin's ceiling is everything.
  const teamMembers = allTeamMembers.filter((m) => {
    if (currentScope.type === 'department' && m.departmentId !== currentScope.departmentId) return false;
    if (currentScope.type === 'project' && m.projectId !== currentScope.projectId) return false;
    if (currentRole === 'Tenant Admin' && scopeFilter.departmentId !== 'all' && m.departmentId !== scopeFilter.departmentId)
      return false;
    if (scopeFilter.projectId !== 'all' && m.projectId !== scopeFilter.projectId) return false;
    return true;
  });

  // A Department Admin arriving from the headcount tile lands on the shared pool —
  // the cross-project lever they uniquely own — not the flat roster.
  const [activeTab, setActiveTab] = useState<'roster' | 'shared'>(navIntent?.teamTab ?? 'roster');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  // Form
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<PdlcRole>('Developer');

  const pdlcRoles: PdlcRole[] = [
    'Product Manager',
    'Architect',
    'Designer',
    'Tech Lead',
    'Developer',
    'QA Manager',
    'QA Engineer',
    'Release Manager',
  ];

  const isDepartmentAdmin = ['Tenant Admin', 'Department Admin'].includes(currentRole);

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;
    assignTeamMember({
      name: memberName.trim(),
      email: memberEmail.trim() || `${memberName.toLowerCase().replace(/\s+/g, '')}@incedolabs.com`,
      roles: [selectedRole],
      departmentId: currentScope.departmentId || 'd-engineering',
      projectId: currentScope.projectId || 'p-mobile-v2',
    });
    setMemberName('');
    setMemberEmail('');
    setAssignModalOpen(false);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Team</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Manage project roster role assignments and shared department engineering resource allocation
          </p>
        </div>
        <button
          onClick={() => setAssignModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Assign person</span>
        </button>
      </div>

      <LandingNote />

      <ScopeFilterBar
        value={scopeFilter}
        onChange={setScopeFilter}
        resultCount={teamMembers.length}
        resultNoun="people"
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'roster'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Project roster
        </button>
        {isDepartmentAdmin && (
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'shared'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Shared pool
          </button>
        )}
      </div>

      {/* 5.1 Project Roster Tab */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Assign people to roles</h2>
            <span className="text-xs text-slate-500">
              One person can hold more than one role on a project.
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="py-3 px-4">PDLC Role Slot</th>
                    <th className="py-3 px-4">Assigned Person</th>
                    <th className="py-3 px-4">Module Access</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pdlcRoles.map((role) => {
                    const assignedMember = teamMembers.find((m) => m.roles.includes(role));
                    return (
                      <tr key={role} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {role}
                        </td>
                        <td className="py-3.5 px-4">
                          {assignedMember ? (
                            <div className="flex items-center gap-2.5">
                              <img
                                src={assignedMember.avatar}
                                alt={assignedMember.name}
                                className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                              />
                              <div>
                                <div className="font-semibold text-slate-900">{assignedMember.name}</div>
                                <div className="text-[10px] text-slate-400">{assignedMember.email}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium">No one assigned yet</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {assignedMember ? (
                            <div className="flex flex-wrap gap-1">
                              {assignedMember.moduleAccess.map((mod) => (
                                <span
                                  key={mod}
                                  className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium"
                                >
                                  {mod}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {assignedMember ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                              Assigned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                              Unassigned
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5.2 Shared Pool Tab */}
      {activeTab === 'shared' && (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950 leading-relaxed">
              <span className="font-bold">Department-level shared team:</span> People here can be drawn on by any project in the department. How shared-member time and cost are apportioned across projects is governed by department policy.
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="py-3 px-4">Person</th>
                    <th className="py-3 px-4">Role(s)</th>
                    <th className="py-3 px-4">Drawn on by</th>
                    <th className="py-3 px-4">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamMembers.map((m) => {
                    const isExpanded = expandedMemberId === m.id;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={m.avatar}
                              alt={m.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                            />
                            <div>
                              <div className="font-bold text-slate-900">{m.name}</div>
                              <div className="text-[11px] text-slate-400">{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {m.roles.join(', ')}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => setExpandedMemberId(isExpanded ? null : m.id)}
                            className="flex items-center gap-1.5 font-bold text-indigo-600 hover:underline cursor-pointer"
                          >
                            <span>{m.drawnOnByProjects?.length || 1} projects</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          {isExpanded && m.drawnOnByProjects && (
                            <div className="mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                              {m.drawnOnByProjects.map((p) => (
                                <div key={p} className="flex items-center justify-between">
                                  <span>• {p}</span>
                                  <span className="font-mono font-bold text-slate-500">50%</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full rounded-full"
                                style={{ width: `${m.allocationPercent || 80}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-slate-900">
                              {m.allocationPercent || 80}% allocated
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Assign person to role</h2>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full name</label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="e.g., Alex Rivera"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Corporate email</label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="a.rivera@incedolabs.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select PDLC Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as PdlcRole)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                >
                  {pdlcRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Assign person
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
