import { Role } from '../types';
import {
  AgentExecution,
  KpiReading,
  ModelCatalogEntry,
  ObservabilityEvent,
  ObservabilityEventType,
  ObservabilityPillar,
  ObservabilityRun,
  PayloadPolicy,
  RankedRisk,
  SloState,
} from '../types/observability';

// ─────────────────────────── The eight pillars ───────────────────────────

/**
 * Each pillar stays owned by the team able to act on its evidence; the cockpit
 * only presents common outcomes and risks. run and trace identifiers are the
 * bridge — without them these become eight disconnected dashboards.
 */
export const OBSERVABILITY_PILLARS: ObservabilityPillar[] = [
  {
    key: 'business',
    name: 'Business & adoption',
    signals: 'Runs, active users, artifacts, throughput, cycle time, acceptance',
    question: 'Are teams adopting the platform and is delivery improving?',
    owner: 'Product',
  },
  {
    key: 'workflow',
    name: 'Workflow & agents',
    signals: 'Flow path, step status, retries, loops, parallel groups, HITL pauses',
    question: 'Where is work delayed or failing?',
    owner: 'Agent framework',
  },
  {
    key: 'llm',
    name: 'LLM & prompts',
    signals: 'Model, prompt version, tokens, cost, latency, payload policy, cache',
    question: 'Which AI configuration produced the outcome?',
    owner: 'AI engineering',
  },
  {
    key: 'tools',
    name: 'Tools & integrations',
    signals: 'Connector and tool invocation, latency, status, rate limits, dependency errors',
    question: 'Are Jira, Git, APIs and MCP reliable?',
    owner: 'Platform engineering',
  },
  {
    key: 'quality',
    name: 'Quality & evaluation',
    signals: 'Completeness, groundedness, validation, user acceptance, regressions',
    question: 'Is the output correct and useful?',
    owner: 'Evaluation service',
  },
  {
    key: 'cost',
    name: 'Cost & capacity',
    signals: 'Spend, token mix, concurrency, queue time, quotas, cache savings',
    question: 'Is usage economically sustainable?',
    owner: 'Finance & platform',
  },
  {
    key: 'governance',
    name: 'Security & governance',
    signals: 'Actor, policy, access, audit, redaction, retention, residency',
    question: 'Can we prove safe and compliant operation?',
    owner: 'Governance',
  },
  {
    key: 'reliability',
    name: 'Platform reliability',
    signals: 'API, workers, queues, databases, caches, storage, SLOs',
    question: 'Can the platform meet enterprise reliability commitments?',
    owner: 'Platform infrastructure',
  },
];

// ─────────────────────── Display hierarchy: five levels ───────────────────────

export type ObservabilityLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export const LEVELS: Record<
  ObservabilityLevel,
  { label: string; content: string; audience: string }
> = {
  L1: {
    label: 'Enterprise',
    content: 'Adoption, run volume, success, quality, cost, SLOs, risk themes',
    audience: 'CTO, product and platform leadership',
  },
  L2: {
    label: 'Module',
    content: 'Per-module trends across Spec AI, Proto AI, Code IQ, IntelliQA, Release Pulse',
    audience: 'Product owners, engineering leaders',
  },
  L3: {
    label: 'Department / project',
    content: 'Consumption, cost, data policy, failures, connector health',
    audience: 'Account and platform operations',
  },
  L4: {
    label: 'Run timeline',
    content: 'Agent path, retries, tools, model calls, prompts, errors, latency',
    audience: 'Engineering, support, AI operations',
  },
  L5: {
    label: 'Event evidence',
    content: 'Sanitized input/output, token accounting, tool I/O, exception detail',
    audience: 'Authorized investigators only',
  },
};

/**
 * Payload access is an explicit right, not a consequence of having navigated deep
 * enough. Reaching L5 in the interface does not grant the right to read prompt or
 * response content — this is the check that decides, and it is deliberately
 * narrower than the set of roles that can open the view.
 */
export const PAYLOAD_READER_ROLES: Role[] = ['Tenant Admin', 'Department Admin'];

export const canViewPayloads = (role: Role): boolean => PAYLOAD_READER_ROLES.includes(role);

/*
 * Content is never surfaced above L4. That is enforced structurally rather than by
 * a check — L5 is the only level whose component renders a payload at all.
 */

// ───────────────────────────── Event taxonomy ─────────────────────────────

export const EVENT_TYPES: Record<
  ObservabilityEventType,
  { label: string; evidence: string; chip: string; dot: string }
> = {
  llm_call: {
    label: 'LLM call',
    evidence: 'Model, prompt version and hash, parameters, tokens, cost, latency, cache, retries',
    chip: 'bg-indigo-50 text-indigo-700',
    dot: 'bg-indigo-500',
  },
  tool_call: {
    label: 'Tool call',
    evidence: 'Tool slug, input and output, latency, status, dependency error, retry',
    chip: 'bg-cyan-50 text-cyan-700',
    dot: 'bg-cyan-500',
  },
  state_transition: {
    label: 'Transition',
    evidence: 'From and to step, decision label, condition and state summary',
    chip: 'bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
  },
  error: {
    label: 'Error',
    evidence: 'Type, source, message, stack reference, retryability and impact',
    chip: 'bg-rose-50 text-rose-700',
    dot: 'bg-rose-500',
  },
  hitl_pause: {
    label: 'Waiting on a human',
    evidence: 'Reason, requested action, approver role, pause duration and resolution',
    chip: 'bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
  },
  cache_hit: {
    label: 'Cache hit',
    evidence: 'Cache type and key hash, avoided call, latency and estimated savings',
    chip: 'bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  policy_decision: {
    label: 'Policy',
    evidence: 'Policy, version, decision, reason and enforcement point',
    chip: 'bg-violet-50 text-violet-700',
    dot: 'bg-violet-500',
  },
  evaluation: {
    label: 'Evaluation',
    evidence: 'Evaluator and version, dimension, score, threshold, outcome',
    chip: 'bg-teal-50 text-teal-700',
    dot: 'bg-teal-500',
  },
  artifact: {
    label: 'Artifact',
    evidence: 'Artifact type and version, source run, acceptance, storage reference',
    chip: 'bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  },
};

export const PAYLOAD_POLICY_COPY: Record<PayloadPolicy, { label: string; hint: string }> = {
  full: { label: 'Full', hint: 'Prompt and response content captured in full.' },
  redacted: { label: 'Redacted', hint: 'Content captured with sensitive spans removed.' },
  sampled: { label: 'Sampled', hint: 'Content captured on a fraction of calls only.' },
  metadata_only: { label: 'Metadata only', hint: 'No content captured — counts and timings only.' },
  disabled: { label: 'Disabled', hint: 'Capture switched off for this department.' },
};

// ───────────────────────────── Cost from the catalog ─────────────────────────

/**
 * Price the call against the catalog row that was in effect when it ran, not the
 * current one. This is what stops a price change silently rewriting last quarter's
 * cost report.
 */
export const priceAt = (
  models: ModelCatalogEntry[],
  modelName: string,
  at: string
): ModelCatalogEntry | undefined =>
  models.find(
    (m) =>
      m.name === modelName &&
      m.effectiveFrom <= at &&
      (m.effectiveTo === undefined || m.effectiveTo > at)
  );

export const computeCostUsd = (
  models: ModelCatalogEntry[],
  modelName: string,
  at: string,
  inputTokens: number,
  outputTokens: number
): number => {
  const price = priceAt(models, modelName, at);
  if (!price) return 0;
  return (
    (inputTokens / 1000) * price.inputCostPer1k + (outputTokens / 1000) * price.outputCostPer1k
  );
};

// ───────────────────────────── Roll-ups and selectors ─────────────────────────

export interface RunFilter {
  departmentId?: string;
  projectId?: string;
  moduleName?: string;
  environment?: string;
}

export const filterRuns = (runs: ObservabilityRun[], f: RunFilter): ObservabilityRun[] =>
  runs.filter(
    (r) =>
      (!f.departmentId || r.departmentId === f.departmentId) &&
      (!f.projectId || r.projectId === f.projectId) &&
      (!f.moduleName || r.moduleName === f.moduleName) &&
      (!f.environment || r.environment === f.environment)
  );

export interface RunRollup {
  runs: number;
  completed: number;
  failed: number;
  partial: number;
  successRate: number;
  accepted: number;
  /** The number leadership actually needs: spend per artifact someone kept. */
  costPerAcceptedUsd: number;
  costUsd: number;
  tokens: number;
  llmCalls: number;
  toolCalls: number;
  retries: number;
  p50Ms: number;
  p95Ms: number;
  activeUsers: number;
  cacheSavingsUsd: number;
}

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
};

export const rollup = (runs: ObservabilityRun[], events: ObservabilityEvent[] = []): RunRollup => {
  const completed = runs.filter((r) => r.status === 'completed').length;
  const failed = runs.filter((r) => r.status === 'failed').length;
  const partial = runs.filter((r) => r.status === 'partial').length;
  const accepted = runs.filter((r) => r.acceptanceStatus === 'accepted').length;
  const costUsd = runs.reduce((n, r) => n + r.totalCostUsd, 0);
  const finished = runs.filter((r) => r.status !== 'running');
  const runIds = new Set(runs.map((r) => r.id));

  return {
    runs: runs.length,
    completed,
    failed,
    partial,
    successRate: finished.length === 0 ? 0 : (completed / finished.length) * 100,
    accepted,
    costPerAcceptedUsd: accepted === 0 ? 0 : costUsd / accepted,
    costUsd,
    tokens: runs.reduce((n, r) => n + r.totalInputTokens + r.totalOutputTokens, 0),
    llmCalls: runs.reduce((n, r) => n + r.totalLlmCalls, 0),
    toolCalls: runs.reduce((n, r) => n + r.totalToolCalls, 0),
    retries: runs.reduce((n, r) => n + r.totalRetries, 0),
    p50Ms: percentile(
      runs.map((r) => r.durationMs),
      50
    ),
    p95Ms: percentile(
      runs.map((r) => r.durationMs),
      95
    ),
    activeUsers: new Set(runs.map((r) => r.userId)).size,
    cacheSavingsUsd: events
      .filter((e) => e.eventType === 'cache_hit' && runIds.has(e.observabilityRunId))
      .reduce((n, e) => n + (e.estimatedSavingsUsd ?? 0), 0),
  };
};

/*
 * Named grouping results rather than inline object spreads. Three surfaces need
 * the same breakdowns, and giving each a type keeps the dimension explicit
 * instead of leaving it to inference at four separate call sites.
 */
export interface ModuleRollup extends RunRollup {
  moduleName: string;
}
export interface DepartmentRollup extends RunRollup {
  departmentId: string;
  departmentName: string;
}
export interface ProjectRollup extends RunRollup {
  projectId?: string;
  projectName: string;
}
export interface CapabilityRollup extends RunRollup {
  capability: string;
}

const distinct = <T,>(values: T[]): T[] => Array.from(new Set(values));

export const groupByModule = (
  runs: ObservabilityRun[],
  events: ObservabilityEvent[]
): ModuleRollup[] =>
  distinct(runs.map((r) => r.moduleName)).map((moduleName) => ({
    moduleName,
    ...rollup(
      runs.filter((r) => r.moduleName === moduleName),
      events
    ),
  }));

export const groupByDepartment = (
  runs: ObservabilityRun[],
  events: ObservabilityEvent[]
): DepartmentRollup[] =>
  distinct(runs.map((r) => r.departmentId)).map((departmentId) => {
    const rows = runs.filter((r) => r.departmentId === departmentId);
    return { departmentId, departmentName: rows[0]?.departmentName ?? departmentId, ...rollup(rows, events) };
  });

export const groupByProject = (
  runs: ObservabilityRun[],
  events: ObservabilityEvent[]
): ProjectRollup[] =>
  distinct(runs.map((r) => r.projectId)).map((projectId) => {
    const rows = runs.filter((r) => r.projectId === projectId);
    return {
      projectId,
      projectName: rows[0]?.projectName ?? 'Unassigned',
      ...rollup(rows, events),
    };
  });

export const groupByCapability = (
  runs: ObservabilityRun[],
  events: ObservabilityEvent[]
): CapabilityRollup[] =>
  distinct(runs.map((r) => r.capability)).map((capability) => ({
    capability,
    ...rollup(
      runs.filter((r) => r.capability === capability),
      events
    ),
  }));

export const distinctPayloadPolicies = (runs: ObservabilityRun[]): PayloadPolicy[] =>
  distinct(runs.map((r) => r.payloadPolicy));

/** Share of runs where any agent ran more than once — a prompt-tuning signal. */
export const retryRate = (runs: ObservabilityRun[]): number =>
  runs.length === 0 ? 0 : (runs.filter((r) => r.totalRetries > 0).length / runs.length) * 100;

export const sloStateFor = (value: number, target: number, higherIsBetter = true): SloState => {
  const meets = higherIsBetter ? value >= target : value <= target;
  if (meets) return 'meeting';
  const margin = higherIsBetter ? target * 0.97 : target * 1.1;
  const nearlyMeets = higherIsBetter ? value >= margin : value <= margin;
  return nearlyMeets ? 'at-risk' : 'breached';
};

export const SLO_STATE_COPY: Record<SloState, { label: string; chip: string; bar: string }> = {
  meeting: { label: 'Meeting', chip: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500' },
  'at-risk': { label: 'At risk', chip: 'bg-amber-50 text-amber-800', bar: 'bg-amber-500' },
  breached: { label: 'Breached', chip: 'bg-rose-50 text-rose-700', bar: 'bg-rose-500' },
};

// ───────────────────────────── The six headline measures ─────────────────────

const money = (n: number) => `$${n.toFixed(n < 10 ? 4 : 2)}`;
const pct = (n: number) => `${n.toFixed(1)}%`;
const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/**
 * If the executive view carried only six numbers, these are the six. Each is
 * shown against a target so it is interpretable without a briefing, and each is
 * an outcome rather than an activity count — run volume alone does not evidence
 * value; accepted artifacts do.
 */
export const headlineKpis = (r: RunRollup, runs: ObservabilityRun[]): KpiReading[] => [
  {
    key: 'adoption',
    label: 'PDLC adoption',
    value: `${r.activeUsers} users`,
    target: '≥ 12 active',
    state: sloStateFor(r.activeUsers, 12),
    hint: 'Unique users running AI-assisted capabilities in the period.',
  },
  {
    key: 'outcomes',
    label: 'Successful outcomes',
    value: `${r.accepted} accepted`,
    target: `of ${r.runs} runs`,
    state: sloStateFor(r.runs === 0 ? 0 : (r.accepted / r.runs) * 100, 70),
    hint: 'Completed runs that produced an accepted artifact — not merely HTTP 200.',
  },
  {
    key: 'reliability',
    label: 'Success rate',
    value: pct(r.successRate),
    target: '≥ 97%',
    state: sloStateFor(r.successRate, 97),
    hint: 'Completed over finished runs. Tier-1 capabilities carry their own SLO.',
  },
  {
    key: 'cycle',
    label: 'Assisted cycle time',
    value: secs(r.p95Ms),
    target: 'p95 ≤ 45s',
    state: sloStateFor(r.p95Ms, 45_000, false),
    hint: 'Elapsed time from intent to artifact, at the 95th percentile.',
  },
  {
    key: 'unit-economics',
    label: 'Cost per accepted',
    value: money(r.costPerAcceptedUsd),
    target: '≤ $0.40',
    state: sloStateFor(r.costPerAcceptedUsd, 0.4, false),
    delta: `${money(r.costUsd)} total`,
    hint: 'Spend divided by artifacts someone actually kept.',
  },
  {
    key: 'risk',
    label: 'Operational risk',
    value: `${runs.filter((x) => x.status === 'failed' || x.status === 'partial').length} open`,
    target: '0 unowned',
    state: sloStateFor(
      runs.filter((x) => x.status === 'failed').length,
      0,
      false
    ),
    hint: 'Failed and partial runs, plus recurring failure modes and governance exceptions.',
  },
];

/**
 * Risks are ranked and owned rather than listed. An unranked exception feed makes
 * everything look equally urgent, which is the same as nothing being urgent.
 */
export const rankedRisks = (
  runs: ObservabilityRun[],
  executions: AgentExecution[],
  events: ObservabilityEvent[]
): RankedRisk[] => {
  const risks: RankedRisk[] = [];

  for (const r of runs.filter((x) => x.status === 'failed')) {
    risks.push({
      id: `fail-${r.id}`,
      severity: 'critical',
      title: `${r.capability} failed for ${r.departmentName}`,
      evidence: r.errorSummary ?? 'No error summary recorded.',
      owner: r.moduleName === 'spec_ai' ? 'AI engineering' : 'Platform engineering',
      runId: r.id,
    });
  }

  const deps = events.filter((e) => e.dependencyError);
  if (deps.length > 0) {
    const tool = deps[0].toolSlug ?? 'an upstream system';
    risks.push({
      id: 'dependency',
      severity: 'high',
      title: `${deps.length} dependency ${deps.length === 1 ? 'failure' : 'failures'} on ${tool}`,
      evidence: deps[0].dependencyError ?? '',
      owner: 'Platform engineering',
      runId: deps[0].observabilityRunId,
    });
  }

  const loops = runs.filter((r) => r.totalRetries >= 3);
  if (loops.length > 0)
    risks.push({
      id: 'retries',
      severity: 'high',
      title: `${loops.length} ${loops.length === 1 ? 'run' : 'runs'} looped three or more times`,
      evidence: 'Validation is rejecting first-pass output, so the loop cost is being paid twice.',
      owner: 'AI engineering',
      runId: loops[0].id,
    });

  const waiting = events.filter((e) => e.eventType === 'hitl_pause');
  if (waiting.length > 0) {
    const total = waiting.reduce((n, e) => n + e.durationMs, 0);
    risks.push({
      id: 'hitl',
      severity: 'medium',
      title: `${secs(total)} spent waiting on a human`,
      evidence: 'Counted separately from AI latency, so a slow approval never reads as a slow model.',
      owner: 'Operations',
      runId: waiting[0].observabilityRunId,
    });
  }

  const degraded = runs.filter((r) => r.payloadPolicy === 'metadata_only' || r.payloadPolicy === 'disabled');
  if (degraded.length > 0)
    risks.push({
      id: 'policy',
      severity: 'medium',
      title: `${degraded.length} ${degraded.length === 1 ? 'run' : 'runs'} captured without payloads`,
      evidence: `Department policy is ${PAYLOAD_POLICY_COPY[degraded[0].payloadPolicy].label.toLowerCase()}, so those runs cannot be replayed.`,
      owner: 'Governance',
      runId: degraded[0].id,
    });

  const order = { critical: 0, high: 1, medium: 2 };
  return risks.sort((a, b) => order[a.severity] - order[b.severity]);
};

export const SEVERITY_CHIP: Record<RankedRisk['severity'], string> = {
  critical: 'bg-rose-100 text-rose-700',
  high: 'bg-amber-100 text-amber-800',
  medium: 'bg-slate-100 text-slate-600',
};

// ───────────────────────────── Per-agent cost profile ─────────────────────────

export interface AgentProfile {
  agentName: string;
  invocations: number;
  attempts: number;
  costUsd: number;
  costPerInvocation: number;
  p95Ms: number;
  failureRate: number;
}

/** Makes the optimisation target obvious: cost per invocation, ranked. */
export const agentProfiles = (executions: AgentExecution[]): AgentProfile[] => {
  const byName = new Map<string, AgentExecution[]>();
  for (const e of executions) {
    const list = byName.get(e.agentName) ?? [];
    list.push(e);
    byName.set(e.agentName, list);
  }

  return [...byName.entries()]
    .map(([agentName, list]) => {
      const firstAttempts = list.filter((e) => e.attemptNumber === 1).length;
      const costUsd = list.reduce((n, e) => n + e.costUsd, 0);
      return {
        agentName,
        invocations: firstAttempts,
        attempts: list.length,
        costUsd,
        costPerInvocation: firstAttempts === 0 ? costUsd : costUsd / firstAttempts,
        p95Ms: percentile(
          list.map((e) => e.durationMs),
          95
        ),
        failureRate:
          list.length === 0 ? 0 : (list.filter((e) => e.status === 'failed').length / list.length) * 100,
      };
    })
    .sort((a, b) => b.costUsd - a.costUsd);
};

export const MODULE_LABELS: Record<string, string> = {
  spec_ai: 'Spec AI',
  proto_ai: 'Proto AI',
  code_iq: 'Code IQ',
  intelli_qa: 'IntelliQA',
  release_pulse: 'Release Pulse',
};

export const moduleLabel = (key: string): string => MODULE_LABELS[key] ?? key;

export const formatMoney = money;
export const formatPct = pct;
export const formatSecs = secs;
