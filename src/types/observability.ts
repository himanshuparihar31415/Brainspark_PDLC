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
  tenantId: string;
  tenantName: string;
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
