import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Tenant } from '../../types';
import {
  Building2,
  Plus,
  MoreHorizontal,
  FolderGit2,
  Users,
  DollarSign,
  AlertTriangle,
  X,
  Check,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

export const TenantsView: React.FC = () => {
  const { tenants, createTenant, deactivateTenant, suspendTenant, setCurrentScope, setActiveNav } = useApp();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deactivateModalTarget, setDeactivateModalTarget] = useState<Tenant | null>(null);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inheritDefaults, setInheritDefaults] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (tenants.some((t) => t.name.toLowerCase() === name.trim().toLowerCase())) {
      setErrorMsg('A department with this name already exists.');
      return;
    }
    createTenant(name.trim(), email.trim() || 'admin@' + name.toLowerCase().replace(/\s+/g, '') + '.com', inheritDefaults);
    setName('');
    setEmail('');
    setErrorMsg('');
    setCreateModalOpen(false);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedTenantIds(tenants.map((t) => t.id));
    } else {
      setSelectedTenantIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedTenantIds.includes(id)) {
      setSelectedTenantIds(selectedTenantIds.filter((x) => x !== id));
    } else {
      setSelectedTenantIds([...selectedTenantIds, id]);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Departments</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Manage departments within your organization and their administrative credentials
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Department</span>
        </button>
      </div>

      {/* Bulk bar */}
      {selectedTenantIds.length > 0 && (
        <div className="bg-slate-900 text-white p-3 px-5 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <span className="font-semibold">{selectedTenantIds.length} selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                selectedTenantIds.forEach((id) => suspendTenant(id));
                setSelectedTenantIds([]);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium"
            >
              Suspend
            </button>
            <button
              onClick={() => {
                selectedTenantIds.forEach((id) => deactivateTenant(id));
                setSelectedTenantIds([]);
              }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 rounded-lg font-medium"
            >
              Deactivate
            </button>
            <button
              onClick={() => setSelectedTenantIds([])}
              className="px-3 py-1.5 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Departments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {tenants.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No departments yet. Create the first one to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedTenantIds.length === tenants.length && tenants.length > 0}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Projects</th>
                  <th className="py-3 px-4">Headcount</th>
                  <th className="py-3 px-4">Spend (30d)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={selectedTenantIds.includes(t.id)}
                        onChange={() => handleSelectOne(t.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{t.name}</div>
                          <div className="text-[11px] text-slate-400">{t.adminEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {t.projectsCount}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {t.headcount} people
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      ${t.spend30d.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          t.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : t.status === 'Suspended'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            t.status === 'Active'
                              ? 'bg-emerald-500'
                              : t.status === 'Suspended'
                              ? 'bg-slate-400'
                              : 'bg-rose-500'
                          }`}
                        />
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right relative">
                      <button
                        onClick={() => setOpenActionId(openActionId === t.id ? null : t.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {openActionId === t.id && (
                        <div className="absolute right-4 top-10 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 text-left text-xs text-slate-700 animate-in fade-in">
                          <button
                            onClick={() => {
                              setCurrentScope({ type: 'tenant', tenantId: t.id, tenantName: t.name });
                              setActiveNav('Dashboard');
                              setOpenActionId(null);
                            }}
                            className="w-full px-3 py-2 hover:bg-slate-50 text-left font-medium"
                          >
                            Open dashboard
                          </button>
                          <button
                            onClick={() => {
                              suspendTenant(t.id);
                              setOpenActionId(null);
                            }}
                            className="w-full px-3 py-2 hover:bg-slate-50 text-left font-medium"
                          >
                            Suspend
                          </button>
                          <button
                            onClick={() => {
                              setDeactivateModalTarget(t);
                              setOpenActionId(null);
                            }}
                            className="w-full px-3 py-2 hover:bg-rose-50 text-rose-600 text-left font-medium"
                          >
                            Deactivate
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

      {/* Create Department Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Create Department</h2>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Department name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Digital Engineering"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Department Admin email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@acme.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-bold text-slate-800">Inherit platform defaults</span>
                  <input
                    type="checkbox"
                    checked={inheritDefaults}
                    onChange={(e) => setInheritDefaults(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
                <p className="text-[11px] text-slate-500">
                  Security baselines, budgets, and guardrail policy from platform settings.
                </p>
              </div>

              {errorMsg && <p className="text-xs text-rose-600 font-semibold">{errorMsg}</p>}

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
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3.3 Deactivate Confirmation */}
      {deactivateModalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-extrabold text-slate-900">
                Deactivate {deactivateModalTarget.name}?
              </h2>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              All projects under this tenant will become read-only. This can be reversed.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setDeactivateModalTarget(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deactivateTenant(deactivateModalTarget.id);
                  setDeactivateModalTarget(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md"
              >
                Deactivate tenant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
