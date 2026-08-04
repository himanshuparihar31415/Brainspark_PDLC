/**
 * PDLC Observability — the execution record of AI-assisted delivery work.
 *
 * Three capture levels in a strict parent-child chain, plus two reference
 * catalogs. The distinction that drives the whole model: catalogs describe what
 * *exists* (agents, models), capture tables describe what *happened* (runs,
 * executions, events). Conflating them is the common modelling mistake.
 *
 * Field names follow the codebase's camelCase; the specification's snake_case
 * column names map one-to-one.
 */

// ───────────────────────────── Reference catalogs ─────────────────────────────

export type ObservedAgentType = 'graph_node' | 'deep_agent' | 'sub_agent';

/** master.agents — makes an agent id a resolvable reference, not a loose string. */
export interface AgentCatalogEntry {
  id: string;
  /** Stable code-facing key, e.g. prd_understanding. */
  slug: string;
  name: string;
  moduleName: string;
  agentType: ObservedAgentType;
  description: string;
  isActive: boolean;
}

/**
 * master.llm_models — pricing as managed data rather than hardcoded constants.
 * The validity window is what stops a price change retro-editing history: a cost
 * figure always traces back to the catalog row that was in effect.
 */
export interface ModelCatalogEntry {
  id: string;
  name: string;
  provider: 'openai' | 'azure' | 'anthropic';
  inputCostPer1k: number;
  outputCostPer1k: number;
  contextWindow: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

// ─────────────────────────── Shared capture vocabulary ───────────────────────

export type RunStatus = 'running' | 'completed' | 'failed' | 'partial';

export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'skipped';

export type EventStatus = 'success' | 'error' | 'timeout';

export type TriggerSource = 'api' | 'mcp' | 'celery' | 'schedule';

export type Environment = 'dev' | 'qa' | 'uat' | 'prod';

/**
 * What was captured of prompt and response content. Recorded per run and per
 * event, because it is the answer to "why is this payload missing" — an absent
 * payload should read as a policy decision, never as data loss.
 */
export type PayloadPolicy = 'full' | 'redacted' | 'sampled' | 'metadata_only' | 'disabled';

/** Which layer emitted an event. */
export type SourceComponent = 'service' | 'workflow' | 'gateway' | 'tool';

export type AcceptanceStatus = 'accepted' | 'rejected' | 'pending';

// ───────────────────────────── Level 1: the run ─────────────────────────────

/**
 * One business-level capability invocation. Separate from the business record so
 * observability writes never complicate a business transaction and can be purged
 * on their own schedule.
 */
export interface ObservabilityRun {
  id: string;
  /** The business record holding the actual output. */
  runId: string;
  departmentId: string;
  departmentName: string;
  userId: string;
  userName: string;
  sessionId?: string;
  projectId?: string;
  projectName?: string;
  /** The top-level agent that started the run. */
  entryAgentId: string;
  /** Correlation with application logs and infrastructure traces. */
  traceId: string;
  moduleName: string;
  capability: string;
  triggerSource: TriggerSource;
  environment: Environment;
  /** Platform or prompt release in effect, for before-and-after comparison. */
  releaseVersion?: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  /*
   * Totals are stored, not derived. Cost dashboards are the highest-frequency
   * read on the platform and cannot re-aggregate millions of event rows per page
   * load; the events remain the source of truth for drill-down.
   */
  totalAgents: number;
  totalLlmCalls: number;
  totalToolCalls: number;
  /** Agent re-entries across the run — the loop-cost signal. */
  totalRetries: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  /** Without this the platform can report cost per run but not cost per accepted artifact. */
  acceptanceStatus?: AcceptanceStatus;
  payloadPolicy: PayloadPolicy;
  errorSummary?: string;
  /** Client IP observed at trigger — anomaly / geo signals. */
  clientIp?: string;
  /** True when the run hit a provider or connector rate limit. */
  rateLimited?: boolean;
  /** Accepted business units produced (stories, tests, etc.) for unit economics. */
  artifactUnits?: number;
  artifactUnitLabel?: 'user_story' | 'test_case' | 'design' | 'pr' | 'other';
  /** Sensitive-data markers detected on this run (PII / PHI codes). */
  sensitiveMarkers?: string[];
}

// ────────────────────────── Level 2: agent executions ──────────────────────────

/**
 * One agent doing one unit of work — a new row per attempt, never overwritten, so
 * loop cost stays visible. Ordering is by timestamp because an integer sequence
 * has no meaning once two agents run at once.
 */
export interface AgentExecution {
  id: string;
  observabilityRunId: string;
  agentId: string;
  /** Snapshot of the name at execution time, so history survives a catalog rename. */
  agentName: string;
  agentType: ObservedAgentType;
  /** Set when this agent was spawned by another — the sub-agent nesting link. */
  parentExecutionId?: string;
  depth: number;
  /** Shared by agents that ran concurrently. Null when it ran alone. */
  parallelGroupId?: string;
  attemptNumber: number;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  inputSummary?: string;
  outputSummary?: string;
  llmCallCount: number;
  toolCallCount: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  qualityResult?: string;
  errorDetail?: string;
}

// ──────────────────────────── Level 3: events ────────────────────────────

/**
 * The nine event types. Fixing this taxonomy matters more than it looks — it is
 * the vocabulary every dashboard, alert and query is written against, and adding
 * a type later means revisiting every reader.
 */
export type ObservabilityEventType =
  | 'llm_call'
  | 'tool_call'
  | 'state_transition'
  | 'error'
  | 'hitl_pause'
  | 'cache_hit'
  | 'policy_decision'
  | 'evaluation'
  | 'artifact';

/**
 * One wide typed table rather than one per type. All events share a parent, a
 * start, an end, a status and a parallel group; splitting them would turn every
 * "show the full timeline" read into a multi-way union.
 */
export interface ObservabilityEvent {
  id: string;
  agentExecutionId: string;
  /** Duplicated deliberately, so run-wide queries skip the agent-level join. */
  observabilityRunId: string;
  eventType: ObservabilityEventType;
  sourceComponent: SourceComponent;
  parallelGroupId?: string;
  status: EventStatus;
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  payloadPolicy: PayloadPolicy;
  errorType?: string;
  errorDetail?: string;

  // ── LLM calls ──
  modelId?: string;
  /** Snapshot of the resolved model string. */
  modelName?: string;
  provider?: string;
  modelParams?: Record<string, number>;
  promptVersionId?: string;
  promptVersionLabel?: string;
  /** Fingerprint of the system prompt, for grouping identical prompts. */
  systemPromptHash?: string;
  inputPayload?: string;
  outputPayload?: string;
  /** Pointer to full content in protected object storage. */
  payloadReference?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  wasCached?: boolean;
  /** Provider-level retries inside this one logical call — not a workflow retry. */
  retryCount?: number;
  /**
   * Which model tier answered: 0 = primary, 1 = fallback_1, 2 = fallback_2.
   * Null/undefined means not applicable (non-LLM event).
   */
  fallbackTier?: 0 | 1 | 2;

  // ── Tool calls ──
  toolSlug?: string;
  toolInput?: string;
  toolOutput?: string;
  /** Upstream system error, kept distinct from an internal failure. */
  dependencyError?: string;

  // ── State transitions ──
  fromStep?: string;
  toStep?: string;
  /** Why the transition was taken, for branch and loop analysis. */
  decisionLabel?: string;

  // ── Human-in-the-loop, cache, policy, evaluation, artifact ──
  hitlReason?: string;
  hitlApproverRole?: string;
  hitlResolution?: string;
  cacheKeyHash?: string;
  estimatedSavingsUsd?: number;
  policyName?: string;
  policyDecision?: string;
  evaluationDimension?: string;
  evaluationScore?: number;
  evaluationThreshold?: number;
  artifactType?: string;
  artifactVersion?: string;
}

// ───────────────────────────── Derived reporting ─────────────────────────────

/** One of the eight pillars the cockpit converges. */
export interface ObservabilityPillar {
  key: string;
  name: string;
  signals: string;
  question: string;
  owner: string;
}

export type SloState = 'meeting' | 'at-risk' | 'breached';

/** A metric shown against a target, so the number is interpretable on sight. */
export interface KpiReading {
  key: string;
  label: string;
  value: string;
  /** The target or baseline the value is read against. */
  target: string;
  state: SloState;
  /** Direction and size of change against the prior period. */
  delta?: string;
  hint: string;
}

/** A ranked risk with an owner attached — never an unranked exception list. */
export interface RankedRisk {
  id: string;
  severity: 'critical' | 'high' | 'medium';
  title: string;
  evidence: string;
  owner: string;
  /** Run this drills into, when the risk traces to a specific one. */
  runId?: string;
}

/** Who opened L5 evidence — the access-audit trail for observability payloads. */
export interface EvidenceAccessLog {
  id: string;
  viewedAt: string;
  viewerUserId: string;
  viewerName: string;
  viewerRole: string;
  observabilityRunId: string;
  eventId: string;
  clientIp: string;
  action: 'view_payload' | 'export_evidence' | 'open_timeline';
}

/** One answer card in the ops cockpit — maps a platform question to a reading. */
export interface OpsAnswer {
  id: string;
  domain: 'reliability' | 'department' | 'drift' | 'security' | 'trends' | 'debug';
  question: string;
  answer: string;
  detail: string;
  state: SloState;
  /** Optional drill target. */
  runId?: string;
  moduleName?: string;
  departmentId?: string;
}

// ─────────────────── API Response Types (API_ENDPOINTS_1346.md) ───────────────

export interface PlatformAppMetrics {
  total_departments: number;
  active_departments: number;
  total_users: number;
  recent_auth_success: number;
  recent_auth_failure: number;
  recent_rate_limit_events: number;
  recent_schema_provision_failures: number;
}

export interface DepartmentObservability {
  department_id: string;
  active_member_count: number;
  project_count: number;
  enabled_tool_count: number;
  recent_session_count: number;
  recent_run_count: number;
  recent_run_failures: number;
}

export interface ProjectObservability {
  project_id: string;
  member_count: number;
  members_by_role: Record<string, number>;
  enabled_tool_count: number;
  recent_session_count: number;
  recent_run_count: number;
  recent_run_failures: number;
}

export interface CostByModuleItem {
  module: string;
  total_cost_usd: number;
  run_count: number;
  total_tokens: number;
}

export interface CostByAgentItem {
  agent_slug: string;
  total_cost: number;
  invocation_count: number;
  avg_cost_per_call: number;
  total_tokens: number;
}

export interface CacheSavingsResponse {
  total_llm_calls: number;
  cached_calls: number;
  cache_hit_rate_pct: number;
  estimated_savings_usd: number;
}

export interface PerfByAgentItem {
  agent_slug: string;
  p50_ms: number;
  p95_ms: number;
  avg_ms: number;
  max_ms: number;
  call_count: number;
}

export interface BottleneckItem {
  span_id: string;
  name: string;
  span_kind: string;
  duration_ms: number;
  pct_of_total: number;
}

export interface ErrorRateItem {
  agent_slug: string;
  total_calls: number;
  error_count: number;
  error_rate_pct: number;
}

export interface ProviderHealthItem {
  provider: string;
  total_calls: number;
  error_count: number;
  error_rate_pct: number;
  avg_latency_ms: number;
}

export interface FallbackRateResponse {
  total_llm_calls: number;
  fallback_hits: number;
  fallback_rate_pct: number;
  by_agent: { agent_slug: string; fallback_count: number }[];
}

export interface TopConsumerItem {
  department_id: string;
  department_schema: string;
  total_cost_usd: number;
  run_count: number;
  total_tokens: number;
}

export interface TokenTrendItem {
  period: string;
  avg_tokens: number;
  avg_input: number;
  avg_output: number;
  call_count: number;
}

export interface ToolUsageResponse {
  avg_tool_calls_per_run: number;
  tool_breakdown: { tool_name: string; call_count: number; avg_duration_ms: number }[];
}

export interface RetryRateResponse {
  total_calls: number;
  retried_calls: number;
  retry_rate_pct: number;
  max_attempts_seen: number;
}

export interface RunSummaryResponse {
  id: string;
  module: string;
  capability: string;
  entry_agent: string;
  status: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  total_agents: number;
  total_llm_calls: number;
  total_tool_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  cached_llm_calls: number;
  error_summary: string | null;
}

export interface SpanTimelineItem {
  span_id: string;
  parent_span_id: string | null;
  span_kind: string;
  name: string;
  agent_id: string;
  status: string;
  attempt_number: number;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  error_type: string | null;
  error_detail: string | null;
  model_served: string;
  provider: string;
  cost_usd: number;
}
