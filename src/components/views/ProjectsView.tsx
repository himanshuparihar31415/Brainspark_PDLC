import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Project, Tenant } from '../../types';
import { LandingNote } from '../common/LandingNote';
import { ScopeFilterBar, useScopeFilter } from '../common/ScopeFilterBar';
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
  FileText,
  Settings2,
  UserPlus,
  Rocket,
  ArrowRight,
  ArrowLeft,
  Cpu,
  Shield,
  GitBranch,
  Figma,
  Workflow,
} from 'lucide-react';

/* ─── Phase-based Create Project Modal (5-step wizard) ─── */

interface ModalPhase {
  id: string;
  label: string;
  icon: React.ElementType;
  subtitle: string;
}

const PHASES: ModalPhase[] = [
  { id: 'identity', label: 'Identity & Context', icon: FileText, subtitle: 'Define what this project is and why it exists.' },
  { id: 'modules', label: 'PDLC & AI Config', icon: Cpu, subtitle: 'Choose which AI modules to enable and set budgets.' },
  { id: 'timeline', label: 'Timeline & Team', icon: Calendar, subtitle: 'Set delivery dates, cadence, and assign ownership.' },
  { id: 'integrations', label: 'Integrations', icon: GitBranch, subtitle: 'Connect dev tools and choose a starting template.' },
  { id: 'review', label: 'Review & Create', icon: Rocket, subtitle: 'Confirm everything before creating the project.' },
];

const PROJECT_TYPES = ['New Development', 'Migration', 'Enhancement', 'Compliance Overhaul', 'PoC / Spike'] as const;
const DOMAINS = ['FinTech', 'Healthcare', 'Insurance', 'Retail', 'SaaS', 'Other'] as const;
const PRIORITIES = ['Critical', 'High', 'Standard', 'Low'] as const;
const MODELS = ['Standard (GPT-4o)', 'Premium (GPT-4.5 / Claude)', 'Cost-optimized (GPT-4o-mini)'] as const;
const COMPLIANCE = ['None', 'FINRA', 'HIPAA', 'SOC2', 'ISO 27001', 'PCI-DSS'] as const;
const CADENCES = ['1 week', '2 weeks', '3 weeks', '4 weeks'] as const;

const PDLC_MODULES = [
  { id: 'spec-ai', label: 'Spec AI', desc: 'Requirements & user stories' },
  { id: 'design-ai', label: 'Design AI', desc: 'UX/UI prototyping' },
  { id: 'code-iq', label: 'CodeIQ', desc: 'Code generation & review' },
  { id: 'intelli-qa', label: 'IntelliQA', desc: 'Testing & quality' },
  { id: 'release-pulse', label: 'Release Pulse', desc: 'Release & deployment' },
] as const;

interface CreateProjectModalProps {
  projectName: string;
  setProjectName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  targetReleaseDate: string;
  setTargetReleaseDate: (v: string) => void;
  assignedAdmin: string;
  setAssignedAdmin: (v: string) => void;
  selectedTemplate: string;
  setSelectedTemplate: (v: string) => void;
  selectedTenantId: string;
  setSelectedTenantId: (v: string) => void;
  tenants: Tenant[];
  canFilterByTenant: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  projectName, setProjectName,
  description, setDescription,
  startDate, setStartDate,
  targetReleaseDate, setTargetReleaseDate,
  assignedAdmin, setAssignedAdmin,
  selectedTemplate, setSelectedTemplate,
  selectedTenantId, setSelectedTenantId,
  tenants, canFilterByTenant,
  onSubmit, onClose,
}) => {
  const [phase, setPhase] = useState(0);
  const [projectType, setProjectType] = useState<string>('New Development');
  const [domain, setDomain] = useState<string>('FinTech');
  const [priority, setPriority] = useState<string>('Standard');
  const [enabledModules, setEnabledModules] = useState<string[]>(['spec-ai', 'code-iq', 'intelli-qa', 'release-pulse']);
  const [aiBudget, setAiBudget] = useState('5000');
  const [modelTier, setModelTier] = useState<string>('Standard (GPT-4o)');
  const [compliance, setCompliance] = useState<string>('None');
  const [sprintCadence, setSprintCadence] = useState<string>('2 weeks');
  const [teamSize, setTeamSize] = useState('6');
  const [gitRepo, setGitRepo] = useState('');
  const [jiraBoard, setJiraBoard] = useState('');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [ciPipeline, setCiPipeline] = useState('');

  const toggleModule = (id: string) => {
    setEnabledModules((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  const canNext = () => {
    if (phase === 0) return projectName.trim().length > 0;
    if (phase === 1) return enabledModules.length > 0;
    return true;
  };

  const inputClass = 'w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-1 focus:ring-indigo-400/20';
  const selectClass = inputClass;
  const labelClass = 'block text-[11px] font-semibold text-slate-600 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 animate-in zoom-in-95"
        style={{ minHeight: '480px', maxHeight: '85vh' }}
      >
        {/* Left — Vertical Phase Strip */}
        <div className="w-52 shrink-0 border-r border-slate-100 bg-slate-50/80 p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-5">Create Project</h3>
            <nav className="space-y-0.5">
              {PHASES.map((p, i) => {
                const Icon = p.icon;
                const isActive = i === phase;
                const isDone = i < phase;
                return (
                  <button
                    key={p.id}
                    onClick={() => (isDone || isActive) && setPhase(i)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[11px] transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : isDone
                        ? 'text-emerald-700 font-medium cursor-pointer hover:bg-emerald-50'
                        : 'text-slate-400 cursor-default'
                    }`}
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      isActive ? 'bg-white/20' : isDone ? 'bg-emerald-100' : 'bg-slate-200/60'
                    }`}>
                      {isDone ? <Check className="h-3 w-3 text-emerald-600" /> : <Icon className="h-3 w-3" />}
                    </div>
                    <span className="leading-tight">{p.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="text-[10px] text-slate-400">Step {phase + 1} of {PHASES.length}</div>
        </div>

        {/* Right — Form content */}
        <div className="flex flex-1 flex-col p-6 overflow-y-auto">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">{PHASES[phase].label}</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{PHASES[phase].subtitle}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4">
            {/* Phase 1: Identity & Context */}
            {phase === 0 && (
              <>
                <div>
                  <label className={labelClass}>Project name *</label>
                  <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g., Mobile Banking V2" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Business objective</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What are we delivering and why? (helps AI agents understand intent)" rows={2} className={inputClass} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Project type</label>
                    <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={selectClass}>
                      {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Domain</label>
                    <select value={domain} onChange={(e) => setDomain(e.target.value)} className={selectClass}>
                      {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Priority</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectClass}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                {canFilterByTenant && (
                  <div>
                    <label className={labelClass}>Tenant</label>
                    <select value={selectedTenantId} onChange={(e) => setSelectedTenantId(e.target.value)} className={selectClass}>
                      {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Phase 2: PDLC & AI Config */}
            {phase === 1 && (
              <>
                <div>
                  <label className={labelClass}>Enable PDLC Modules</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {PDLC_MODULES.map((m) => {
                      const on = enabledModules.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleModule(m.id)}
                          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all cursor-pointer ${
                            on ? 'border-indigo-300 bg-indigo-50/60 ring-1 ring-indigo-200' : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                            on ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'
                          }`}>
                            {on && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold text-slate-800">{m.label}</div>
                            <div className="text-[10px] text-slate-400">{m.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Monthly AI budget ($)</label>
                    <input type="number" value={aiBudget} onChange={(e) => setAiBudget(e.target.value)} placeholder="5000" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Preferred model tier</label>
                    <select value={modelTier} onChange={(e) => setModelTier(e.target.value)} className={selectClass}>
                      {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Compliance framework</label>
                  <select value={compliance} onChange={(e) => setCompliance(e.target.value)} className={selectClass}>
                    {COMPLIANCE.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400">Agents will apply framework-specific guardrails to all generated artifacts.</p>
                </div>
              </>
            )}

            {/* Phase 3: Timeline & Team */}
            {phase === 2 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Start date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Target release</label>
                    <input type="date" value={targetReleaseDate} onChange={(e) => setTargetReleaseDate(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Sprint cadence</label>
                    <select value={sprintCadence} onChange={(e) => setSprintCadence(e.target.value)} className={selectClass}>
                      {CADENCES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Estimated team size</label>
                    <input type="number" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} min="1" max="50" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Project Admin</label>
                  <select value={assignedAdmin} onChange={(e) => setAssignedAdmin(e.target.value)} className={selectClass}>
                    <option value="Sarah Jenkins">Sarah Jenkins (PM / Admin)</option>
                    <option value="David Chen">David Chen (Architect / Admin)</option>
                    <option value="Marcus Vance">Marcus Vance (Dev Lead)</option>
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400">More team members can be added post-creation.</p>
                </div>
              </>
            )}

            {/* Phase 4: Integrations */}
            {phase === 3 && (
              <>
                <div>
                  <label className={labelClass}>Git repository</label>
                  <input type="text" value={gitRepo} onChange={(e) => setGitRepo(e.target.value)} placeholder="org/repo-name (from tenant connectors)" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Jira / Azure DevOps board</label>
                  <input type="text" value={jiraBoard} onChange={(e) => setJiraBoard(e.target.value)} placeholder="Board key, e.g., MBNK" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Figma workspace</label>
                    <input type="text" value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)} placeholder="Figma project URL" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>CI/CD pipeline</label>
                    <input type="text" value={ciPipeline} onChange={(e) => setCiPipeline(e.target.value)} placeholder="GitHub Actions / Jenkins" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Start from template</label>
                  <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)} className={selectClass}>
                    <option value="None (blank project)">None (blank project)</option>
                    <option value="FinTech Compliance Blueprint">FinTech Compliance Blueprint</option>
                    <option value="FINRA-Ready SpecAI">FINRA-Ready SpecAI</option>
                    <option value="Serverless Cloud Migration">Serverless Cloud Migration</option>
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400">Templates clone connectors, team shape, and module config.</p>
                </div>
              </>
            )}

            {/* Phase 5: Review */}
            {phase === 4 && (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 divide-y divide-slate-100 text-xs">
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-500">Project</span>
                    <span className="font-semibold text-slate-900">{projectName || '—'}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-500">Type / Domain</span>
                    <span className="text-slate-700">{projectType} · {domain}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-500">Priority</span>
                    <span className={`font-semibold ${priority === 'Critical' ? 'text-rose-600' : priority === 'High' ? 'text-amber-600' : 'text-slate-700'}`}>{priority}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-500">Modules</span>
                    <span className="text-slate-700">{enabledModules.length} enabled</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-500">AI Budget</span>
                    <span className="font-mono font-semibold text-slate-800">${Number(aiBudget).toLocaleString()}/mo</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-500">Model tier</span>
                    <span className="text-slate-700">{modelTier}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-500">Compliance</span>
                    <span className="text-slate-700">{compliance}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-500">Timeline</span>
                    <span className="text-slate-700">{startDate} → {targetReleaseDate}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-500">Cadence</span>
                    <span className="text-slate-700">{sprintCadence} sprints · ~{teamSize} people</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-500">Admin</span>
                    <span className="text-slate-700">{assignedAdmin}</span>
                  </div>
                  {gitRepo && (
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-slate-500">Git</span>
                      <span className="font-mono text-slate-700">{gitRepo}</span>
                    </div>
                  )}
                  {jiraBoard && (
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-slate-500">Jira</span>
                      <span className="text-slate-700">{jiraBoard}</span>
                    </div>
                  )}
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-slate-500">Template</span>
                    <span className="text-slate-700">{selectedTemplate}</span>
                  </div>
                </div>
                {description && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs">
                    <span className="text-slate-500 block mb-0.5">Business objective</span>
                    <span className="text-slate-800">{description}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={phase === 0 ? onClose : () => setPhase(phase - 1)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {phase === 0 ? 'Cancel' : 'Back'}
            </button>

            {phase < PHASES.length - 1 ? (
              <button
                type="button"
                onClick={() => canNext() && setPhase(phase + 1)}
                disabled={!canNext()}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => onSubmit(e as unknown as React.FormEvent)}
                disabled={!projectName.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Rocket className="w-3.5 h-3.5" /> Create Project
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProjectsView: React.FC = () => {
  const {
    projects,
    createProject,
    closeProject,
    setCurrentScope,
    setActiveNav,
    tenants,
    currentScope,
    currentRole,
    navIntent,
    moduleActivity,
  } = useApp();

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
  const [selectedTenantId, setSelectedTenantId] = useState(currentScope.tenantId || 't-incedo');

  const canFilterByTenant = currentRole === 'Tenant Admin';
  const [scopeFilter, setScopeFilter] = useScopeFilter();

  const scopedProjects = projects.filter((p) => {
    // Header scope is the ceiling; the filter bar narrows within it.
    if (currentScope.type === 'tenant' && p.tenantId !== currentScope.tenantId) return false;
    if (canFilterByTenant && scopeFilter.tenantId !== 'all' && p.tenantId !== scopeFilter.tenantId)
      return false;
    if (scopeFilter.projectId !== 'all' && p.id !== scopeFilter.projectId) return false;
    return true;
  });

  // A dashboard tile or module card can arrive here with a pre-filter attached.
  const moduleIntent = navIntent?.projectModule;
  const moduleProjectIds = moduleIntent
    ? moduleActivity.filter((a) => a.module === moduleIntent).map((a) => a.projectId)
    : null;

  const filteredProjects = (
    moduleProjectIds ? scopedProjects.filter((p) => moduleProjectIds.includes(p.id)) : scopedProjects
  )
    .slice()
    .sort((a, b) => {
      if (navIntent?.projectSort === 'completion-asc') return a.completion - b.completion;
      if (navIntent?.projectSort === 'spend-desc') return b.spend30d - a.spend30d;
      return 0;
    });

  const filterLabel = canFilterByTenant
    ? scopeFilter.tenantId === 'all'
      ? 'All Departments'
      : tenants.find((t) => t.id === scopeFilter.tenantId)?.name ?? 'Tenant'
    : currentScope.tenantName || 'All Departments';

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
      tenantName: t?.name || 'Incedo Labs',
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
            Projects active in scope: {filterLabel}
            <span className="text-slate-400">
              {' '}
              · {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
            </span>
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create project</span>
        </button>
      </div>

      <LandingNote />

      <ScopeFilterBar
        value={scopeFilter}
        onChange={setScopeFilter}
        resultCount={filteredProjects.length}
        resultNoun="projects"
      />

      {/* Projects Table */}
      <div className="platform-card overflow-hidden">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            {moduleIntent
              ? 'No projects in this scope use that module.'
              : canFilterByTenant && scopeFilter.tenantId !== 'all'
              ? `No projects in ${filterLabel} yet.`
              : 'No projects in this tenant yet.'}
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

      {/* 4.2 Create Project Modal — Wizard with vertical phase strip */}
      {createModalOpen && (
        <CreateProjectModal
          projectName={projectName}
          setProjectName={setProjectName}
          description={description}
          setDescription={setDescription}
          startDate={startDate}
          setStartDate={setStartDate}
          targetReleaseDate={targetReleaseDate}
          setTargetReleaseDate={setTargetReleaseDate}
          assignedAdmin={assignedAdmin}
          setAssignedAdmin={setAssignedAdmin}
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
          selectedTenantId={selectedTenantId}
          setSelectedTenantId={setSelectedTenantId}
          tenants={tenants}
          canFilterByTenant={canFilterByTenant}
          onSubmit={handleCreateSubmit}
          onClose={() => setCreateModalOpen(false)}
        />
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
