export type Role =
  | 'Tenant Admin'
  | 'Department Admin'
  | 'Project Admin'
  | 'Product Manager'
  | 'Architect'
  | 'Designer'
  | 'Tech Lead'
  | 'Developer'
  | 'QA Manager'
  | 'QA Engineer'
  | 'Release Manager';

export type ScopeType = 'tenant' | 'department' | 'project';

export interface ScopeContext {
  type: ScopeType;
  departmentId?: string;
  projectId?: string;
  departmentName?: string;
  projectName?: string;
}

export type NavView =
  | 'Dashboard'
  | 'Departments'
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
  | 'Spec AI'
  | 'Spec AI v2'
  | 'CodeIQ';

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

export type DepartmentStatus = 'Active' | 'Suspended' | 'Deactivated';

export interface Department {
  id: string;
  name: string;
  projectsCount: number;
  headcount: number;
  spend30d: number;
  /** Prior period spend — powers the "vs last period" trend in breakdowns. */
  spendPrev30d: number;
  tokens30d: number;
  /** Spend envelope the Department Admin is accountable to. */
  budget30d: number;
  status: DepartmentStatus;
  adminEmail: string;
  createdAt: string;
  inheritDefaults: boolean;
}

export type ProjectLifecycle = 'Active' | 'Paused' | 'Closed';

export interface Project {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
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
  departmentId: string;
  projectId?: string;
  moduleAccess: string[];
  status: 'Assigned' | 'Unassigned' | 'Available';
  allocationPercent?: number;
  drawnOnByProjects?: string[];
}

export type ConnectorCategory = 'Issue Tracking' | 'Source Control' | 'Design' | 'CI/CD' | 'Documentation' | 'AI Tools';

export type SyncType = '↕ Bidirectional' | '↓ Read' | '→ Push' | '⟳ Trigger + status';

/** Where a project's binding actually stands. */
export type ActivationStatus = 'connected' | 'sync-failed' | 'not-set-up';

/**
 * One project's binding to a connector.
 *
 * Health, sync time, endpoint and credentials live here rather than on the
 * catalogue entry, because they describe a *binding* and never described the
 * integration. Two projects on the same Jira have two endpoints, two sync
 * times, and can fail independently.
 */
export interface ConnectorActivation {
  projectId: string;
  status: ActivationStatus;
  syncType: SyncType;
  lastSyncTime: string;
  /** Verbatim failure, e.g. "HTTP 502 Bad Gateway". Present when sync-failed. */
  lastError?: string;
  endpointUrl?: string;
  workspaceRepo?: string;
}

/**
 * A connector, as the platform catalogue holds it.
 *
 * The three rungs of the authority ladder are three different shapes on
 * purpose. Availability is genuinely tenant-wide, so it is a boolean.
 * Enablement varies by department and activation varies by project, so those
 * are keyed — a single flag for either meant one project activating Jira
 * silently activated it for every other project on the platform.
 */
export interface Connector {
  id: string;
  name: string;
  category: ConnectorCategory;
  usedByModules: string[];
  /** Set by a Tenant Admin. When false, no department may enable this connector. */
  tenantAvailable: boolean;
  /** Departments a Department Admin has enabled it for. */
  enabledDepartments: string[];
  /** Project bindings, keyed by projectId. Absent means never set up. */
  activations: Record<string, ConnectorActivation>;
}

/**
 * A row in the agent catalogue — the PromptOps `GET /agents` shape. `slug` is the
 * stable invocation key (snake_case, enforced on registration); `id` is the
 * server-assigned surrogate. Nullable fields are genuinely absent for agents
 * that inherit platform routing defaults rather than pinning their own.
 */
export interface CatalogueAgent {
  id: string;
  slug: string;
  name: string;
  module_name: string;
  agent_type: string;
  description: string | null;
  /** Soft-delete flag. Deactivated agents stay listed but cannot be invoked. */
  is_active: boolean;
  created_at: string | null;
  provider: string | null;
  deployment: string | null;
  model: string | null;
  api_version: string | null;
  fallback_deployment: string | null;
  fallback_model: string | null;
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

/**
 * One published version of a prompt instruction. Versions are immutable and
 * append-only: publishing bumps `version_number` and moves `is_active` to the new
 * row, so history is never rewritten. Exactly one row per
 * (module, workflow, template_name, project_id) key may be active at a time.
 */
export interface PromptInstruction {
  id: string;
  module: string;
  workflow: string;
  template_name: string;
  /** Author of this version. */
  user_id: string;
  version_number: number;
  instructions_text: string;
  is_active: boolean;
  created_at: string | null;
  /** Absent for global instructions; set for a project-scoped override. */
  project_id?: string;
}

/**
 * A Jinja skeleton discovered on disk. Templates define which
 * (module, workflow, template_name) triples instructions may be published against.
 */
export interface PromptTemplate {
  module: string;
  workflow: string;
  template_name: string;
  path: string;
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
  /** Short label, used where space is tight — pipeline cards, dashboard strips. */
  name: string;
  /**
   * The product-facing name, used by delivery rollups and Observability. It is
   * genuinely not always `name`: the design module is "Design" on a pipeline card
   * and "Proto AI" in a delivery table. Keeping both here is what stops a fifth
   * spelling appearing the next time a surface needs the longer one.
   */
  productName: string;
  /**
   * snake_case identifier used by the PromptOps agent catalogue
   * (`CatalogueAgent.module_name`) and by Observability runs. A second namespace
   * rather than a stray spelling — it mirrors a server contract, so it is mapped
   * here and never renamed to match the client.
   */
  apiKey: string;
  /**
   * Historical and alternate spellings that must still resolve to this module.
   * Free-text module names arrive from fixtures and, eventually, from trackers;
   * `moduleKeyFor` consults this so an unrecognised label fails loudly at the
   * call site instead of silently matching nothing.
   */
  aliases: string[];
  /** Matching CatalogueAgent.id, so cards can link to the catalogue. */
  agentId: string;
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
  /**
   * A specific task to land on. Set when arriving from My Activity, so the
   * destination opens the row that was clicked rather than its own default —
   * and shows it even when the screen would normally filter it out.
   */
  taskId?: string;
}
