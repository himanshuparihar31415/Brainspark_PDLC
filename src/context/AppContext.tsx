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
  OrchestrationPhase,
} from '../types';
import {
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
  INITIAL_ORCHESTRATION_PHASES,
} from '../data/mockData';

export type NavView =
  | 'Dashboard'
  | 'Tenants'
  | 'Projects'
  | 'Team'
  | 'Connectors'
  | 'Agent Registry'
  | 'Evaluation'
  | 'Prompt Controls'
  | 'Security'
  | 'My Services'
  | 'Orchestration'
  | 'My Tasks';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  message: string;
}

interface AppContextType {
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  currentScope: ScopeContext;
  setCurrentScope: (scope: ScopeContext) => void;
  activeNav: NavView;
  setActiveNav: (nav: NavView) => void;
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
  orchestrationPhases: OrchestrationPhase[];

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
  const [currentRole, setCurrentRoleState] = useState<Role>('Super Admin');
  const [currentScope, setCurrentScope] = useState<ScopeContext>({
    type: 'platform',
    tenantName: 'All Tenants',
  });
  const [activeNav, setActiveNav] = useState<NavView>('Dashboard');
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
  const [orchestrationPhases, setOrchestrationPhases] = useState<OrchestrationPhase[]>(
    INITIAL_ORCHESTRATION_PHASES
  );

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

  const addAuditLog = (action: string, target: string, input: string, output: string) => {
    const entry: AuditLogEntry = {
      id: 'audit-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentRole === 'Super Admin' ? 'Platform Super Admin' : 'Current User (' + currentRole + ')',
      actorType: 'user',
      action,
      targetArtifact: target,
      context: `Scope: ${currentScope.type.toUpperCase()} - ${currentScope.tenantName || 'All'}`,
      input,
      output,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  // Switch role logic with subtractive nav enforcement
  const setCurrentRole = (newRole: Role) => {
    setCurrentRoleState(newRole);
    addToast(`Switched role persona to ${newRole}`, 'info');

    // Scope locking & nav adjust
    if (newRole === 'Project Admin') {
      setCurrentScope({
        type: 'project',
        tenantId: 't-lpl',
        projectId: 'p-mobile-v2',
        tenantName: 'LPL Financial',
        projectName: 'Mobile Banking V2',
      });
      if (['Tenants', 'Projects'].includes(activeNav)) {
        setActiveNav('Dashboard');
      }
    } else if (newRole === 'Tenant Admin') {
      setCurrentScope({
        type: 'tenant',
        tenantId: 't-lpl',
        tenantName: 'LPL Financial',
      });
      if (activeNav === 'Tenants') {
        setActiveNav('Dashboard');
      }
    } else if (['Product Manager', 'Architect', 'Designer', 'Tech Lead', 'Developer', 'QA Manager', 'QA Engineer', 'Release Manager'].includes(newRole)) {
      if (['Tenants', 'Projects', 'Security', 'Prompt Controls'].includes(activeNav)) {
        setActiveNav('My Services');
      }
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
      tenantId: data.tenantId || 't-lpl',
      tenantName: data.tenantName || 'LPL Financial',
      admins: data.admins && data.admins.length > 0 ? data.admins : ['Current User'],
      phase: 'SpecAI Requirements',
      completion: 5,
      spend30d: 0,
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
      email: data.email || 'member@lplfinancial.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      roles: data.roles || ['Developer'],
      tenantId: data.tenantId || 't-lpl',
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
        currentRole,
        setCurrentRole,
        currentScope,
        setCurrentScope,
        activeNav,
        setActiveNav,
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
        orchestrationPhases,
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
