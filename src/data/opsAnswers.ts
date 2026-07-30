import { OpsAnswer, ObservabilityEvent, ObservabilityRun, AgentExecution } from '../types/observability';
import {
  AGENT_EXECUTIONS,
  EVIDENCE_ACCESS_LOGS,
  OBSERVABILITY_EVENTS,
  PRIOR_WEEK_STATS,
} from './observabilityData';
import { formatMoney, formatPct, formatSecs, groupByModule, groupByTenant, rollup } from './observability';

const llmEvents = (events: ObservabilityEvent[], runIds: Set<string>) =>
  events.filter((e) => e.eventType === 'llm_call' && runIds.has(e.observabilityRunId));

const runIdsOf = (runs: ObservabilityRun[]) => new Set(runs.map((r) => r.id));

const errorRate = (runs: ObservabilityRun[]) => {
  const finished = runs.filter((r) => r.status !== 'running');
  if (finished.length === 0) return 0;
  return (finished.filter((r) => r.status === 'failed' || r.status === 'partial').length / finished.length) * 100;
};

/**
 * Answers the Reliability / Tenant / Drift / Security / Trends questions as
 * single readings derived from the scoped run + event set — not separate mock
 * KPIs that can drift from the timeline data.
 */
export const buildOpsAnswers = (
  runs: ObservabilityRun[],
  events: ObservabilityEvent[] = OBSERVABILITY_EVENTS,
  executions: AgentExecution[] = AGENT_EXECUTIONS
): OpsAnswer[] => {
  const runIds = runIdsOf(runs);
  const scopedEvents = events.filter((e) => runIds.has(e.observabilityRunId));
  const scopedExecs = executions.filter((e) => runIds.has(e.observabilityRunId));
  const llms = llmEvents(scopedEvents, runIds);
  const r = rollup(runs, scopedEvents);
  const answers: OpsAnswer[] = [];

  // ── Reliability / Ops ────────────────────────────────────────────────────

  const byAgentErrors = new Map<string, { fails: number; total: number; runId?: string }>();
  for (const ex of scopedExecs) {
    const cur = byAgentErrors.get(ex.agentName) ?? { fails: 0, total: 0 };
    cur.total += 1;
    if (ex.status === 'failed') {
      cur.fails += 1;
      cur.runId = ex.observabilityRunId;
    }
    byAgentErrors.set(ex.agentName, cur);
  }
  const worstAgent = [...byAgentErrors.entries()]
    .map(([name, v]) => ({ name, rate: v.total === 0 ? 0 : (v.fails / v.total) * 100, ...v }))
    .sort((a, b) => b.rate - a.rate)[0];

  answers.push({
    id: 'rel-error-rate',
    domain: 'reliability',
    question: 'What is the error rate per agent (spike detection)?',
    answer: worstAgent
      ? `${worstAgent.name}: ${formatPct(worstAgent.rate)} failed`
      : 'No agent failures in scope',
    detail: worstAgent
      ? `${worstAgent.fails}/${worstAgent.total} executions failed in the window.`
      : 'All scoped agent executions completed.',
    state: !worstAgent || worstAgent.rate === 0 ? 'meeting' : worstAgent.rate > 20 ? 'breached' : 'at-risk',
    runId: worstAgent?.runId,
  });

  const providerFails = new Map<string, number>();
  for (const e of llms.filter((x) => x.status === 'error' || x.status === 'timeout')) {
    const p = e.provider ?? 'unknown';
    providerFails.set(p, (providerFails.get(p) ?? 0) + 1);
  }
  const topProvider = [...providerFails.entries()].sort((a, b) => b[1] - a[1])[0];
  answers.push({
    id: 'rel-provider',
    domain: 'reliability',
    question: 'Which provider is failing most often right now?',
    answer: topProvider ? `${topProvider[0]} · ${topProvider[1]} failing call(s)` : 'No provider failures',
    detail: topProvider
      ? 'Counted from LLM events with error or timeout status in scope.'
      : 'Azure / OpenAI / Anthropic calls in this window all succeeded.',
    state: topProvider ? 'breached' : 'meeting',
  });

  const withTier = llms.filter((e) => e.fallbackTier !== undefined);
  const fb1 = withTier.filter((e) => e.fallbackTier === 1).length;
  const fb2 = withTier.filter((e) => e.fallbackTier === 2).length;
  const fbRate = withTier.length === 0 ? 0 : ((fb1 + fb2) / withTier.length) * 100;
  answers.push({
    id: 'rel-fallback',
    domain: 'reliability',
    question: 'What is the fallback hit rate (fallback_1 / fallback_2)?',
    answer: `${formatPct(fbRate)} · f1=${fb1} · f2=${fb2}`,
    detail:
      withTier.length === 0
        ? 'No LLM calls carry a fallback tier yet.'
        : `${fb1 + fb2} of ${withTier.length} LLM calls answered on a fallback model.`,
    state: fbRate > 15 ? 'breached' : fbRate > 5 ? 'at-risk' : 'meeting',
  });

  const slow = scopedExecs.filter((e) => e.durationMs > 30_000);
  const timeouts = scopedEvents.filter((e) => e.status === 'timeout');
  const slowSorted = [...slow].sort((a, b) => b.durationMs - a.durationMs);
  answers.push({
    id: 'rel-sla',
    domain: 'reliability',
    question: 'Are there agents that consistently timeout or take >30s?',
    answer:
      slow.length + timeouts.length === 0
        ? 'No SLA breakers in scope'
        : `${slow.length} slow exec · ${timeouts.length} timeout event(s)`,
    detail:
      slowSorted[0]
        ? `Slowest: ${slowSorted[0].agentName} at ${formatSecs(slowSorted[0].durationMs)}.`
        : timeouts[0]
        ? `Timeout on ${timeouts[0].modelName ?? timeouts[0].toolSlug ?? 'event'} · ${timeouts[0].errorDetail ?? ''}`
        : 'All executions finished under 30s.',
    state: slow.length + timeouts.length === 0 ? 'meeting' : 'breached',
    runId: slowSorted[0]?.observabilityRunId ?? timeouts[0]?.observabilityRunId,
  });

  const llmTotal = llms.length;
  const cached = scopedEvents.filter((e) => e.eventType === 'cache_hit').length;
  const cacheDenom = llmTotal + cached;
  const cacheHit = cacheDenom === 0 ? 0 : (cached / cacheDenom) * 100;
  answers.push({
    id: 'rel-cache',
    domain: 'reliability',
    question: 'What is the cache hit ratio?',
    answer: `${formatPct(cacheHit)} · ${formatMoney(r.cacheSavingsUsd)} saved`,
    detail: `${cached} cache hits vs ${llmTotal} LLM calls in scope.`,
    state: cacheHit >= 10 ? 'meeting' : cacheHit > 0 ? 'at-risk' : 'breached',
  });

  // ── Tenant / Business ────────────────────────────────────────────────────

  const tenants = groupByTenant(runs, scopedEvents).sort((a, b) => b.costUsd - a.costUsd);
  answers.push({
    id: 'ten-heavy',
    domain: 'tenant',
    question: 'Which tenants are the heaviest consumers this week?',
    answer: tenants[0]
      ? `${tenants[0].tenantName} · ${formatMoney(tenants[0].costUsd)}`
      : 'No spend in scope',
    detail: tenants
      .slice(0, 3)
      .map((t) => `${t.tenantName}: ${formatMoney(t.costUsd)} / ${t.tokens.toLocaleString()} tok`)
      .join(' · '),
    state: 'meeting',
    tenantId: tenants[0]?.tenantId,
  });

  const growth = tenants.map((t) => {
    const prior = PRIOR_WEEK_STATS[t.tenantId] ?? PRIOR_WEEK_STATS.platform;
    const delta = prior.tokens === 0 ? 0 : ((t.tokens - prior.tokens) / prior.tokens) * 100;
    return { ...t, growthPct: delta };
  }).sort((a, b) => b.growthPct - a.growthPct);
  answers.push({
    id: 'ten-growth',
    domain: 'tenant',
    question: "Which tenant's usage is growing fastest?",
    answer: growth[0]
      ? `${growth[0].tenantName} · ${growth[0].growthPct >= 0 ? '+' : ''}${growth[0].growthPct.toFixed(0)}% tok`
      : 'n/a',
    detail: 'Token volume vs prior-week baseline for the same tenant id.',
    state: growth[0] && growth[0].growthPct > 50 ? 'at-risk' : 'meeting',
    tenantId: growth[0]?.tenantId,
  });

  const rateLimited = runs.filter((r) => r.rateLimited);
  answers.push({
    id: 'ten-ratelimit',
    domain: 'tenant',
    question: 'Are there tenants hitting rate limits frequently?',
    answer:
      rateLimited.length === 0
        ? 'No rate-limit hits in scope'
        : `${rateLimited.length} run(s) · ${[...new Set(rateLimited.map((x) => x.tenantName))].join(', ')}`,
    detail: rateLimited[0]?.errorSummary ?? 'Connector/provider 429s flag the run.',
    state: rateLimited.length === 0 ? 'meeting' : 'breached',
    runId: rateLimited[0]?.id,
    tenantId: rateLimited[0]?.tenantId,
  });

  const storyRuns = runs.filter((r) => r.artifactUnitLabel === 'user_story' && (r.artifactUnits ?? 0) > 0);
  const testRuns = runs.filter((r) => r.artifactUnitLabel === 'test_case' && (r.artifactUnits ?? 0) > 0);
  const costPerStory =
    storyRuns.reduce((n, x) => n + x.totalCostUsd, 0) /
    Math.max(1, storyRuns.reduce((n, x) => n + (x.artifactUnits ?? 0), 0));
  const costPerTest =
    testRuns.length === 0
      ? 0
      : testRuns.reduce((n, x) => n + x.totalCostUsd, 0) /
        Math.max(1, testRuns.reduce((n, x) => n + (x.artifactUnits ?? 0), 0));
  answers.push({
    id: 'ten-unit-econ',
    domain: 'tenant',
    question: 'What is the cost per user story / test case generated?',
    answer: `Story ${formatMoney(costPerStory)} · Test ${testRuns.length ? formatMoney(costPerTest) : '—'}`,
    detail: `${storyRuns.reduce((n, x) => n + (x.artifactUnits ?? 0), 0)} stories · ${testRuns.reduce((n, x) => n + (x.artifactUnits ?? 0), 0)} tests attributed in scope.`,
    state: costPerStory <= 0.05 ? 'meeting' : 'at-risk',
  });

  // ── Agent behavior / Drift ───────────────────────────────────────────────

  const tokenByAgent = new Map<string, { inTok: number; outTok: number; retries: number; tools: number; calls: number }>();
  for (const ex of scopedExecs) {
    const cur = tokenByAgent.get(ex.agentName) ?? { inTok: 0, outTok: 0, retries: 0, tools: 0, calls: 0 };
    cur.inTok += ex.inputTokens;
    cur.outTok += ex.outputTokens;
    cur.retries += Math.max(0, ex.attemptNumber - 1);
    cur.tools += ex.toolCallCount;
    cur.calls += 1;
    tokenByAgent.set(ex.agentName, cur);
  }
  const verbose = [...tokenByAgent.entries()]
    .map(([name, v]) => ({ name, ratio: v.inTok === 0 ? 0 : v.outTok / v.inTok, ...v }))
    .sort((a, b) => b.ratio - a.ratio)[0];
  answers.push({
    id: 'drift-io-ratio',
    domain: 'drift',
    question: 'What is the average input-to-output token ratio per agent?',
    answer: verbose ? `${verbose.name}: out/in ${verbose.ratio.toFixed(2)}` : 'n/a',
    detail: verbose
      ? `${verbose.outTok.toLocaleString()} out / ${verbose.inTok.toLocaleString()} in across ${verbose.calls} executions.`
      : 'No executions in scope.',
    state: verbose && verbose.ratio > 0.4 ? 'at-risk' : 'meeting',
  });

  const heaviest = [...tokenByAgent.entries()].sort((a, b) => b[1].inTok + b[1].outTok - (a[1].inTok + a[1].outTok))[0];
  answers.push({
    id: 'drift-token-trend',
    domain: 'drift',
    question: "Is a particular agent's token consumption trending upward?",
    answer: heaviest
      ? `${heaviest[0]} leads at ${(heaviest[1].inTok + heaviest[1].outTok).toLocaleString()} tok`
      : 'n/a',
    detail: 'Prototype ranks current-window volume; wire time-series when event store ships daily buckets.',
    state: 'at-risk',
  });

  const zeroTool = scopedExecs.filter(
    (ex) => ex.toolCallCount === 0 && ex.llmCallCount > 0 && ex.status === 'completed'
  );
  answers.push({
    id: 'drift-zero-tools',
    domain: 'drift',
    question: 'Are there runs where the agent made zero tool calls when it should have?',
    answer: zeroTool.length === 0 ? 'None flagged' : `${zeroTool.length} execution(s) with LLM but no tools`,
    detail: zeroTool[0]
      ? `${zeroTool[0].agentName} on ${zeroTool[0].observabilityRunId} — possible logic regression.`
      : 'Every LLM-bearing execution also invoked a tool, or no candidates.',
    state: zeroTool.length === 0 ? 'meeting' : 'breached',
    runId: zeroTool[0]?.observabilityRunId,
  });

  const retryLead = [...tokenByAgent.entries()]
    .map(([name, v]) => ({ name, rate: v.calls === 0 ? 0 : (v.retries / v.calls) * 100 }))
    .sort((a, b) => b.rate - a.rate)[0];
  answers.push({
    id: 'drift-retry',
    domain: 'drift',
    question: 'Which agents have the highest retry rate?',
    answer: retryLead ? `${retryLead.name}: ${formatPct(retryLead.rate)}` : 'n/a',
    detail: 'Retries counted from attemptNumber > 1 on agent executions.',
    state: retryLead && retryLead.rate > 30 ? 'breached' : retryLead && retryLead.rate > 0 ? 'at-risk' : 'meeting',
  });

  // ── Security / Compliance ────────────────────────────────────────────────

  const sensitive = runs.filter((r) => (r.sensitiveMarkers?.length ?? 0) > 0);
  answers.push({
    id: 'sec-pii',
    domain: 'security',
    question: 'Who triggered runs containing sensitive data markers?',
    answer:
      sensitive.length === 0
        ? 'No marked runs'
        : sensitive.map((s) => `${s.userName} (${s.sensitiveMarkers?.join(', ')})`).join(' · '),
    detail: 'Markers are recorded on the run when capture policy detects PII/PHI spans.',
    state: sensitive.length === 0 ? 'meeting' : 'at-risk',
    runId: sensitive[0]?.id,
  });

  const access = EVIDENCE_ACCESS_LOGS.filter((l) => runIds.has(l.observabilityRunId));
  answers.push({
    id: 'sec-evidence',
    domain: 'security',
    question: 'Which users accessed which observability evidence?',
    answer: access.length === 0 ? 'No L5 views in scope' : `${access.length} access event(s)`,
    detail: access
      .slice(0, 3)
      .map((a) => `${a.viewerName} → ${a.action} on ${a.eventId}`)
      .join(' · '),
    state: 'meeting',
  });

  const oddHour = access.filter((a) => {
    const h = new Date(a.viewedAt).getUTCHours();
    return h < 6 || h >= 22;
  });
  const oddIp = runs.filter((r) => r.clientIp && !r.clientIp.startsWith('10.'));
  answers.push({
    id: 'sec-anomaly',
    domain: 'security',
    question: 'Are there runs from unexpected IP ranges or unusual hours?',
    answer: `${oddIp.length} external IP run(s) · ${oddHour.length} off-hours evidence view(s)`,
    detail: oddIp[0]
      ? `Example run IP ${oddIp[0].clientIp} · ${oddIp[0].tenantName}.`
      : 'Corporate 10.x ranges only, or no client IPs recorded.',
    state: oddIp.length + oddHour.length === 0 ? 'meeting' : 'at-risk',
    runId: oddIp[0]?.id,
  });

  // ── Cross-cutting / Trends ───────────────────────────────────────────────

  const scopeKey =
    runs.length > 0 && runs.every((x) => x.tenantId === runs[0].tenantId)
      ? runs[0].tenantId
      : 'platform';
  const prior = PRIOR_WEEK_STATS[scopeKey] ?? PRIOR_WEEK_STATS.platform;
  const thisErr = errorRate(runs);
  const costDelta = prior.costUsd === 0 ? 0 : ((r.costUsd - prior.costUsd) / prior.costUsd) * 100;
  answers.push({
    id: 'trend-wow',
    domain: 'trends',
    question: "How does this week's cost / latency / error rate compare to last week?",
    answer: `Cost ${costDelta >= 0 ? '+' : ''}${costDelta.toFixed(0)}% · err ${thisErr.toFixed(0)}% vs ${prior.errorRate}% · p95 ${formatSecs(r.p95Ms)} vs ${formatSecs(prior.p95Ms)}`,
    detail: `Prior week baseline (${scopeKey}): ${formatMoney(prior.costUsd)}, ${prior.runs} runs.`,
    state: costDelta > 20 || thisErr > prior.errorRate ? 'at-risk' : 'meeting',
  });

  const byPrompt = new Map<string, { cost: number; n: number; ok: number }>();
  for (const e of llms) {
    const key = e.promptVersionLabel ?? e.promptVersionId ?? 'unknown';
    const cur = byPrompt.get(key) ?? { cost: 0, n: 0, ok: 0 };
    cur.cost += e.costUsd ?? 0;
    cur.n += 1;
    if (e.status === 'success') cur.ok += 1;
    byPrompt.set(key, cur);
  }
  const prompts = [...byPrompt.entries()].sort((a, b) => b[1].n - a[1].n);
  answers.push({
    id: 'trend-prompt',
    domain: 'trends',
    question: 'What was the impact of deploying a prompt version?',
    answer: prompts[0]
      ? `${prompts[0][0]} · ${prompts[0][1].n} calls · ${formatMoney(prompts[0][1].cost)}`
      : 'No prompt versions in scope',
    detail: prompts
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${formatPct((v.ok / v.n) * 100)} success`)
      .join(' · '),
    state: 'meeting',
  });

  const modules = groupByModule(runs, scopedEvents).sort((a, b) => b.costUsd - a.costUsd);
  answers.push({
    id: 'trend-module-budget',
    domain: 'trends',
    question: 'Which module consumes the most LLM budget?',
    answer: modules[0]
      ? `${modules[0].moduleName} · ${formatMoney(modules[0].costUsd)}`
      : 'n/a',
    detail: modules.map((m) => `${m.moduleName}: ${formatMoney(m.costUsd)}`).join(' · '),
    state: 'meeting',
    moduleName: modules[0]?.moduleName,
  });

  // ── Must-answer debug / cost / perf samples ──────────────────────────────

  const sample = runs[0];
  if (sample) {
    const sampleExecs = scopedExecs
      .filter((e) => e.observabilityRunId === sample.id)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    answers.push({
      id: 'debug-path',
      domain: 'debug',
      question: 'Which agents ran during a given run, and in what order?',
      answer: sampleExecs.map((e) => e.agentName).join(' → ') || 'No executions',
      detail: `Run ${sample.runId} · ${sample.capability} · ${sample.status}`,
      state: sample.status === 'failed' ? 'breached' : 'meeting',
      runId: sample.id,
    });

    answers.push({
      id: 'debug-cost',
      domain: 'debug',
      question: 'What did this run cost?',
      answer: formatMoney(sample.totalCostUsd),
      detail: `${sample.totalInputTokens + sample.totalOutputTokens} tokens · ${sample.totalLlmCalls} LLM · ${sample.totalToolCalls} tools · policy ${sample.payloadPolicy}`,
      state: 'meeting',
      runId: sample.id,
    });
  }

  const bottleneck = [...scopedExecs].sort((a, b) => b.durationMs - a.durationMs)[0];
  answers.push({
    id: 'perf-bottleneck',
    domain: 'debug',
    question: 'Which step is the bottleneck in a given flow?',
    answer: bottleneck
      ? `${bottleneck.agentName} · ${formatSecs(bottleneck.durationMs)}`
      : 'n/a',
    detail: 'Longest agent execution duration in the scoped window.',
    state: bottleneck && bottleneck.durationMs > 30_000 ? 'breached' : 'meeting',
    runId: bottleneck?.observabilityRunId,
  });

  return answers;
};

export type OpsDomain = OpsAnswer['domain'];

export const OPS_DOMAIN_COPY: Record<
  OpsDomain,
  { label: string; blurb: string }
> = {
  reliability: {
    label: 'Reliability / Ops',
    blurb: 'Error spikes, provider health, fallbacks, SLA breakers, cache effectiveness.',
  },
  tenant: {
    label: 'Tenant / Business',
    blurb: 'Heavy consumers, growth, rate limits, unit economics per artifact.',
  },
  drift: {
    label: 'Agent behavior / Drift',
    blurb: 'Token bloat, I/O ratios, missing tool calls, fragile retry rates.',
  },
  security: {
    label: 'Security / Compliance',
    blurb: 'Sensitive markers, evidence access audit, IP and hour anomalies.',
  },
  trends: {
    label: 'Cross-cutting / Trends',
    blurb: 'Week-over-week, prompt-version impact, module budget share.',
  },
  debug: {
    label: 'Must-answer',
    blurb: 'Single-query debugging, cost, and performance paths into a run.',
  },
};
