import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Project } from '../../types';
import {
  FolderGit2,
  Plus,
  MoreHorizontal,
  Users,
  DollarSign,
  AlertCircle,
  X,
  Check,
  Calendar,
  Layers,
} from 'lucide-react';

export const ProjectsView: React.FC = () => {
  const { projects, createProject, closeProject, setCurrentScope, setActiveNav, tenants, currentScope } = useApp();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState<Project | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Form state
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('2026-08-01');
  const [targetReleaseDate, setTargetReleaseDate] = useState('2026-12-31');
  const [assignedAdmin, setAssignedAdmin] = useState('Sarah Jenkins');
  const [selectedTemplate, setSelectedTemplate] = useState('None (blank project)');
  const [selectedTenantId, setSelectedTenantId] = useState(currentScope.tenantId || 't-lpl');

  const filteredProjects =
    currentScope.type === 'tenant' && currentScope.tenantId
      ? projects.filter((p) => p.tenantId === currentScope.tenantId)
      : projects;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    const t = tenants.find((x) => x.id === selectedTenantId);

    createProject({
      name: projectName.trim(),
      description: description.trim(),
      startDate,
      targetReleaseDate,
      admins: [assignedAdmin],
      tenantId: selectedTenantId,
      tenantName: t?.name || 'LPL Financial',
      template: selectedTemplate,
    });

    setProjectName('');
    setDescription('');
    setCreateModalOpen(false);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Projects active in scope: {currentScope.tenantName || 'All Tenants'}
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create project</span>
        </button>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No projects in this tenant yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Admin(s)</th>
                  <th className="py-3 px-4">Phase</th>
                  <th className="py-3 px-4">Completion</th>
                  <th className="py-3 px-4">Spend (30d)</th>
                  <th className="py-3 px-4">Lifecycle</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                          <FolderGit2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-400">{p.tenantName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {p.admins.join(', ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-[11px]">
                        {p.phase}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${p.completion}%` }}
                          />
                        </div>
                        <span className="font-mono text-slate-600 font-bold">{p.completion}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      ${p.spend30d.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          p.lifecycle === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : p.lifecycle === 'Paused'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            p.lifecycle === 'Active'
                              ? 'bg-emerald-500'
                              : p.lifecycle === 'Paused'
                              ? 'bg-slate-400'
                              : 'bg-rose-500'
                          }`}
                        />
                        {p.lifecycle}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right relative">
                      <button
                        onClick={() => setOpenActionId(openActionId === p.id ? null : p.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {openActionId === p.id && (
                        <div className="absolute right-4 top-10 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 text-left text-xs text-slate-700 animate-in fade-in">
                          <button
                            onClick={() => {
                              setCurrentScope({
                                type: 'project',
                                tenantId: p.tenantId,
                                projectId: p.id,
                                tenantName: p.tenantName,
                                projectName: p.name,
                              });
                              setActiveNav('Dashboard');
                              setOpenActionId(null);
                            }}
                            className="w-full px-3 py-2 hover:bg-slate-50 text-left font-medium"
                          >
                            Open dashboard
                          </button>
                          <button
                            onClick={() => {
                              setCloseTarget(p);
                              setOpenActionId(null);
                            }}
                            className="w-full px-3 py-2 hover:bg-rose-50 text-rose-600 text-left font-medium"
                          >
                            Close project
                          </button>
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

      {/* 4.2 Create Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Create project</h2>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Mobile Banking V2"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide scope and functional intent of this project..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target release date</label>
                  <input
                    type="date"
                    value={targetReleaseDate}
                    onChange={(e) => setTargetReleaseDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Assign Project Admin</label>
                  <span className="text-[10px] text-slate-400">You can assign more than one.</span>
                </div>
                <select
                  value={assignedAdmin}
                  onChange={(e) => setAssignedAdmin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                >
                  <option value="Sarah Jenkins">Sarah Jenkins (PM / Admin)</option>
                  <option value="David Chen">David Chen (Architect / Admin)</option>
                  <option value="Marcus Vance">Marcus Vance (Dev Lead)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Start from template</label>
                  <span className="text-[10px] text-slate-400">
                    Clone connectors, team shape, and module config.
                  </span>
                </div>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                >
                  <option value="None (blank project)">None (blank project)</option>
                  <option value="FinTech Compliance Blueprint">FinTech Compliance Blueprint</option>
                  <option value="FINRA-Ready SpecAI">FINRA-Ready SpecAI</option>
                  <option value="Serverless Cloud Migration">Serverless Cloud Migration</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
                >
                  Create project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4.3 Close Project Dialog */}
      {closeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-extrabold text-slate-900">
                Close {closeTarget.name}?
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Closing triggers the retention policy: test data is scheduled for certified deletion and artifacts become read-only.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setCloseTarget(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  closeProject(closeTarget.id);
                  setCloseTarget(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md"
              >
                Close project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
