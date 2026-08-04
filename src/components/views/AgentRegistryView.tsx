import React, { useMemo, useState } from 'react';
import { useApp, AgentRegistration } from '../../context/AppContext';
import { CatalogueAgent } from '../../types';
import { canManageAgents } from '../../data/rbac';
import {
  AGENT_MODULES,
  AGENT_PROVIDERS,
  AGENT_SLUG_HINT,
  AGENT_SLUG_PATTERN,
  AGENT_TYPES,
} from '../../data/agentCatalogue';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Lock,
  Plus,
  Search,
  X,
} from 'lucide-react';

const PAGE_SIZE = 6;

/** Blank POST /agents body. Routing fields are optional — null means "inherit". */
const EMPTY_FORM: AgentRegistration = {
  slug: '',
  name: '',
  module_name: AGENT_MODULES[0],
  agent_type: AGENT_TYPES[0],
  description: null,
  provider: null,
  deployment: null,
  model: null,
  api_version: null,
  fallback_deployment: null,
  fallback_model: null,
};

const inputClass =
  'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:bg-white focus:border-indigo-600';

const labelClass = 'block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1';

const fieldLabel = 'block text-[10px] font-bold uppercase tracking-wider text-slate-400';

/** Formats an ISO timestamp for the table; nulls read as an em dash. */
const formatDate = (iso: string | null): string => (iso ? iso.slice(0, 10) : '—');

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
      active
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'bg-slate-100 text-slate-600 border border-slate-200'
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
    {active ? 'Active' : 'Inactive'}
  </span>
);

export const AgentRegistryView: React.FC = () => {
  const { agents, registerAgent, updateAgent, deactivateAgent, currentRole } = useApp();

  const canManage = canManageAgents(currentRole);

  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeOnly, setActiveOnly] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [offset, setOffset] = useState<number>(0);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [form, setForm] = useState<AgentRegistration>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CatalogueAgent | null>(null);

  const [deactivateTarget, setDeactivateTarget] = useState<CatalogueAgent | null>(null);

  // Modules present in the catalogue, unioned with the known set so a filter
  // exists for an agent registered under a module nobody has used yet.
  const moduleOptions = useMemo(
    () => Array.from(new Set([...AGENT_MODULES, ...agents.map((a) => a.module_name)])).sort(),
    [agents]
  );
  const typeOptions = useMemo(
    () => Array.from(new Set([...AGENT_TYPES, ...agents.map((a) => a.agent_type)])).sort(),
    [agents]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return agents.filter((a) => {
      if (moduleFilter !== 'all' && a.module_name !== moduleFilter) return false;
      if (typeFilter !== 'all' && a.agent_type !== typeFilter) return false;
      if (activeOnly && !a.is_active) return false;
      if (
        term &&
        !`${a.slug} ${a.name} ${a.description ?? ''} ${a.model ?? ''}`.toLowerCase().includes(term)
      ) {
        return false;
      }
      return true;
    });
  }, [agents, moduleFilter, typeFilter, activeOnly, search]);

  // Offset can outrun the result set when a filter narrows it; clamp on read
  // rather than in an effect so the page never renders empty mid-correction.
  const total = filtered.length;
  const safeOffset = offset >= total ? Math.max(0, (Math.ceil(total / PAGE_SIZE) - 1) * PAGE_SIZE) : offset;
  const page = filtered.slice(safeOffset, safeOffset + PAGE_SIZE);

  const detailAgent = detailId ? agents.find((a) => a.id === detailId) ?? null : null;

  const resetFilters = (mutate: () => void) => {
    mutate();
    setOffset(0);
  };

  const openDetail = (agent: CatalogueAgent) => {
    setDetailId(agent.id);
    setEditing(false);
    setDraft(agent);
  };

  const openEdit = (agent: CatalogueAgent) => {
    setDetailId(agent.id);
    setEditing(true);
    setDraft(agent);
  };

  const closeDetail = () => {
    setDetailId(null);
    setEditing(false);
    setDraft(null);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    if (!AGENT_SLUG_PATTERN.test(form.slug)) {
      setFormError(`Invalid slug. ${AGENT_SLUG_HINT}`);
      return;
    }
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }

    const ok = registerAgent({
      ...form,
      name: form.name.trim(),
      description: form.description?.trim() ? form.description.trim() : null,
    });
    if (!ok) {
      setFormError('That slug is already registered. Choose another.');
      return;
    }

    setForm(EMPTY_FORM);
    setFormError(null);
    setRegisterOpen(false);
    setOffset(0);
  };

  const handleSaveDraft = () => {
    if (!draft || !detailAgent) return;
    updateAgent(detailAgent.id, {
      name: draft.name.trim() || detailAgent.name,
      module_name: draft.module_name,
      agent_type: draft.agent_type,
      description: draft.description?.trim() ? draft.description.trim() : null,
      provider: draft.provider || null,
      deployment: draft.deployment || null,
      model: draft.model || null,
      api_version: draft.api_version || null,
      fallback_deployment: draft.fallback_deployment || null,
      fallback_model: draft.fallback_model || null,
      is_active: draft.is_active,
    });
    setEditing(false);
  };

  return (
    <div className="density-compact p-6 md:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Agent Catalogue
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Every agent PromptOps can invoke, with the model routing it resolves to. A deactivated
            agent stays listed for history but cannot be invoked.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => {
              setForm(EMPTY_FORM);
              setFormError(null);
              setRegisterOpen(true);
            }}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Register Agent
          </button>
        )}
      </div>

      {!canManage && (
        <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-px" />
          <div className="text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">Read-only.</span> As {currentRole} you can
            browse the catalogue, but registering, editing and deactivating agents is set on the
            department baseline.
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="platform-card flex flex-col lg:flex-row lg:items-center gap-3 p-3.5">
        <div className="relative w-full lg:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => resetFilters(() => setSearch(e.target.value))}
            placeholder="Slug, name or model…"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-600"
          />
        </div>

        <select
          value={moduleFilter}
          onChange={(e) => resetFilters(() => setModuleFilter(e.target.value))}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-600 font-semibold font-mono"
        >
          <option value="all">All modules</option>
          {moduleOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => resetFilters(() => setTypeFilter(e.target.value))}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-600 font-semibold font-mono"
        >
          <option value="all">All types</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => resetFilters(() => setActiveOnly(e.target.checked))}
            className="w-4 h-4 accent-indigo-600 cursor-pointer"
          />
          Active only
        </label>

        <span className="lg:ml-auto text-xs text-slate-400 font-medium shrink-0">
          <span className="font-bold text-slate-700">{total}</span> of {agents.length} agents
        </span>
      </div>

      {/* Table */}
      <div className="platform-card overflow-hidden">
        {page.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No agents match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="py-3 px-4">Agent</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Provider / Model</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {page.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                            a.is_active
                              ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
                              : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}
                        >
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-slate-900">{a.slug}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">{a.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                      {a.module_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-semibold text-slate-700">
                        {a.agent_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {a.model ? (
                        <div>
                          <div className="font-mono font-bold text-indigo-600">{a.model}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {a.provider ?? 'provider unset'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Platform default</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{formatDate(a.created_at)}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge active={a.is_active} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetail(a)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold cursor-pointer"
                        >
                          View
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => openEdit(a)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold cursor-pointer"
                            >
                              Update
                            </button>
                            <button
                              onClick={() => setDeactivateTarget(a)}
                              disabled={!a.is_active}
                              title={a.is_active ? undefined : 'Already deactivated'}
                              className="px-2.5 py-1 rounded-lg font-bold border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              Deactivate
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs">
            <span className="text-slate-500">
              Showing{' '}
              <span className="font-bold text-slate-800">
                {safeOffset + 1}–{Math.min(safeOffset + PAGE_SIZE, total)}
              </span>{' '}
              of <span className="font-bold text-slate-800">{total}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOffset(Math.max(0, safeOffset - PAGE_SIZE))}
                disabled={safeOffset === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                onClick={() => setOffset(safeOffset + PAGE_SIZE)}
                disabled={safeOffset + PAGE_SIZE >= total}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Register modal */}
      {registerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRegister}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900">Register agent</h2>
              <button
                type="button"
                onClick={() => setRegisterOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Slug (immutable)</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="spec_ai_requirement_engine"
                  required
                  className={`${inputClass} font-mono`}
                />
                <p className="text-[10px] text-slate-400 mt-1">{AGENT_SLUG_HINT}</p>
              </div>

              <div>
                <label className={labelClass}>Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Requirement Engine"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Module</label>
                <select
                  value={form.module_name}
                  onChange={(e) => setForm({ ...form, module_name: e.target.value })}
                  className={`${inputClass} font-mono font-semibold`}
                >
                  {AGENT_MODULES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Agent type</label>
                <select
                  value={form.agent_type}
                  onChange={(e) => setForm({ ...form, agent_type: e.target.value })}
                  className={`${inputClass} font-mono font-semibold`}
                >
                  {AGENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="What this agent does, in one line."
                className={inputClass}
              />
            </div>

            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <h3 className="text-xs font-extrabold text-slate-800">Model routing</h3>
              <p className="text-[10px] text-slate-500 -mt-2">
                Leave blank to inherit the platform default routing.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Provider</label>
                  <select
                    value={form.provider ?? ''}
                    onChange={(e) => setForm({ ...form, provider: e.target.value || null })}
                    className={`${inputClass} bg-white font-mono`}
                  >
                    <option value="">Inherit default</option>
                    {AGENT_PROVIDERS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Deployment</label>
                  <input
                    value={form.deployment ?? ''}
                    onChange={(e) => setForm({ ...form, deployment: e.target.value || null })}
                    placeholder="gpt-5-2-prod"
                    className={`${inputClass} bg-white font-mono`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Model</label>
                  <input
                    value={form.model ?? ''}
                    onChange={(e) => setForm({ ...form, model: e.target.value || null })}
                    placeholder="gpt-5.2"
                    className={`${inputClass} bg-white font-mono`}
                  />
                </div>

                <div>
                  <label className={labelClass}>API version</label>
                  <input
                    value={form.api_version ?? ''}
                    onChange={(e) => setForm({ ...form, api_version: e.target.value || null })}
                    placeholder="2026-05-01-preview"
                    className={`${inputClass} bg-white font-mono`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Fallback deployment</label>
                  <input
                    value={form.fallback_deployment ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, fallback_deployment: e.target.value || null })
                    }
                    placeholder="gpt-5-1-prod"
                    className={`${inputClass} bg-white font-mono`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Fallback model</label>
                  <input
                    value={form.fallback_model ?? ''}
                    onChange={(e) => setForm({ ...form, fallback_model: e.target.value || null })}
                    placeholder="gpt-5.1"
                    className={`${inputClass} bg-white font-mono`}
                  />
                </div>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRegisterOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                Register agent
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Detail drawer */}
      {detailAgent && draft && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 p-6 pb-4">
              <div className="min-w-0">
                <h2 className="text-base font-extrabold text-slate-900 font-mono truncate">
                  {detailAgent.slug}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{detailAgent.name}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 pl-3">
                <StatusBadge active={detailAgent.is_active} />
                <button
                  onClick={closeDetail}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Identity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className={fieldLabel}>Agent id</span>
                  <div className="font-mono text-slate-700 break-all">{detailAgent.id}</div>
                </div>
                <div>
                  <span className={fieldLabel}>Registered</span>
                  <div className="font-mono text-slate-700">{formatDate(detailAgent.created_at)}</div>
                </div>
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Name</label>
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Module</label>
                      <select
                        value={draft.module_name}
                        onChange={(e) => setDraft({ ...draft, module_name: e.target.value })}
                        className={`${inputClass} font-mono font-semibold`}
                      >
                        {moduleOptions.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Agent type</label>
                      <select
                        value={draft.agent_type}
                        onChange={(e) => setDraft({ ...draft, agent_type: e.target.value })}
                        className={`${inputClass} font-mono font-semibold`}
                      >
                        {typeOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Description</label>
                    <textarea
                      value={draft.description ?? ''}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      rows={3}
                      className={inputClass}
                    />
                  </div>

                  <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <h3 className="text-xs font-extrabold text-slate-800">Model routing</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Provider</label>
                        <select
                          value={draft.provider ?? ''}
                          onChange={(e) => setDraft({ ...draft, provider: e.target.value || null })}
                          className={`${inputClass} bg-white font-mono`}
                        >
                          <option value="">Inherit default</option>
                          {AGENT_PROVIDERS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Deployment</label>
                        <input
                          value={draft.deployment ?? ''}
                          onChange={(e) => setDraft({ ...draft, deployment: e.target.value || null })}
                          className={`${inputClass} bg-white font-mono`}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Model</label>
                        <input
                          value={draft.model ?? ''}
                          onChange={(e) => setDraft({ ...draft, model: e.target.value || null })}
                          className={`${inputClass} bg-white font-mono`}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>API version</label>
                        <input
                          value={draft.api_version ?? ''}
                          onChange={(e) =>
                            setDraft({ ...draft, api_version: e.target.value || null })
                          }
                          className={`${inputClass} bg-white font-mono`}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Fallback deployment</label>
                        <input
                          value={draft.fallback_deployment ?? ''}
                          onChange={(e) =>
                            setDraft({ ...draft, fallback_deployment: e.target.value || null })
                          }
                          className={`${inputClass} bg-white font-mono`}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Fallback model</label>
                        <input
                          value={draft.fallback_model ?? ''}
                          onChange={(e) =>
                            setDraft({ ...draft, fallback_model: e.target.value || null })
                          }
                          className={`${inputClass} bg-white font-mono`}
                        />
                      </div>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={draft.is_active}
                      onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                      className="w-4 h-4 accent-indigo-600 cursor-pointer"
                    />
                    Active — available for invocation
                  </label>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className={fieldLabel}>Module</span>
                      <div className="font-mono font-bold text-slate-800">
                        {detailAgent.module_name}
                      </div>
                    </div>
                    <div>
                      <span className={fieldLabel}>Agent type</span>
                      <div className="font-mono font-bold text-slate-800">
                        {detailAgent.agent_type}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className={fieldLabel}>Description</span>
                    <p className="text-slate-700 leading-relaxed mt-0.5">
                      {detailAgent.description ?? (
                        <span className="text-slate-400">No description recorded.</span>
                      )}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <h3 className="text-xs font-extrabold text-slate-800">Model routing</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 font-mono">
                      <div>
                        <span className={fieldLabel}>Provider</span>
                        <div className="text-slate-800 font-bold">
                          {detailAgent.provider ?? '—'}
                        </div>
                      </div>
                      <div>
                        <span className={fieldLabel}>API version</span>
                        <div className="text-slate-800">{detailAgent.api_version ?? '—'}</div>
                      </div>
                      <div>
                        <span className={fieldLabel}>Deployment</span>
                        <div className="text-slate-800">{detailAgent.deployment ?? '—'}</div>
                      </div>
                      <div>
                        <span className={fieldLabel}>Model</span>
                        <div className="text-indigo-600 font-bold">{detailAgent.model ?? '—'}</div>
                      </div>
                      <div>
                        <span className={fieldLabel}>Fallback deployment</span>
                        <div className="text-slate-800">
                          {detailAgent.fallback_deployment ?? '—'}
                        </div>
                      </div>
                      <div>
                        <span className={fieldLabel}>Fallback model</span>
                        <div className="text-slate-800">{detailAgent.fallback_model ?? '—'}</div>
                      </div>
                    </div>
                    {!detailAgent.fallback_model && (
                      <p className="text-[10px] text-slate-500">
                        No fallback pinned — a provider error surfaces to the caller.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-4 flex items-center justify-end gap-2 text-xs">
              {editing ? (
                <>
                  <button
                    onClick={() => {
                      setDraft(detailAgent);
                      setEditing(false);
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDraft}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                  >
                    Save changes
                  </button>
                </>
              ) : (
                <>
                  {canManage && (
                    <button
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={closeDetail}
                    className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deactivate confirmation */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
              <h2 className="text-base font-extrabold text-slate-900">
                Deactivate {deactivateTarget.slug}?
              </h2>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This is a soft delete. The agent stays in the catalogue with an{' '}
              <span className="font-bold">Inactive</span> badge so past runs still resolve it, but no
              new invocation can route to it. Reactivate it from the detail drawer at any time.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setDeactivateTarget(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deactivateAgent(deactivateTarget.id);
                  setDeactivateTarget(null);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
              >
                Deactivate agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
