import React, { createContext, useContext, useState } from 'react';
import {
  Role,
  ScopeContext,
  Tenant,
  Project,
  TeamMember,
  Connector,
  AgentService,
  AgentEvaluation,
  PromptVersion,
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
import { canAccessNav, canDeprecateAgent, landingNavForRole, scopeForRole } from '../data/rbac';
import {
  INITIAL_USERS,
  INITIAL_TENANTS,
  INITIAL_PROJECTS,
  INITIAL_TEAM_MEMBERS,
  INITIAL_CONNECTORS,
  INITIAL_AGENTS,
  INITIAL_EVALUATIONS,
  INITIAL_PROMPTS,
  INITIAL_SESSIONS,
  INITIAL_SENSITIVE_LOGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_TASKS,
  INITIAL_MODULE_ACTIVITY,
  INITIAL_AGENT_USAGE,
} from '../data/mockData';
import { INITIAL_PIPELINE } from '../data/pipelineData';

export type { NavView };

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

export type AuthMethod = 'password' | 'sso';

export interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AppContextType {
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
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;

  // Data collections
  tenants: Tenant[];
  projects: Project[];
  teamMembers: TeamMember[];
  connectors: Connector[];
  agents: AgentService[];
  evaluations: Record<string, AgentEvaluation>;
  prompts: PromptVersion[];
  sessions: SessionConfig;
  sensitiveLogs: SensitiveDataLog[];
  auditLogs: AuditLogEntry[];
  notifications: NotificationItem[];
  tasks: Task[];
  moduleActivity: ModuleActivity[];
  agentUsage: AgentUsage[];
  pipeline: PipelinePhase[];

  // Mutations
  createTenant: (name: string, adminEmail: string, inheritDefaults: boolean) => void;
  deactivateTenant: (id: string) => void;
  suspendTenant: (id: string) => void;
  createProject: (data: Partial<Project>) => void;
  closeProject: (id: string) => void;
  assignTeamMember: (data: Partial<TeamMember>) => void;
  toggleConnectorEnabled: (id: string) => void;
  activateConnectorProject: (id: string, endpoint?: string, repo?: string) => void;
  deprecateAgent: (id: string, note: string) => void;
  submitPromptCandidate: (promptId: string, candidateText: string, changeNote: string) => void;
  approvePromptCandidate: (promptId: string) => void;
  rejectPromptCandidate: (promptId: string) => void;
  rollbackPrompt: (promptId: string, targetVersion: string) => void;
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
  const [currentRole, setCurrentRoleState] = useState<Role>('Super Admin');
  const [currentScope, setCurrentScope] = useState<ScopeContext>({
    type: 'platform',
    tenantName: 'All Tenants',
  });
  const [activeNav, setActiveNavState] = useState<NavView>('Dashboard');
  const [navIntent, setNavIntent] = useState<NavIntent | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // State collections
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);
  const [connectors, setConnectors] = useState<Connector[]>(INITIAL_CONNECTORS);
  const [agents, setAgents] = useState<AgentService[]>(INITIAL_AGENTS);
  const [evaluations, setEvaluations] = useState<Record<string, AgentEvaluation>>(INITIAL_EVALUATIONS);
  const [prompts, setPrompts] = useState<PromptVersion[]>(INITIAL_PROMPTS);
  const [sessions, setSessions] = useState<SessionConfig>(INITIAL_SESSIONS);
  const [sensitiveLogs, setSensitiveLogs] = useState<SensitiveDataLog[]>(INITIAL_SENSITIVE_LOGS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [moduleActivity] = useState<ModuleActivity[]>(INITIAL_MODULE_ACTIVITY);
  const [agentUsage] = useState<AgentUsage[]>(INITIAL_AGENT_USAGE);
  const [pipeline] = useState<PipelinePhase[]>(INITIAL_PIPELINE);

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
    setActiveNavState(nav);
  };

  const navigateTo = (nav: NavView, intent?: NavIntent) => {
    if (!canAccessNav(currentRole, nav)) {
      addToast(`Your ${currentRole} role does not have access to ${nav}.`, 'error');
      return;
    }
    setNavIntent(intent ?? null);
    setActiveNavState(nav);
  };

  const clearNavIntent = () => setNavIntent(null);

  const addAuditLog = (action: string, target: string, input: string, output: string) => {
    const entry: AuditLogEntry = {
      id: 'audit-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser
        ? `${currentUser.name} (${currentRole})`
        : currentRole === 'Super Admin'
        ? 'Platform Super Admin'
        : 'Current User (' + currentRole + ')',
      actorType: 'user',
      action,
      targetArtifact: target,
      context: `Scope: ${currentScope.type.toUpperCase()} - ${currentScope.tenantName || 'All'}`,
      input,
      output,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

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
        return { ok: false, error: 'SSO is not enabled for this tenant. Sign in with your password.' };
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
    setCurrentRoleState('Super Admin');
    setCurrentScope({ type: 'platform', tenantName: 'All Tenants' });
    setActiveNavState('Dashboard');
  };

  /**
   * Corporate-email sign-up. Provisioning is governed, so this raises an access
   * request for a Tenant Admin rather than minting a session.
   */
  const requestAccess = (email: string): AuthResult => {
    const normalized = email.trim().toLowerCase();

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
      return { ok: false, error: 'Enter a valid corporate email address.' };
    }

    if (users.some((u) => u.email.toLowerCase() === normalized)) {
      return { ok: false, error: 'An account already exists for that email. Try signing in.' };
    }

    const tenant = tenants.find((t) => normalized.endsWith(t.adminEmail.split('@')[1]));
    addToast(`Access request sent to ${tenant ? tenant.name : 'the platform'} admin for approval.`, 'info');
    addAuditLog(
      'Request Workspace Access',
      `Prospective user: ${normalized}`,
      `Detected tenant: ${tenant ? tenant.name : 'Unmatched domain'}`,
      'Pending Tenant Admin approval'
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
  const createTenant = (name: string, adminEmail: string, inheritDefaults: boolean) => {
    const newTenant: Tenant = {
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
    setTenants((prev) => [newTenant, ...prev]);
    addToast(`Tenant "${name}" created. Invite sent to ${adminEmail}.`);
    addAuditLog('Create Tenant', `Tenant: ${name}`, `Admin Email: ${adminEmail}`, 'Tenant Created Successfully');
  };

  const deactivateTenant = (id: string) => {
    const target = tenants.find((t) => t.id === id);
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'Deactivated' as const } : t))
    );
    addToast(`Tenant "${target?.name || id}" deactivated.`);
    addAuditLog('Deactivate Tenant', `Tenant ID: ${id}`, 'Deactivation confirm', 'Status set to Deactivated');
  };

  const suspendTenant = (id: string) => {
    const target = tenants.find((t) => t.id === id);
    setTenants((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'Suspended' as const } : t))
    );
    addToast(`Tenant "${target?.name || id}" suspended.`);
    addAuditLog('Suspend Tenant', `Tenant ID: ${id}`, 'Suspension confirm', 'Status set to Suspended');
  };

  const createProject = (data: Partial<Project>) => {
    const newProj: Project = {
      id: 'p-' + Date.now().toString(36),
      name: data.name || 'New Project',
      tenantId: data.tenantId || 't-incedo',
      tenantName: data.tenantName || 'Incedo Labs',
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
      tenantId: data.tenantId || 't-incedo',
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

  const toggleConnectorEnabled = (id: string) => {
    setConnectors((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, enabledTenant: !c.enabledTenant } : c
      )
    );
    addToast(`Updated connector tenant status.`);
    addAuditLog('Toggle Connector Baseline', `Connector ID: ${id}`, 'Tenant enable toggle', 'Updated connector status');
  };

  const activateConnectorProject = (id: string, endpoint?: string, repo?: string) => {
    setConnectors((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              activatedProject: true,
              health: '● Connected' as const,
              endpointUrl: endpoint || c.endpointUrl,
              workspaceRepo: repo || c.workspaceRepo,
              lastSyncTime: 'Just now',
            }
          : c
      )
    );
    const target = connectors.find((c) => c.id === id);
    addToast(`${target?.name || 'Connector'} activated for project.`);
    addAuditLog('Activate Connector', `Connector: ${target?.name}`, `Endpoint: ${endpoint}`, 'Activated with project credentials');
  };

  const deprecateAgent = (id: string, note: string) => {
    if (!canDeprecateAgent(currentRole)) {
      addToast(`Deprecation is a tenant-level action — not available to ${currentRole}.`, 'error');
      return;
    }
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: 'Deprecated' as const, deprecationNote: note } : a
      )
    );
    const target = agents.find((a) => a.id === id);
    addToast(`Agent service "${target?.capability}" deprecated.`);
    addAuditLog('Deprecate Agent', `Agent: ${target?.capability}`, `Note: ${note}`, 'Status set to Deprecated');
  };

  const submitPromptCandidate = (promptId: string, candidateText: string, changeNote: string) => {
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === promptId
          ? {
              ...p,
              candidateVersion: (p.candidateVersion || 'v2.5.0-rc1'),
              candidatePromptText: candidateText,
              changeNote,
              reviewStatus: 'Pending Review' as const,
              lastChanged: new Date().toISOString().replace('T', ' ').substring(0, 19),
            }
          : p
      )
    );
    addToast(`Candidate prompt submitted for review.`);
    addAuditLog('Submit Prompt Candidate', `Prompt ID: ${promptId}`, changeNote, 'Pending Review status set');
  };

  const approvePromptCandidate = (promptId: string) => {
    setPrompts((prev) =>
      prev.map((p) => {
        if (p.id === promptId && p.candidatePromptText) {
          return {
            ...p,
            activeVersion: p.candidateVersion || 'v2.5.0',
            activePromptText: p.candidatePromptText,
            candidateVersion: undefined,
            candidatePromptText: undefined,
            reviewStatus: 'Active' as const,
            lastChanged: new Date().toISOString().replace('T', ' ').substring(0, 19),
          };
        }
        return p;
      })
    );
    addToast(`Prompt candidate approved & promoted to Active.`);
    addAuditLog('Approve Prompt', `Prompt ID: ${promptId}`, 'Approval sign-off', 'Promoted to Active system prompt');
  };

  const rejectPromptCandidate = (promptId: string) => {
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === promptId
          ? { ...p, candidateVersion: undefined, candidatePromptText: undefined, reviewStatus: 'Rejected' as const }
          : p
      )
    );
    addToast(`Prompt candidate rejected.`, 'info');
    addAuditLog('Reject Prompt', `Prompt ID: ${promptId}`, 'Reviewer rejection', 'Candidate version cleared');
  };

  const rollbackPrompt = (promptId: string, targetVersion: string) => {
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === promptId
          ? {
              ...p,
              activeVersion: targetVersion,
              lastChanged: new Date().toISOString().replace('T', ' ').substring(0, 19),
            }
          : p
      )
    );
    addToast(`Rolled back prompt to ${targetVersion}.`);
    addAuditLog('Rollback Prompt', `Prompt ID: ${promptId}`, `Target Version: ${targetVersion}`, 'Rollback executed & logged');
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
        searchQuery,
        setSearchQuery,
        toasts,
        addToast,
        removeToast,
        tenants,
        projects,
        teamMembers,
        connectors,
        agents,
        evaluations,
        prompts,
        sessions,
        sensitiveLogs,
        auditLogs,
        notifications,
        tasks,
        moduleActivity,
        agentUsage,
        pipeline,
        createTenant,
        deactivateTenant,
        suspendTenant,
        createProject,
        closeProject,
        assignTeamMember,
        toggleConnectorEnabled,
        activateConnectorProject,
        deprecateAgent,
        submitPromptCandidate,
        approvePromptCandidate,
        rejectPromptCandidate,
        rollbackPrompt,
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

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
