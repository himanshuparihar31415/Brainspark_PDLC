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
  | 'Observability'
  | 'Prompt Controls'
  | 'Security'
  | 'My Services'
  | 'Command Centre'
  | 'My Tasks'
  | 'Spec AI';

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
  /** Prior period spend — powers the "vs last period" trend in breakdowns. */
  spendPrev30d: number;
  tokens30d: number;
  /** Spend envelope the Tenant Admin is accountable to. */
  budget30d: number;
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
  spendPrev30d: number;
  tokens30d: number;
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
  /** Set by a Super Admin. When false, no tenant may enable this connector. */
  platformAvailable: boolean;
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

/**
 * Why a task exists. This is what stops the delivery view calling every
 * unlinked task a gap: an incident, a spike or a governance chore legitimately
 * has no specification behind it, and only `story-work` without a story is
 * evidence of something missing.
 */
export type TaskType = 'story-work' | 'bug' | 'operations' | 'spike' | 'governance';

export interface Task {
  id: string;
  /**
   * Immutable join key. `project` below is the denormalised display name kept
   * beside it, so renaming a project cannot break the join or rewrite history.
   */
  projectId: string;
  /** The story this task delivers. Absent is meaningful — see `taskType`. */
  storyId?: string;
  title: string;
  project: string;
  module: string;
  /** Stable reference to a TeamMember; `assignee` is the display name. */
  assigneeId?: string;
  assignee: string;
  taskType: TaskType;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'In Progress' | 'Needs Approval' | 'Completed' | 'Blocked';
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  artifactTitle?: string;
  artifactSummary?: string;
  /** Attributed AI spend / tokens — feeds the project-level cost + token axes. */
  costUsd?: number;
  tokens?: number;
  /** Hours this task has been sitting in review; drives the awaiting-review queue. */
  reviewHoursOpen?: number;
}

// ─────────────────────────────── Command Centre ───────────────────────────────

/**
 * Phase status as the Command Centre presents it. `Waiting` is distinct from
 * `Blocked`: blocked means the work is stuck, waiting means the agent service
 * behind the phase is unavailable.
 */
export type PhaseStatus = 'Not started' | 'In progress' | 'Blocked' | 'Waiting' | 'Complete';

export type ItemStatus = 'To do' | 'In progress' | 'Blocked' | 'In review' | 'Done';

export interface PhaseItem {
  id: string;
  title: string;
  status: ItemStatus;
  daysInStatus: number;
  owner: string;
}

/**
 * One module's phase within one project's pipeline. Cards render only for the
 * modules a project actually uses, so absence here means "omit the card".
 */
export interface PipelinePhase {
  id: string;
  projectId: string;
  module: ModuleKey;
  status: PhaseStatus;
  /** Completion numerator / denominator, in the module's own unit. */
  done: number;
  total: number;
  /** Items advanced this week — the lead "movement" line. */
  movementThisWeek: number;
  /** Days since anything moved; drives the stale flag. */
  daysSinceChange: number;
  /** Role accountable for this phase. */
  ownerRole: Role;
  /** Capability name shown when status is `Waiting`. */
  unavailableCapability?: string;
  items: PhaseItem[];
  blockedBy?: string;
}

/** The five capability modules the platform rolls activity up by. */
export type ModuleKey = 'specai' | 'design' | 'codeiq' | 'intelliqa' | 'release';

export type MetricUnit = 'count' | 'percent' | 'score' | 'days';

export interface ModuleMetricDef {
  label: string;
  unit: MetricUnit;
}

/** Command Centre wording for a module — the completion denominator differs per module. */
export interface ModulePipelineCopy {
  /** Noun used in the movement line: "+3 stories this week". */
  unit: string;
  /** Verb phrase completing "{done} / {total} …": "stories finalized". */
  completionPhrase: string;
  /** Sub-label on the workspace tile. */
  workspaceSubLabel: string;
}

export interface ModuleDef {
  key: ModuleKey;
  name: string;
  /** Matching AgentService.id, so cards can link to the registry. */
  agentId: string;
  /** Substring matched against a task's free-text module name. */
  phaseMatch: string;
  primary: ModuleMetricDef;
  secondary: ModuleMetricDef;
  /** The module's headline quality metric. */
  quality: ModuleMetricDef;
  /** Roles whose shared pool this module draws on — powers contention chips. */
  pooledRoles: Role[];
  pipeline: ModulePipelineCopy;
}

/** One project's activity within one module. Cards aggregate these. */
export interface ModuleActivity {
  projectId: string;
  module: ModuleKey;
  primary: number;
  secondary: number;
  quality: number;
  /** Quality delta vs last period. */
  qualityTrend: number;
  spend30d: number;
  tokens30d: number;
}

export interface AgentUsage {
  agentId: string;
  spend30d: number;
  tokens30d: number;
}

/** A ranked row inside a cost / token breakdown. */
export interface BreakdownRow {
  label: string;
  value: number;
  sublabel?: string;
}

/**
 * Carried alongside a navigation so the destination screen opens pre-filtered.
 * Cleared once the target view has read it.
 */
export interface NavIntent {
  /** Landing text explaining why the screen looks filtered. */
  note?: string;
  teamTab?: 'roster' | 'shared';
  projectSort?: 'completion-asc' | 'spend-desc';
  projectModule?: ModuleKey;
}
