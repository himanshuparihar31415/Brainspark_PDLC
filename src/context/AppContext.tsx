import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Role,
  ScopeContext,
  Department,
  Project,
  TeamMember,
  Connector,
  ConnectorActivation,
  CatalogueAgent,
  AgentEvaluation,
  PromptInstruction,
  PromptTemplate,
  SessionConfig,
  SensitiveDataLog,
  AuditLogEntry,
  NotificationItem,
  Task,
  UserAccount,
  NavView,
  NavIntent,
  ModuleActivity,
  AgentUsage,
  PipelinePhase,
} from '../types';
import {
  canAccessNav,
  canManageAgents,
  isModuleWorkspace,
  canManageConnector,
  connectorDeniedReason,
  landingNavForRole,
  scopeForRole,
} from '../data/rbac';
import {
  INITIAL_USERS,
  INITIAL_DEPARTMENTS,
  INITIAL_PROJECTS,
  INITIAL_TEAM_MEMBERS,
  INITIAL_CONNECTORS,
  INITIAL_EVALUATIONS,
  INITIAL_SESSIONS,
  INITIAL_SENSITIVE_LOGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_TASKS,
  INITIAL_MODULE_ACTIVITY,
  INITIAL_AGENT_USAGE,
} from '../data/mockData';
import { INITIAL_CATALOGUE_AGENTS } from '../data/agentCatalogue';
import {
  INITIAL_PROMPT_INSTRUCTIONS,
  INITIAL_PROMPT_TEMPLATES,
} from '../data/promptInstructions';
import { INITIAL_PIPELINE } from '../data/pipelineData';
import {
  projectCompletionFromPhases,
  specAiPhaseFromStories,
} from '../data/completion';
import { SpecAiSlice, useSpecAiSlice } from './useSpecAi';

export type { NavView };

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

export type AuthMethod = 'password' | 'sso';

/** POST /agents request body — the server assigns id, created_at and is_active. */
export type AgentRegistration = Omit<CatalogueAgent, 'id' | 'created_at' | 'is_active'>;

/** PATCH /agents/{id} — slug is immutable once registered. */
export type AgentUpdate = Partial<Omit<CatalogueAgent, 'id' | 'slug' | 'created_at'>>;

/**
 * POST /prompt-instructions. The server derives version_number by incrementing
 * the highest version on the key, and moves the active flag onto the new row.
 */
export interface InstructionPublication {
  module: string;
  workflow: string;
  template_name: string;
  instructions_text: string;
  user_id: string;
  project_id?: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AppContextType extends SpecAiSlice {
  isAuthenticated: boolean;
  currentUser: UserAccount | null;
  users: UserAccount[];
  login: (email: string, password: string, method?: AuthMethod) => AuthResult;
  logout: () => void;
  requestAccess: (email: string) => AuthResult;
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  currentScope: ScopeContext;
  setCurrentScope: (scope: ScopeContext) => void;
  activeNav: NavView;
  setActiveNav: (nav: NavView) => void;
  /** Navigate and hand the destination screen a pre-filter. */
  navigateTo: (nav: NavView, intent?: NavIntent) => void;
  navIntent: NavIntent | null;
  clearNavIntent: () => void;
  /** Platform nav collapses to icons inside a full-screen module workspace. */
  navCollapsed: boolean;
  setNavCollapsed: (collapsed: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;

  // Data collections
  departments: Department[];
  projects: Project[];
  teamMembers: TeamMember[];
  connectors: Connector[];
  agents: CatalogueAgent[];
  evaluations: Record<string, AgentEvaluation>;
  instructions: PromptInstruction[];
  promptTemplates: PromptTemplate[];
  sessions: SessionConfig;
  sensitiveLogs: SensitiveDataLog[];
  auditLogs: AuditLogEntry[];
  notifications: NotificationItem[];
  tasks: Task[];
  moduleActivity: ModuleActivity[];
  agentUsage: AgentUsage[];
  pipeline: PipelinePhase[];

  // Mutations
  createDepartment: (name: string, adminEmail: string, inheritDefaults: boolean) => void;
  deactivateDepartment: (id: string) => void;
  suspendDepartment: (id: string) => void;
  createProject: (data: Partial<Project>) => void;
  closeProject: (id: string) => void;
  assignTeamMember: (data: Partial<TeamMember>) => void;
  setConnectorTenantAvailability: (id: string, available: boolean) => void;
  setConnectorDepartmentEnabled: (id: string, departmentId: string, enabled: boolean) => void;
  activateConnectorProject: (
    id: string,
    projectId: string,
    endpoint?: string,
    repo?: string
  ) => void;
  testConnectorConnection: (id: string, projectId: string) => void;
  registerAgent: (payload: AgentRegistration) => boolean;
  updateAgent: (id: string, patch: AgentUpdate) => void;
  /** Soft delete — the agent stays in the catalogue, flagged inactive. */
  deactivateAgent: (id: string) => void;
  publishInstruction: (payload: InstructionPublication) => void;
  rollbackInstruction: (id: string) => void;
  /** Refuses on an active version, mirroring the API's 409. */
  deleteInstruction: (id: string) => boolean;
  updateSessionConfig: (newConfig: Partial<SessionConfig>) => void;
  revokeApiKey: (keyId: string) => void;
  completeTask: (taskId: string) => void;
  approveTaskArtifact: (taskId: string) => void;
  exportEvidencePackage: () => void;
  addAuditLog: (action: string, target: string, input: string, output: string) => void;
  markNotificationRead: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [users] = useState<UserAccount[]>(INITIAL_USERS);
  const [currentRole, setCurrentRoleState] = useState<Role>('Tenant Admin');
  const [currentScope, setCurrentScope] = useState<ScopeContext>({
    type: 'tenant',
    departmentName: 'All Departments',
  });
  const [activeNav, setActiveNavState] = useState<NavView>('Dashboard');
  const [navIntent, setNavIntent] = useState<NavIntent | null>(null);
  const [navCollapsed, setNavCollapsed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // State collections
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);
  const [connectors, setConnectors] = useState<Connector[]>(INITIAL_CONNECTORS);
  const [agents, setAgents] = useState<CatalogueAgent[]>(INITIAL_CATALOGUE_AGENTS);
  const [evaluations, setEvaluations] = useState<Record<string, AgentEvaluation>>(INITIAL_EVALUATIONS);
  const [instructions, setInstructions] = useState<PromptInstruction[]>(INITIAL_PROMPT_INSTRUCTIONS);
  const [promptTemplates] = useState<PromptTemplate[]>(INITIAL_PROMPT_TEMPLATES);
  const [sessions, setSessions] = useState<SessionConfig>(INITIAL_SESSIONS);
  const [sensitiveLogs, setSensitiveLogs] = useState<SensitiveDataLog[]>(INITIAL_SENSITIVE_LOGS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [moduleActivity] = useState<ModuleActivity[]>(INITIAL_MODULE_ACTIVITY);
  const [agentUsage] = useState<AgentUsage[]>(INITIAL_AGENT_USAGE);
  const [pipeline, setPipeline] = useState<PipelinePhase[]>(INITIAL_PIPELINE);
  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  /**
   * Guarded navigation. Hiding a sidebar entry is not enough — cross-links from
   * other views could otherwise land a role on a view it cannot see. Internal
   * callers (sign-in, role switch) use setActiveNavState directly because
   * currentRole is still stale in the same render.
   */
  const setActiveNav = (nav: NavView) => {
    if (!canAccessNav(currentRole, nav)) {
      addToast(`Your ${currentRole} role does not have access to ${nav}.`, 'error');
      return;
    }
    setNavIntent(null);
    setNavCollapsed(isModuleWorkspace(nav));
    setActiveNavState(nav);
  };

  const navigateTo = (nav: NavView, intent?: NavIntent) => {
    if (!canAccessNav(currentRole, nav)) {
      addToast(`Your ${currentRole} role does not have access to ${nav}.`, 'error');
      return;
    }
    setNavIntent(intent ?? null);
    setNavCollapsed(isModuleWorkspace(nav));
    setActiveNavState(nav);
  };

  const clearNavIntent = () => setNavIntent(null);

  const addAuditLog = (action: string, target: string, input: string, output: string) => {
    const entry: AuditLogEntry = {
      id: 'audit-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser
        ? `${currentUser.name} (${currentRole})`
        : currentRole === 'Tenant Admin'
        ? 'Tenant Admin'
        : 'Current User (' + currentRole + ')',
      actorType: 'user',
      action,
      targetArtifact: target,
      context: `Scope: ${currentScope.type.toUpperCase()} - ${currentScope.departmentName || 'All'}`,
      input,
      output,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  // Spec AI owns a large, self-contained slice; it lives in its own hook.
  const spec = useSpecAiSlice({
    addToast,
    addAuditLog,
    currentRole,
    currentUserName: currentUser?.name ?? 'Unknown user',
    connectors,
  });

  /**
   * Spec AI stories are the source of truth for the Spec AI pipeline card and,
   * once present, for that project's overall completion. Other module phases
   * keep their seeded done/total until those workspaces exist.
   */
  useEffect(() => {
    setPipeline((prev) => {
      let changed = false;
      const next = prev.map((phase) => {
        if (phase.module !== 'specai') return phase;
        const stories =
          spec.specAi.find((s) => s.projectId === phase.projectId)?.stories ?? [];
        const derived = specAiPhaseFromStories(stories);
        if (!derived) return phase;
        if (
          phase.done === derived.done &&
          phase.total === derived.total &&
          phase.status === derived.status
        ) {
          return phase;
        }
        changed = true;
        return {
          ...phase,
          done: derived.done,
          total: derived.total,
          status: derived.status,
          daysSinceChange: 0,
        };
      });
      return changed ? next : prev;
    });
  }, [spec.specAi]);

  useEffect(() => {
    setProjects((prev) => {
      let changed = false;
      const next = prev.map((project) => {
        const hasStories = spec.specAi.some(
          (s) => s.projectId === project.id && s.stories.length > 0
        );
        if (!hasStories) return project;
        const phases = pipeline.filter((p) => p.projectId === project.id);
        if (phases.length === 0) return project;
        const completion = projectCompletionFromPhases(phases);
        if (completion === project.completion) return project;
        changed = true;
        return { ...project, completion };
      });
      return changed ? next : prev;
    });
  }, [pipeline, spec.specAi]);

  /**
   * Credential check against the mock directory. The matched account decides the
   * active role, the scope the session is bound to, and therefore which views
   * the sidebar renders.
   */
  const login = (email: string, password: string, method: AuthMethod = 'password'): AuthResult => {
    const normalized = email.trim().toLowerCase();

    if (!normalized) {
      return { ok: false, error: 'Enter your corporate email address.' };
    }

    const account = users.find((u) => u.email.toLowerCase() === normalized);
    if (!account) {
      return { ok: false, error: 'No Brainspark account found for that email.' };
    }

    if (method === 'sso') {
      if (!account.ssoEnabled) {
        return { ok: false, error: 'SSO is not enabled for this department. Sign in with your password.' };
      }
    } else if (password !== account.password) {
      return { ok: false, error: 'Incorrect password. Please try again.' };
    }

    const role = account.primaryRole;
    setCurrentUser(account);
    setCurrentRoleState(role);
    setCurrentScope(scopeForRole(role, account));
    setActiveNavState(landingNavForRole(role));

    addToast(`Welcome back, ${account.name.split(' ')[0]} — signed in as ${role}.`);
    addAuditLog(
      'Sign In',
      `User: ${account.email}`,
      `Method: ${method === 'sso' ? 'Incedo SSO' : 'Password'} · Role: ${role}`,
      `Session established at ${account.scope.type.toUpperCase()} scope`
    );

    return { ok: true };
  };

  const logout = () => {
    addAuditLog(
      'Sign Out',
      `User: ${currentUser?.email || 'unknown'}`,
      'User initiated sign out',
      'Session terminated'
    );
    setCurrentUser(null);
    setCurrentRoleState('Tenant Admin');
    setCurrentScope({ type: 'tenant', departmentName: 'All Departments' });
    setActiveNavState('Dashboard');
  };

  /**
   * Corporate-email sign-up. Provisioning is governed, so this raises an access
   * request rather than minting a session.
   *
   * Every department now shares the tenant's mail domain, so the domain can no
   * longer identify which one the requester belongs to — it only tells us they
   * are inside the tenant. The request therefore goes to the Tenant Admin, who
   * assigns the department on approval.
   */
  const requestAccess = (email: string): AuthResult => {
    const normalized = email.trim().toLowerCase();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
      return { ok: false, error: 'Enter a valid corporate email address.' };
    }

    if (users.some((u) => u.email.toLowerCase() === normalized)) {
      return { ok: false, error: 'An account already exists for that email. Try signing in.' };
    }

    const domain = normalized.split('@')[1];
    const insideTenant = departments.some((d) => d.adminEmail.split('@')[1] === domain);

    addToast(
      insideTenant
        ? 'Access request sent to the Tenant Admin for approval.'
        : 'Access request raised — that domain is outside the tenant, so it needs manual review.',
      'info'
    );
    addAuditLog(
      'Request Workspace Access',
      `Prospective user: ${normalized}`,
      insideTenant ? `Recognised tenant domain: ${domain}` : `Unrecognised domain: ${domain}`,
      'Pending Tenant Admin approval — department assigned on approval'
    );

    return { ok: true };
  };

  // Switch role persona with entitlement + subtractive nav enforcement
  const setCurrentRole = (newRole: Role) => {
    if (currentUser && !currentUser.roles.includes(newRole)) {
      addToast(`${currentUser.name} is not entitled to the ${newRole} role.`, 'error');
      return;
    }

    setCurrentRoleState(newRole);
    setCurrentScope(scopeForRole(newRole, currentUser));
    addToast(`Switched role persona to ${newRole}`, 'info');

    if (!canAccessNav(newRole, activeNav)) {
      setActiveNavState(landingNavForRole(newRole));
    }
  };

  // Operations
  const createDepartment = (name: string, adminEmail: string, inheritDefaults: boolean) => {
    const newDepartment: Department = {
      id: 't-' + Date.now().toString(36),
      name,
      projectsCount: 0,
      headcount: 1,
      spend30d: 0,
      spendPrev30d: 0,
      tokens30d: 0,
      budget30d: 10000,
      status: 'Active',
      adminEmail,
      createdAt: new Date().toISOString().split('T')[0],
      inheritDefaults,
    };
    setDepartments((prev) => [newDepartment, ...prev]);
    addToast(`Department "${name}" created. Invite sent to ${adminEmail}.`);
    addAuditLog('Create Department', `Department: ${name}`, `Admin Email: ${adminEmail}`, 'Department Created Successfully');
  };

  const deactivateDepartment = (id: string) => {
    const target = departments.find((t) => t.id === id);
    setDepartments((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'Deactivated' as const } : t))
    );
    addToast(`Department "${target?.name || id}" deactivated.`);
    addAuditLog('Deactivate Department', `Department ID: ${id}`, 'Deactivation confirm', 'Status set to Deactivated');
  };

  const suspendDepartment = (id: string) => {
    const target = departments.find((t) => t.id === id);
    setDepartments((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'Suspended' as const } : t))
    );
    addToast(`Department "${target?.name || id}" suspended.`);
    addAuditLog('Suspend Department', `Department ID: ${id}`, 'Suspension confirm', 'Status set to Suspended');
  };

  const createProject = (data: Partial<Project>) => {
    const newProj: Project = {
      id: 'p-' + Date.now().toString(36),
      name: data.name || 'New Project',
      departmentId: data.departmentId || 'd-engineering',
      departmentName: data.departmentName || 'Engineering',
      admins: data.admins && data.admins.length > 0 ? data.admins : ['Current User'],
      phase: 'SpecAI Requirements',
      completion: 5,
      spend30d: 0,
      spendPrev30d: 0,
      tokens30d: 0,
      lifecycle: 'Active',
      description: data.description || 'Project created in BrainSpark platform.',
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      targetReleaseDate: data.targetReleaseDate || '2026-12-31',
      template: data.template || 'Blank Project',
    };
    setProjects((prev) => [newProj, ...prev]);
    addToast(`Project "${newProj.name}" created.`);
    addAuditLog('Create Project', `Project: ${newProj.name}`, `Template: ${newProj.template}`, 'Project initialized');
  };

  const closeProject = (id: string) => {
    const target = projects.find((p) => p.id === id);
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, lifecycle: 'Closed' as const } : p))
    );
    addToast(`Project "${target?.name || id}" closed. Retention policy applied.`);
    addAuditLog('Close Project', `Project ID: ${id}`, 'Close project confirmation', 'Project set to Closed & certified retention triggered');
  };

  const assignTeamMember = (data: Partial<TeamMember>) => {
    const newMember: TeamMember = {
      id: 'm-' + Date.now().toString(36),
      name: data.name || 'New Member',
      email: data.email || 'member@incedolabs.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      roles: data.roles || ['Developer'],
      departmentId: data.departmentId || 'd-engineering',
      projectId: data.projectId || 'p-mobile-v2',
      moduleAccess: ['CodeIQ', 'My Tasks'],
      status: 'Assigned',
      allocationPercent: data.allocationPercent || 100,
      drawnOnByProjects: ['Mobile Banking V2'],
    };
    setTeamMembers((prev) => [newMember, ...prev]);
    addToast(`Assigned ${newMember.name} to project roster.`);
    addAuditLog('Assign Team Member', `Member: ${newMember.name}`, `Roles: ${newMember.roles.join(', ')}`, 'Role slots updated');
  };

  /**
   * Top of the connector ladder: whether a connector exists for departments at all.
   * Withdrawing availability cascades down — the department baseline and every
   * project activation beneath it are cleared, so no project keeps a live
   * binding to something the platform has retired.
   */
  const setConnectorTenantAvailability = (id: string, available: boolean) => {
    if (!canManageConnector(currentRole, 'tenant-availability')) {
      addToast(connectorDeniedReason('tenant-availability'), 'error');
      return;
    }

    const target = connectors.find((c) => c.id === id);
    /* Counted before the state changes, so the audit records what was actually
       destroyed rather than the empty maps left behind. */
    const clearedDepartments = target?.enabledDepartments.length ?? 0;
    const clearedProjects = Object.values<ConnectorActivation>(target?.activations ?? {}).filter(
      (a) => a.status !== 'not-set-up'
    ).length;

    setConnectors((prev) =>
      prev.map((c) =>
        c.id === id
          ? available
            ? { ...c, tenantAvailable: true }
            : /* Withdrawal cascades the whole way down: no project keeps a live
                 binding to something the platform has retired. */
              { ...c, tenantAvailable: false, enabledDepartments: [], activations: {} }
          : c
      )
    );

    addToast(
      available
        ? `${target?.name || 'Connector'} is now available to departments.`
        : `${target?.name || 'Connector'} withdrawn. ${clearedDepartments} ${
            clearedDepartments === 1 ? 'department' : 'departments'
          } and ${clearedProjects} ${
            clearedProjects === 1 ? 'project' : 'projects'
          } disconnected.`,
      available ? 'success' : 'info'
    );
    addAuditLog(
      'Set Connector Platform Availability',
      `Connector: ${target?.name || id}`,
      `Available: ${available}`,
      available
        ? 'Available to departments'
        : `Withdrawn; ${clearedDepartments} enablements and ${clearedProjects} activations cleared`
    );
  };

  /**
   * Department baseline, for one named department.
   *
   * Disabling drops the activations of that department's projects only — the
   * other departments' bindings are none of its business, which is the whole
   * reason enablement is keyed rather than a flag.
   */
  const setConnectorDepartmentEnabled = (
    id: string,
    departmentId: string,
    enabled: boolean
  ) => {
    if (!canManageConnector(currentRole, 'department-baseline')) {
      addToast(connectorDeniedReason('department-baseline'), 'error');
      return;
    }

    const target = connectors.find((c) => c.id === id);
    if (!target) return;
    if (!target.tenantAvailable) {
      addToast(`${target.name} is not available on this platform.`, 'error');
      return;
    }

    const department = departments.find((d) => d.id === departmentId);
    const theirProjects = projects.filter((p) => p.departmentId === departmentId).map((p) => p.id);
    const dropped = theirProjects.filter(
      (pid) => target.activations[pid] && target.activations[pid].status !== 'not-set-up'
    ).length;

    setConnectors((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (enabled) {
          return {
            ...c,
            enabledDepartments: [...new Set([...c.enabledDepartments, departmentId])],
          };
        }
        const activations = { ...c.activations };
        theirProjects.forEach((pid) => delete activations[pid]);
        return {
          ...c,
          enabledDepartments: c.enabledDepartments.filter((d) => d !== departmentId),
          activations,
        };
      })
    );

    addToast(
      enabled
        ? `${target.name} enabled for ${department?.name ?? 'the department'}.`
        : `${target.name} disabled for ${department?.name ?? 'the department'}. ${dropped} ${
            dropped === 1 ? 'project' : 'projects'
          } disconnected.`,
      enabled ? 'success' : 'info'
    );
    addAuditLog(
      'Set Connector Department Baseline',
      `${target.name} · ${department?.name ?? departmentId}`,
      `Enabled: ${enabled}`,
      enabled ? 'Projects may now activate it' : `${dropped} project activations cleared`
    );
  };

  /** Binds one project, with credentials scoped to that project alone. */
  const activateConnectorProject = (
    id: string,
    projectId: string,
    endpoint?: string,
    repo?: string
  ) => {
    if (!canManageConnector(currentRole, 'project-activation')) {
      addToast(connectorDeniedReason('project-activation'), 'error');
      return;
    }

    const target = connectors.find((c) => c.id === id);
    const project = projects.find((p) => p.id === projectId);
    if (!target || !project) return;

    if (!target.tenantAvailable) {
      addToast(`${target.name} is not available on this platform.`, 'error');
      return;
    }
    if (!target.enabledDepartments.includes(project.departmentId)) {
      addToast(`${target.name} is not enabled for ${project.departmentName}.`, 'error');
      return;
    }

    const existing = target.activations[projectId];

    setConnectors((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              activations: {
                ...c.activations,
                [projectId]: {
                  projectId,
                  status: 'connected',
                  syncType: existing?.syncType ?? '↕ Bidirectional',
                  lastSyncTime: 'Just now',
                  lastError: undefined,
                  endpointUrl: endpoint || existing?.endpointUrl,
                  workspaceRepo: repo || existing?.workspaceRepo,
                },
              },
            }
          : c
      )
    );

    addToast(`${target.name} connected for ${project.name}.`);
    addAuditLog(
      'Activate Connector',
      `${target.name} · ${project.name}`,
      `Endpoint: ${endpoint ?? '—'}`,
      'Connected with project-scoped credentials'
    );
  };

  /**
   * Re-run the handshake. Simulated, and it says so by keeping whatever error
   * the binding already carried when it fails — inventing a fresh one would make
   * a retry look like new information.
   */
  const testConnectorConnection = (id: string, projectId: string) => {
    const target = connectors.find((c) => c.id === id);
    const activation = target?.activations[projectId];
    if (!target || !activation) return;

    /* A binding that was failing stays failing; one that was fine reports fine.
       Nothing here is a real network call and pretending otherwise would be a
       lie the user cannot check. */
    const ok = activation.status === 'connected';

    addToast(
      ok
        ? `${target.name} responded. Last sync just now.`
        : `${target.name} still failing — ${activation.lastError ?? 'no error recorded'}.`,
      ok ? 'success' : 'error'
    );

    if (ok) {
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                activations: {
                  ...c.activations,
                  [projectId]: { ...activation, lastSyncTime: 'Just now' },
                },
              }
            : c
        )
      );
    }

    addAuditLog(
      'Test Connector Connection',
      `${target.name} · ${projectId}`,
      'Manual test',
      ok ? 'Responded' : `Failed: ${activation.lastError ?? 'unknown'}`
    );
  };

  /**
   * Register a catalogue agent. Returns false when the slug is already taken —
   * the API answers a duplicate with 409, and the form keeps the user's input so
   * they can correct the slug rather than retype the whole payload.
   */
  const registerAgent = (payload: AgentRegistration): boolean => {
    if (!canManageAgents(currentRole)) {
      addToast(`Registering an agent is a department-level action — not available to ${currentRole}.`, 'error');
      return false;
    }

    if (agents.some((a) => a.slug === payload.slug)) {
      addToast(`Slug "${payload.slug}" is already registered.`, 'error');
      return false;
    }

    const created: CatalogueAgent = {
      ...payload,
      id: 'agent-' + Date.now().toString(36),
      is_active: true,
      created_at: new Date().toISOString(),
    };
    setAgents((prev) => [created, ...prev]);
    addToast(`Agent "${created.slug}" registered.`);
    addAuditLog(
      'Register Agent',
      `Agent: ${created.slug}`,
      `Module: ${created.module_name} · Type: ${created.agent_type} · Model: ${created.model ?? 'platform default'}`,
      'Agent added to catalogue as Active'
    );
    return true;
  };

  const updateAgent = (id: string, patch: AgentUpdate) => {
    if (!canManageAgents(currentRole)) {
      addToast(`Editing an agent is a department-level action — not available to ${currentRole}.`, 'error');
      return;
    }

    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    const target = agents.find((a) => a.id === id);
    addToast(`Agent "${target?.slug || id}" updated.`);
    addAuditLog(
      'Update Agent',
      `Agent: ${target?.slug || id}`,
      Object.keys(patch).join(', ') || 'no fields',
      'Catalogue record updated'
    );
  };

  /** Soft delete. The row stays visible so historical runs still resolve it. */
  const deactivateAgent = (id: string) => {
    if (!canManageAgents(currentRole)) {
      addToast(`Deactivation is a department-level action — not available to ${currentRole}.`, 'error');
      return;
    }

    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: false } : a)));
    const target = agents.find((a) => a.id === id);
    addToast(`Agent "${target?.slug || id}" deactivated.`);
    addAuditLog(
      'Deactivate Agent',
      `Agent: ${target?.slug || id}`,
      'Deactivation confirmed',
      'is_active set to false; agent can no longer be invoked'
    );
  };

  /**
   * Publish a new instruction version. Append-only: the previous active row on
   * the same key is demoted rather than edited, so the version history stays
   * intact and a rollback has something to return to.
   */
  const publishInstruction = (payload: InstructionPublication) => {
    const sameKey = instructions.filter(
      (i) =>
        i.module === payload.module &&
        i.workflow === payload.workflow &&
        i.template_name === payload.template_name &&
        (i.project_id ?? null) === (payload.project_id ?? null)
    );
    const nextVersion = sameKey.reduce((max, i) => Math.max(max, i.version_number), 0) + 1;

    const created: PromptInstruction = {
      id: 'pi-' + Date.now().toString(36),
      module: payload.module,
      workflow: payload.workflow,
      template_name: payload.template_name,
      user_id: payload.user_id,
      version_number: nextVersion,
      instructions_text: payload.instructions_text,
      is_active: true,
      created_at: new Date().toISOString(),
      ...(payload.project_id ? { project_id: payload.project_id } : {}),
    };

    setInstructions((prev) => [
      created,
      ...prev.map((i) =>
        i.module === created.module &&
        i.workflow === created.workflow &&
        i.template_name === created.template_name &&
        (i.project_id ?? null) === (created.project_id ?? null)
          ? { ...i, is_active: false }
          : i
      ),
    ]);

    addToast(`Published v${nextVersion} of ${created.template_name}.`);
    addAuditLog(
      'Publish Prompt Instruction',
      `${created.module}/${created.workflow}/${created.template_name}`,
      `Scope: ${created.project_id ?? 'global'} · Author: ${created.user_id}`,
      `v${nextVersion} published and set active`
    );
  };

  /** Reactivate an earlier version on the same key; no new version is minted. */
  const rollbackInstruction = (id: string) => {
    const target = instructions.find((i) => i.id === id);
    if (!target) return;

    setInstructions((prev) =>
      prev.map((i) => {
        if (
          i.module !== target.module ||
          i.workflow !== target.workflow ||
          i.template_name !== target.template_name ||
          (i.project_id ?? null) !== (target.project_id ?? null)
        ) {
          return i;
        }
        return { ...i, is_active: i.id === id };
      })
    );

    addToast(`Rolled back to v${target.version_number} of ${target.template_name}.`);
    addAuditLog(
      'Rollback Prompt Instruction',
      `${target.module}/${target.workflow}/${target.template_name}`,
      `Target: v${target.version_number} · Scope: ${target.project_id ?? 'global'}`,
      `v${target.version_number} reactivated`
    );
  };

  /**
   * Delete a non-active version. The API answers 409 on the active row because
   * deleting it would leave the key with nothing to resolve; the UI disables the
   * control, and this is the backstop behind it.
   */
  const deleteInstruction = (id: string): boolean => {
    const target = instructions.find((i) => i.id === id);
    if (!target) return false;

    if (target.is_active) {
      addToast('The active version cannot be deleted. Roll back to another version first.', 'error');
      return false;
    }

    setInstructions((prev) => prev.filter((i) => i.id !== id));
    addToast(`Deleted v${target.version_number} of ${target.template_name}.`, 'info');
    addAuditLog(
      'Delete Prompt Instruction',
      `${target.module}/${target.workflow}/${target.template_name}`,
      `Target: v${target.version_number} · Scope: ${target.project_id ?? 'global'}`,
      'Version removed'
    );
    return true;
  };

  const updateSessionConfig = (newConfig: Partial<SessionConfig>) => {
    setSessions((prev) => ({ ...prev, ...newConfig }));
    addToast(`Session security settings saved.`);
    addAuditLog('Update Session Config', 'Security Settings', JSON.stringify(newConfig), 'Session policy updated');
  };

  const revokeApiKey = (keyId: string) => {
    setSessions((prev) => ({
      ...prev,
      apiKeys: prev.apiKeys.filter((k) => k.id !== keyId),
    }));
    addToast(`API key revoked immediately.`);
    addAuditLog('Revoke API Key', `Key ID: ${keyId}`, 'Immediate revocation request', 'Key removed from session policy');
  };

  const completeTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'Completed' as const } : t))
    );
    addToast(`Task marked as Completed.`);
    addAuditLog('Complete Task', `Task ID: ${taskId}`, 'User marked task complete', 'Status set to Completed');
  };

  const approveTaskArtifact = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: 'Completed' as const } : t))
    );
    addToast(`Artifact human-in-the-loop sign-off approved!`);
    addAuditLog('Approve Task Artifact', `Task ID: ${taskId}`, 'Human approval sign-off', 'Artifact approved & phase unblocked');
  };

  const exportEvidencePackage = () => {
    addToast(`Package ready — download link generated.`);
    addAuditLog('Generate Compliance Evidence', 'SOC2 / ISO 27001 Evidence Package', 'Full audit dump export', 'Download link dispatched to user email');
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated: currentUser !== null,
        currentUser,
        users,
        login,
        logout,
        requestAccess,
        currentRole,
        setCurrentRole,
        currentScope,
        setCurrentScope,
        activeNav,
        setActiveNav,
        navigateTo,
        navIntent,
        clearNavIntent,
        navCollapsed,
        setNavCollapsed,
        searchQuery,
        setSearchQuery,
        toasts,
        addToast,
        removeToast,
        departments,
        projects,
        teamMembers,
        connectors,
        agents,
        evaluations,
        instructions,
        promptTemplates,
        sessions,
        sensitiveLogs,
        auditLogs,
        notifications,
        tasks,
        moduleActivity,
        agentUsage,
        pipeline,
        ...spec,
        createDepartment,
        deactivateDepartment,
        suspendDepartment,
        createProject,
        closeProject,
        assignTeamMember,
        setConnectorTenantAvailability,
        setConnectorDepartmentEnabled,
        testConnectorConnection,
        activateConnectorProject,
        registerAgent,
        updateAgent,
        deactivateAgent,
        publishInstruction,
        rollbackInstruction,
        deleteInstruction,
        updateSessionConfig,
        revokeApiKey,
        completeTask,
        approveTaskArtifact,
        exportEvidencePackage,
        addAuditLog,
        markNotificationRead,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

/*
 * The return type is annotated rather than inferred. Left to inference it
 * silently resolved to `any`, which switched off type checking in every
 * component that consumes context — a whole-app blind spot that the compiler
 * reported as success.
 */
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
