export type Role =
  | 'Super Admin'
  | 'Tenant Admin'
  | 'Project Admin'
  | 'Product Manager'
  | 'Architect'
  | 'Designer'
  | 'Tech Lead'
  | 'Developer'
  | 'QA Manager'
  | 'QA Engineer'
  | 'Release Manager';

export type ScopeType = 'platform' | 'tenant' | 'project';

export interface ScopeContext {
  type: ScopeType;
  tenantId?: string;
  projectId?: string;
  tenantName?: string;
  projectName?: string;
}

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

/**
 * A sign-in identity. Mock only — passwords live in mock data purely so the
 * prototype can demonstrate role- and scope-based access from the login screen.
 */
export interface UserAccount {
  id: string;
  /** Links to a TeamMember when the user sits on a project roster. */
  memberId?: string;
  name: string;
  email: string;
  password: string;
  avatar?: string;
  title: string;
  /** Role applied on sign-in. */
  primaryRole: Role;
  /** Every role this identity is entitled to act as. */
  roles: Role[];
  /** Scope the identity is bound to; drives the header scope selector. */
  scope: ScopeContext;
  ssoEnabled: boolean;
  lastLogin: string;
}

export type TenantStatus = 'Active' | 'Suspended' | 'Deactivated';

export interface Tenant {
  id: string;
  name: string;
  projectsCount: number;
  headcount: number;
  spend30d: number;
  status: TenantStatus;
  adminEmail: string;
  createdAt: string;
  inheritDefaults: boolean;
}

export type ProjectLifecycle = 'Active' | 'Paused' | 'Closed';

export interface Project {
  id: string;
  name: string;
  tenantId: string;
  tenantName: string;
  admins: string[];
  phase: string;
  completion: number;
  spend30d: number;
  lifecycle: ProjectLifecycle;
  description: string;
  startDate: string;
  targetReleaseDate: string;
  template?: string;
}

export type PdlcRole =
  | 'Product Manager'
  | 'Architect'
  | 'Designer'
  | 'Tech Lead'
  | 'Developer'
  | 'QA Manager'
  | 'QA Engineer'
  | 'Release Manager';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  roles: Role[];
  tenantId: string;
  projectId?: string;
  moduleAccess: string[];
  status: 'Assigned' | 'Unassigned' | 'Available';
  allocationPercent?: number;
  drawnOnByProjects?: string[];
}

export type ConnectorCategory = 'Issue Tracking' | 'Source Control' | 'Design' | 'CI/CD' | 'Documentation' | 'AI Tools';

export type SyncType = '↕ Bidirectional' | '↓ Read' | '→ Push' | '⟳ Trigger + status';

export interface Connector {
  id: string;
  name: string;
  category: ConnectorCategory;
  usedByModules: string[];
  enabledTenant: boolean;
  activatedProject: boolean;
  health: '● Connected' | '⚠ Last sync failed' | '○ Not connected';
  syncType: SyncType;
  lastSyncTime: string;
  endpointUrl?: string;
  workspaceRepo?: string;
}

export type AgentStatus = 'Active' | 'Deprecated' | 'Held';

export interface AgentService {
  id: string;
  capability: string;
  module: string;
  version: string;
  status: AgentStatus;
  lastEvaluationDate: string;
  lastEvaluationPassed: boolean;
  drift: '— None' | '⚠ Drift detected';
  underlyingModel: string;
  permittedTools: string[];
  memorySettings: string;
  actionScope: 'Read + generate' | 'Read + generate + modify' | 'Full Autonomous';
  tokenBudgetPerInvocation: number;
  costCeilingPerInvocation: number;
  rateLimit: string;
  description: string;
  deprecationNote?: string;
  pinnedByProjectsCount?: number;
}

export interface MetricResult {
  metric: 'Precision' | 'Recall' | 'Format compliance' | 'Completeness' | 'Hallucination rate';
  result: number;
  threshold: number;
  passed: boolean;
}

export interface AgentEvaluation {
  agentId: string;
  capability: string;
  version: string;
  overallPassed: boolean;
  metrics: MetricResult[];
  lastRunDate: string;
  history: {
    version: string;
    date: string;
    result: 'Passed' | 'Failed';
    changedMetrics: string;
  }[];
}

export type ReviewStatus = 'Active' | 'Pending Review' | 'Draft' | 'Rejected';

export interface PromptVersion {
  id: string;
  agentId: string;
  capability: string;
  activeVersion: string;
  candidateVersion?: string;
  lastChanged: string;
  author: string;
  reviewStatus: ReviewStatus;
  activePromptText: string;
  candidatePromptText?: string;
  changeNote?: string;
}

export interface RBACPermission {
  role: Role;
  view: boolean;
  create: boolean;
  edit: boolean;
  approve: boolean;
  export: boolean;
}

export interface SessionConfig {
  sessionTimeoutMinutes: number;
  requireMFA: boolean;
  maxConcurrentSessions: number;
  ipAllowlist: string[];
  apiKeys: { id: string; name: string; created: string; lastUsed: string }[];
}

export interface SensitiveDataLog {
  id: string;
  documentInput: string;
  detection: 'PII' | 'PHI' | 'None';
  actionTaken: 'Blocked' | 'Masked' | 'Flagged for review';
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorType: 'user' | 'agent';
  action: string;
  targetArtifact: string;
  context: string;
  input: string;
  output: string;
}

export interface NotificationItem {
  id: string;
  type: 'alert' | 'info' | 'action';
  title: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface Task {
  id: string;
  title: string;
  project: string;
  module: string;
  assignee: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'In Progress' | 'Needs Approval' | 'Completed';
  dueDate: string;
  artifactTitle?: string;
  artifactSummary?: string;
}

export interface OrchestrationPhase {
  id: string;
  name: string;
  agentService: string;
  description: string;
  status: 'Completed' | 'In Progress' | 'Blocked' | 'Pending';
  completionPercent: number;
  activeArtifacts: number;
  blockers?: string[];
  currentTask?: string;
}
