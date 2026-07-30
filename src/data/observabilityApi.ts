import {
  BottleneckItem,
  CacheSavingsResponse,
  CostByAgentItem,
  CostByModuleItem,
  ErrorRateItem,
  FallbackRateResponse,
  PerfByAgentItem,
  PlatformAppMetrics,
  ProjectObservability,
  ProviderHealthItem,
  RetryRateResponse,
  RunSummaryResponse,
  SpanTimelineItem,
  TenantObservability,
  TokenTrendItem,
  ToolUsageResponse,
  TopConsumerItem,
} from '../types/observability';

// ────────────────────────── 1. Platform Metrics ──────────────────────────────

export const getPlatformAppMetrics = (): PlatformAppMetrics => ({
  total_tenants: 5,
  active_tenants: 4,
  total_users: 27,
  recent_auth_success: 186,
  recent_auth_failure: 4,
  recent_rate_limit_events: 2,
  recent_schema_provision_failures: 0,
});

export const getTenantObservability = (tenantId: string): TenantObservability => {
  const tenants: Record<string, TenantObservability> = {
    't-incedo': {
      tenant_id: 't-incedo',
      active_member_count: 8,
      project_count: 3,
      enabled_tool_count: 2,
      recent_session_count: 45,
      recent_run_count: 120,
      recent_run_failures: 5,
    },
    't-acme': {
      tenant_id: 't-acme',
      active_member_count: 12,
      project_count: 4,
      enabled_tool_count: 3,
      recent_session_count: 68,
      recent_run_count: 185,
      recent_run_failures: 8,
    },
    't-globex': {
      tenant_id: 't-globex',
      active_member_count: 5,
      project_count: 2,
      enabled_tool_count: 1,
      recent_session_count: 22,
      recent_run_count: 54,
      recent_run_failures: 2,
    },
    't-wayne': {
      tenant_id: 't-wayne',
      active_member_count: 6,
      project_count: 2,
      enabled_tool_count: 2,
      recent_session_count: 31,
      recent_run_count: 72,
      recent_run_failures: 3,
    },
  };
  return tenants[tenantId] ?? tenants['t-incedo'];
};

export const getProjectObservability = (
  _tenantId: string,
  projectId: string
): ProjectObservability => ({
  project_id: projectId,
  member_count: 4,
  members_by_role: { Developer: 2, QA: 1, PM: 1 },
  enabled_tool_count: 1,
  recent_session_count: 20,
  recent_run_count: 60,
  recent_run_failures: 2,
});

// ────────────────────────────── 4. Cost ──────────────────────────────────────

export const getCostByModule = (): CostByModuleItem[] => [
  { module: 'spec_ai', total_cost_usd: 0.482, run_count: 14, total_tokens: 285000 },
  { module: 'intelli_qa', total_cost_usd: 0.318, run_count: 9, total_tokens: 192000 },
  { module: 'code_iq', total_cost_usd: 0.245, run_count: 7, total_tokens: 150000 },
  { module: 'proto_ai', total_cost_usd: 0.156, run_count: 5, total_tokens: 98000 },
  { module: 'release_pulse', total_cost_usd: 0.089, run_count: 3, total_tokens: 52000 },
];

export const getCostByAgent = (): CostByAgentItem[] => [
  { agent_slug: 'prd_understanding', total_cost: 0.214, invocation_count: 18, avg_cost_per_call: 0.0119, total_tokens: 124000 },
  { agent_slug: 'test_case_generation', total_cost: 0.182, invocation_count: 16, avg_cost_per_call: 0.0114, total_tokens: 105000 },
  { agent_slug: 'story_generation', total_cost: 0.156, invocation_count: 12, avg_cost_per_call: 0.013, total_tokens: 91000 },
  { agent_slug: 'code_review', total_cost: 0.134, invocation_count: 10, avg_cost_per_call: 0.0134, total_tokens: 78000 },
  { agent_slug: 'module_decomposition', total_cost: 0.098, invocation_count: 8, avg_cost_per_call: 0.0123, total_tokens: 58000 },
  { agent_slug: 'prototype_scaffold', total_cost: 0.072, invocation_count: 6, avg_cost_per_call: 0.012, total_tokens: 43000 },
  { agent_slug: 'release_notes', total_cost: 0.045, invocation_count: 4, avg_cost_per_call: 0.0113, total_tokens: 26000 },
  { agent_slug: 'risk_assessment', total_cost: 0.038, invocation_count: 5, avg_cost_per_call: 0.0076, total_tokens: 22000 },
];

export const getCacheSavings = (): CacheSavingsResponse => ({
  total_llm_calls: 142,
  cached_calls: 28,
  cache_hit_rate_pct: 19.7,
  estimated_savings_usd: 0.068,
});

// ────────────────────────────── 5. Performance ───────────────────────────────

export const getPerfByAgent = (): PerfByAgentItem[] => [
  { agent_slug: 'prd_understanding', p50_ms: 4200, p95_ms: 7800, avg_ms: 4600, max_ms: 9200, call_count: 18 },
  { agent_slug: 'test_case_generation', p50_ms: 3200, p95_ms: 5800, avg_ms: 3500, max_ms: 6200, call_count: 16 },
  { agent_slug: 'story_generation', p50_ms: 5100, p95_ms: 8400, avg_ms: 5400, max_ms: 10100, call_count: 12 },
  { agent_slug: 'code_review', p50_ms: 2800, p95_ms: 4200, avg_ms: 3000, max_ms: 5100, call_count: 10 },
  { agent_slug: 'module_decomposition', p50_ms: 3600, p95_ms: 6100, avg_ms: 3900, max_ms: 7400, call_count: 8 },
  { agent_slug: 'prototype_scaffold', p50_ms: 6200, p95_ms: 11200, avg_ms: 6800, max_ms: 13500, call_count: 6 },
  { agent_slug: 'release_notes', p50_ms: 2100, p95_ms: 3400, avg_ms: 2300, max_ms: 4000, call_count: 4 },
  { agent_slug: 'risk_assessment', p50_ms: 1800, p95_ms: 2900, avg_ms: 1950, max_ms: 3200, call_count: 5 },
];

export const getRunBottleneck = (runId: string): BottleneckItem[] => [
  { span_id: `${runId}-s1`, name: 'story_generation', span_kind: 'llm', duration_ms: 8400, pct_of_total: 42.5 },
  { span_id: `${runId}-s2`, name: 'prd_understanding', span_kind: 'llm', duration_ms: 5800, pct_of_total: 29.3 },
  { span_id: `${runId}-s3`, name: 'module_decomposition', span_kind: 'llm', duration_ms: 3200, pct_of_total: 16.2 },
];

// ────────────────────────────── 6. Reliability ───────────────────────────────

export const getErrorRate = (): ErrorRateItem[] => [
  { agent_slug: 'prd_understanding', total_calls: 18, error_count: 1, error_rate_pct: 5.56 },
  { agent_slug: 'test_case_generation', total_calls: 16, error_count: 1, error_rate_pct: 6.25 },
  { agent_slug: 'story_generation', total_calls: 12, error_count: 0, error_rate_pct: 0.0 },
  { agent_slug: 'code_review', total_calls: 10, error_count: 0, error_rate_pct: 0.0 },
  { agent_slug: 'module_decomposition', total_calls: 8, error_count: 0, error_rate_pct: 0.0 },
  { agent_slug: 'prototype_scaffold', total_calls: 6, error_count: 1, error_rate_pct: 16.67 },
  { agent_slug: 'release_notes', total_calls: 4, error_count: 0, error_rate_pct: 0.0 },
  { agent_slug: 'risk_assessment', total_calls: 5, error_count: 0, error_rate_pct: 0.0 },
];

export const getProviderHealth = (): ProviderHealthItem[] => [
  { provider: 'azure', total_calls: 86, error_count: 1, error_rate_pct: 1.16, avg_latency_ms: 3800 },
  { provider: 'openai', total_calls: 42, error_count: 1, error_rate_pct: 2.38, avg_latency_ms: 4200 },
  { provider: 'anthropic', total_calls: 14, error_count: 0, error_rate_pct: 0.0, avg_latency_ms: 3100 },
];

export const getFallbackRate = (): FallbackRateResponse => ({
  total_llm_calls: 142,
  fallback_hits: 3,
  fallback_rate_pct: 2.11,
  by_agent: [
    { agent_slug: 'prd_understanding', fallback_count: 1 },
    { agent_slug: 'test_case_generation', fallback_count: 1 },
    { agent_slug: 'prototype_scaffold', fallback_count: 1 },
    { agent_slug: 'story_generation', fallback_count: 0 },
    { agent_slug: 'code_review', fallback_count: 0 },
    { agent_slug: 'module_decomposition', fallback_count: 0 },
    { agent_slug: 'release_notes', fallback_count: 0 },
    { agent_slug: 'risk_assessment', fallback_count: 0 },
  ],
});

// ─────────────────────── 7. Tenant (Super-Admin) ─────────────────────────────

export const getTopConsumers = (): TopConsumerItem[] => [
  { tenant_id: 't-acme', tenant_schema: 'tenant_acme', total_cost_usd: 1.48, run_count: 185, total_tokens: 620000 },
  { tenant_id: 't-incedo', tenant_schema: 'tenant_incedo', total_cost_usd: 1.12, run_count: 120, total_tokens: 480000 },
  { tenant_id: 't-wayne', tenant_schema: 'tenant_wayne', total_cost_usd: 0.74, run_count: 72, total_tokens: 310000 },
  { tenant_id: 't-globex', tenant_schema: 'tenant_globex', total_cost_usd: 0.52, run_count: 54, total_tokens: 225000 },
];

// ────────────────────────── 8. Agent Behavior ────────────────────────────────

export const getTokenTrend = (slug: string): TokenTrendItem[] => {
  const base: Record<string, { input: number; output: number }> = {
    prd_understanding: { input: 3800, output: 2600 },
    test_case_generation: { input: 3200, output: 2100 },
    story_generation: { input: 4100, output: 3400 },
    code_review: { input: 2900, output: 1800 },
    module_decomposition: { input: 3400, output: 2200 },
    prototype_scaffold: { input: 4800, output: 3900 },
    release_notes: { input: 2200, output: 1600 },
    risk_assessment: { input: 1900, output: 1400 },
  };
  const { input, output } = base[slug] ?? { input: 3000, output: 2000 };

  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date('2026-07-17');
    d.setDate(d.getDate() + i);
    const jitter = 0.85 + Math.random() * 0.3;
    const avgInput = Math.round(input * jitter);
    const avgOutput = Math.round(output * jitter);
    return {
      period: d.toISOString().slice(0, 10),
      avg_tokens: avgInput + avgOutput,
      avg_input: avgInput,
      avg_output: avgOutput,
      call_count: Math.round(3 + Math.random() * 5),
    };
  });
};

export const getToolUsage = (slug: string): ToolUsageResponse => {
  const usages: Record<string, ToolUsageResponse> = {
    prd_understanding: {
      avg_tool_calls_per_run: 8.4,
      tool_breakdown: [
        { tool_name: 'read_file', call_count: 42, avg_duration_ms: 8 },
        { tool_name: 'search_documents', call_count: 28, avg_duration_ms: 45 },
        { tool_name: 'extract_entities', call_count: 18, avg_duration_ms: 22 },
      ],
    },
    test_case_generation: {
      avg_tool_calls_per_run: 15.2,
      tool_breakdown: [
        { tool_name: 'write_file', call_count: 48, avg_duration_ms: 12 },
        { tool_name: 'read_file', call_count: 32, avg_duration_ms: 8 },
        { tool_name: 'validate_schema', call_count: 24, avg_duration_ms: 35 },
        { tool_name: 'jira_create_issue', call_count: 16, avg_duration_ms: 180 },
      ],
    },
    story_generation: {
      avg_tool_calls_per_run: 12.6,
      tool_breakdown: [
        { tool_name: 'write_file', call_count: 36, avg_duration_ms: 11 },
        { tool_name: 'read_file', call_count: 28, avg_duration_ms: 7 },
        { tool_name: 'jira_create_issue', call_count: 14, avg_duration_ms: 195 },
      ],
    },
    code_review: {
      avg_tool_calls_per_run: 6.8,
      tool_breakdown: [
        { tool_name: 'read_file', call_count: 38, avg_duration_ms: 9 },
        { tool_name: 'git_diff', call_count: 12, avg_duration_ms: 52 },
        { tool_name: 'lint_check', call_count: 10, avg_duration_ms: 88 },
      ],
    },
  };
  return usages[slug] ?? {
    avg_tool_calls_per_run: 5.0,
    tool_breakdown: [
      { tool_name: 'read_file', call_count: 20, avg_duration_ms: 8 },
      { tool_name: 'write_file', call_count: 12, avg_duration_ms: 11 },
    ],
  };
};

export const getRetryRate = (slug: string): RetryRateResponse => {
  const rates: Record<string, RetryRateResponse> = {
    prd_understanding: { total_calls: 18, retried_calls: 2, retry_rate_pct: 11.1, max_attempts_seen: 2 },
    test_case_generation: { total_calls: 16, retried_calls: 1, retry_rate_pct: 6.25, max_attempts_seen: 2 },
    story_generation: { total_calls: 12, retried_calls: 0, retry_rate_pct: 0.0, max_attempts_seen: 1 },
    code_review: { total_calls: 10, retried_calls: 0, retry_rate_pct: 0.0, max_attempts_seen: 1 },
    prototype_scaffold: { total_calls: 6, retried_calls: 2, retry_rate_pct: 33.3, max_attempts_seen: 3 },
    module_decomposition: { total_calls: 8, retried_calls: 1, retry_rate_pct: 12.5, max_attempts_seen: 2 },
    release_notes: { total_calls: 4, retried_calls: 0, retry_rate_pct: 0.0, max_attempts_seen: 1 },
    risk_assessment: { total_calls: 5, retried_calls: 0, retry_rate_pct: 0.0, max_attempts_seen: 1 },
  };
  return rates[slug] ?? { total_calls: 10, retried_calls: 0, retry_rate_pct: 0.0, max_attempts_seen: 1 };
};

// ────────────────────────────── 3. Debugging ─────────────────────────────────

export const getRunSummary = (runId: string): RunSummaryResponse => ({
  id: runId,
  module: 'intelli_qa',
  capability: 'test_case_generation',
  entry_agent: 'test_case_generation',
  status: 'completed',
  started_at: '2026-07-30T12:49:23+00:00',
  completed_at: '2026-07-30T12:50:05+00:00',
  duration_ms: 42000,
  total_agents: 1,
  total_llm_calls: 8,
  total_tool_calls: 15,
  total_input_tokens: 24000,
  total_output_tokens: 18000,
  total_cost_usd: 0.035,
  cached_llm_calls: 2,
  error_summary: null,
});

export const getRunTimeline = (runId: string): SpanTimelineItem[] => [
  {
    span_id: `${runId}-span-1`,
    parent_span_id: null,
    span_kind: 'llm',
    name: 'test_case_generation',
    agent_id: 'agent-tcg-001',
    status: 'ok',
    attempt_number: 1,
    started_at: '2026-07-30T12:49:27+00:00',
    completed_at: '2026-07-30T12:49:31+00:00',
    duration_ms: 3800,
    error_type: null,
    error_detail: null,
    model_served: 'gpt-5.2',
    provider: 'azure',
    cost_usd: 0.0042,
  },
  {
    span_id: `${runId}-span-2`,
    parent_span_id: `${runId}-span-1`,
    span_kind: 'tool',
    name: 'write_file',
    agent_id: 'agent-tcg-001',
    status: 'ok',
    attempt_number: 1,
    started_at: '2026-07-30T12:49:31+00:00',
    completed_at: '2026-07-30T12:49:31+00:00',
    duration_ms: 12,
    error_type: null,
    error_detail: null,
    model_served: '',
    provider: '',
    cost_usd: 0,
  },
  {
    span_id: `${runId}-span-3`,
    parent_span_id: null,
    span_kind: 'llm',
    name: 'test_case_generation',
    agent_id: 'agent-tcg-001',
    status: 'ok',
    attempt_number: 1,
    started_at: '2026-07-30T12:49:32+00:00',
    completed_at: '2026-07-30T12:49:36+00:00',
    duration_ms: 4200,
    error_type: null,
    error_detail: null,
    model_served: 'gpt-5.2',
    provider: 'azure',
    cost_usd: 0.0051,
  },
  {
    span_id: `${runId}-span-4`,
    parent_span_id: null,
    span_kind: 'llm',
    name: 'test_case_generation',
    agent_id: 'agent-tcg-001',
    status: 'ok',
    attempt_number: 1,
    started_at: '2026-07-30T12:49:37+00:00',
    completed_at: '2026-07-30T12:49:40+00:00',
    duration_ms: 3100,
    error_type: null,
    error_detail: null,
    model_served: 'gpt-5.2',
    provider: 'azure',
    cost_usd: 0.0038,
  },
  {
    span_id: `${runId}-span-5`,
    parent_span_id: `${runId}-span-4`,
    span_kind: 'tool',
    name: 'validate_schema',
    agent_id: 'agent-tcg-001',
    status: 'ok',
    attempt_number: 1,
    started_at: '2026-07-30T12:49:40+00:00',
    completed_at: '2026-07-30T12:49:40+00:00',
    duration_ms: 35,
    error_type: null,
    error_detail: null,
    model_served: '',
    provider: '',
    cost_usd: 0,
  },
  {
    span_id: `${runId}-span-6`,
    parent_span_id: null,
    span_kind: 'llm',
    name: 'test_case_generation',
    agent_id: 'agent-tcg-001',
    status: 'ok',
    attempt_number: 1,
    started_at: '2026-07-30T12:49:41+00:00',
    completed_at: '2026-07-30T12:49:45+00:00',
    duration_ms: 4400,
    error_type: null,
    error_detail: null,
    model_served: 'gpt-5.2',
    provider: 'azure',
    cost_usd: 0.0055,
  },
];

// ──────────────── Utility: list of known agent slugs for UI pickers ──────────

export const AGENT_SLUGS = [
  'prd_understanding',
  'test_case_generation',
  'story_generation',
  'code_review',
  'module_decomposition',
  'prototype_scaffold',
  'release_notes',
  'risk_assessment',
] as const;

export type AgentSlug = (typeof AGENT_SLUGS)[number];
