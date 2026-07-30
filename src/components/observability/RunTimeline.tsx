import React, { useState } from 'react';
import { AgentExecution, ObservabilityEvent } from '../../types/observability';
import {
  EVENT_TYPES,
  PAYLOAD_POLICY_COPY,
  formatMoney,
  formatSecs,
  moduleLabel,
} from '../../data/observability';
import {
  AGENT_EXECUTIONS,
  OBSERVABILITY_EVENTS,
  OBSERVABILITY_RUNS,
} from '../../data/observabilityData';
import { Drill } from '../views/ObservabilityView';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Clock,
  GitBranch,
  RefreshCw,
  Rows3,
} from 'lucide-react';

const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${n}ms`);
const clockOf = (iso: string) => iso.slice(11, 23);

/** One event row inside an execution. */
const EventRow: React.FC<{
  event: ObservabilityEvent;
  onOpen: () => void;
}> = ({ event, onOpen }) => {
  const meta = EVENT_TYPES[event.eventType];

  const detail =
    event.eventType === 'llm_call'
      ? `${event.modelName} · ${event.promptVersionLabel ?? 'no prompt version'}`
      : event.eventType === 'tool_call'
      ? (event.toolSlug ?? '—')
      : event.eventType === 'state_transition'
      ? `${event.fromStep} → ${event.toStep}`
      : event.eventType === 'hitl_pause'
      ? (event.hitlReason ?? 'Waiting on a human')
      : event.eventType === 'cache_hit'
      ? `saved ${formatMoney(event.estimatedSavingsUsd ?? 0)}`
      : event.eventType === 'policy_decision'
      ? (event.policyDecision ?? '—')
      : event.eventType === 'evaluation'
      ? `${event.evaluationDimension} ${event.evaluationScore} / ${event.evaluationThreshold}`
      : event.eventType === 'artifact'
      ? `${event.artifactType} ${event.artifactVersion}`
      : (event.errorType ?? '—');

  return (
    <button
      onClick={onOpen}
      className="group flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white"
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${meta.chip}`}>
        {meta.label}
      </span>

      <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-slate-600">{detail}</span>

      {event.parallelGroupId && (
        <span
          title={`Ran concurrently — group ${event.parallelGroupId}`}
          className="flex shrink-0 items-center gap-0.5 rounded bg-violet-50 px-1 py-0.5 text-[8.5px] font-bold text-violet-700"
        >
          <Rows3 className="h-2.5 w-2.5" /> parallel
        </span>
      )}
      {(event.retryCount ?? 0) > 0 && (
        <span
          title="Provider-level retries inside this one logical call — not a workflow retry"
          className="shrink-0 rounded bg-amber-50 px-1 py-0.5 text-[8.5px] font-bold text-amber-800"
        >
          {event.retryCount}× provider retry
        </span>
      )}
      {event.status !== 'success' && (
        <span className="shrink-0 rounded bg-rose-50 px-1 py-0.5 text-[8.5px] font-bold text-rose-700">
          {event.status}
        </span>
      )}

      {event.costUsd !== undefined && event.costUsd > 0 && (
        <span className="shrink-0 font-mono text-[9.5px] text-slate-500">
          {formatMoney(event.costUsd)}
        </span>
      )}
      <span className="w-14 shrink-0 text-right font-mono text-[9.5px] text-slate-400">
        {ms(event.durationMs)}
      </span>
      <ArrowRight className="h-3 w-3 shrink-0 text-slate-200 group-hover:text-indigo-600" />
    </button>
  );
};

/**
 * L4 — the run timeline. The agent path, its retries and its parallel lanes, each
 * execution expandable into its events.
 *
 * Executions are ordered by start time rather than by a sequence number, because
 * there is no meaningful way to say which of two simultaneous agents is "step 3".
 * Concurrency is shown from the recorded parallel group, never inferred from
 * overlapping timestamps.
 */
export const RunTimeline: React.FC<{
  runId: string;
  from: Drill;
  onDrill: (d: Drill) => void;
}> = ({ runId, from, onDrill }) => {
  const run = OBSERVABILITY_RUNS.find((r) => r.id === runId);
  const executions = AGENT_EXECUTIONS.filter((e) => e.observabilityRunId === runId).sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt)
  );

  const [open, setOpen] = useState<string[]>(executions.slice(0, 1).map((e) => e.id));

  if (!run)
    return (
      <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-500">
        That run is not in the retained window.
      </p>
    );

  const toggle = (id: string) =>
    setOpen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const eventsFor = (executionId: string) =>
    OBSERVABILITY_EVENTS.filter((e) => e.agentExecutionId === executionId).sort((a, b) =>
      a.startedAt.localeCompare(b.startedAt)
    );

  /** Attempts above one mean the flow looped back into this agent. */
  const attemptsOf = (agentName: string) =>
    executions.filter((e) => e.agentName === agentName).length;

  return (
    <div className="space-y-4">
      {/* Run header — the stored totals, not a re-aggregation */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-mono text-sm font-extrabold text-slate-900">{run.runId}</h2>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-600">
                {run.environment}
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                  run.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700'
                    : run.status === 'failed'
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-amber-50 text-amber-800'
                }`}
              >
                {run.status}
              </span>
              {run.acceptanceStatus && (
                <span
                  title="Links the execution record to business value — the basis for cost per accepted artifact"
                  className={`cursor-help rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    run.acceptanceStatus === 'accepted'
                      ? 'bg-teal-50 text-teal-700'
                      : run.acceptanceStatus === 'rejected'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {run.acceptanceStatus}
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {moduleLabel(run.moduleName)} · {run.capability} · {run.userName} ·{' '}
              {run.projectName ?? '—'} · triggered by {run.triggerSource}
              {run.releaseVersion && ` · release ${run.releaseVersion}`}
            </p>
            <p className="mt-1 font-mono text-[9.5px] text-slate-400">
              trace {run.traceId} · capture {PAYLOAD_POLICY_COPY[run.payloadPolicy].label.toLowerCase()}
            </p>
          </div>

          <div className="grid shrink-0 grid-cols-3 gap-x-5 gap-y-1.5 text-right sm:grid-cols-6">
            {[
              ['Duration', formatSecs(run.durationMs)],
              ['Agents', String(run.totalAgents)],
              ['Model calls', String(run.totalLlmCalls)],
              ['Tool calls', String(run.totalToolCalls)],
              ['Retries', String(run.totalRetries)],
              ['Spend', formatMoney(run.totalCostUsd)],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  {label}
                </div>
                <div className="font-mono text-[12px] font-bold text-slate-900">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {run.errorSummary && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10.5px] leading-relaxed text-rose-900">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            {run.errorSummary}
          </p>
        )}
      </section>

      {/* Agent path */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Agent path</h2>
          <span className="text-[10px] text-slate-400">
            {executions.length} executions · ordered by start time
          </span>
        </div>

        <div className="mt-3 space-y-1.5">
          {executions.map((ex: AgentExecution) => {
            const isOpen = open.includes(ex.id);
            const events = eventsFor(ex.id);
            const looped = attemptsOf(ex.agentName) > 1;

            return (
              <div
                key={ex.id}
                style={{ marginLeft: ex.depth * 20 }}
                className={`overflow-hidden rounded-xl border ${
                  ex.status === 'failed' ? 'border-rose-200' : 'border-slate-200'
                }`}
              >
                <button
                  onClick={() => toggle(ex.id)}
                  className="flex w-full cursor-pointer items-center gap-2 bg-slate-50/70 px-2.5 py-2 text-left hover:bg-slate-100/70"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                  )}

                  <span className="min-w-0 truncate font-mono text-[11px] font-bold text-slate-800">
                    {ex.agentName}
                  </span>

                  {looped && (
                    <span
                      title="The flow re-entered this agent. Each pass is its own row, so loop cost stays visible."
                      className="flex shrink-0 items-center gap-0.5 rounded bg-amber-50 px-1 py-0.5 text-[8.5px] font-bold text-amber-800"
                    >
                      <RefreshCw className="h-2.5 w-2.5" /> attempt {ex.attemptNumber}
                    </span>
                  )}
                  {ex.parentExecutionId && (
                    <span
                      title="Spawned by the agent above it"
                      className="flex shrink-0 items-center gap-0.5 rounded bg-slate-100 px-1 py-0.5 text-[8.5px] font-bold text-slate-600"
                    >
                      <GitBranch className="h-2.5 w-2.5" /> sub-agent
                    </span>
                  )}
                  {ex.parallelGroupId && (
                    <span
                      title={`Ran concurrently with its siblings — group ${ex.parallelGroupId}`}
                      className="flex shrink-0 items-center gap-0.5 rounded bg-violet-50 px-1 py-0.5 text-[8.5px] font-bold text-violet-700"
                    >
                      <Rows3 className="h-2.5 w-2.5" /> parallel
                    </span>
                  )}
                  {ex.status === 'failed' && (
                    <span className="shrink-0 rounded bg-rose-50 px-1 py-0.5 text-[8.5px] font-bold text-rose-700">
                      failed
                    </span>
                  )}

                  <span className="ml-auto flex shrink-0 items-center gap-3">
                    <span className="hidden font-mono text-[9px] text-slate-400 sm:inline">
                      {clockOf(ex.startedAt)}
                    </span>
                    <span className="font-mono text-[9.5px] text-slate-500">
                      {ex.llmCallCount} llm · {ex.toolCallCount} tool
                    </span>
                    <span className="font-mono text-[10px] font-bold text-slate-700">
                      {formatMoney(ex.costUsd)}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[9.5px] text-slate-400">
                      <Clock className="h-2.5 w-2.5" />
                      {ms(ex.durationMs)}
                    </span>
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-200 bg-slate-50/40 p-1.5">
                    {(ex.inputSummary || ex.outputSummary || ex.qualityResult) && (
                      <div className="mb-1 space-y-0.5 px-2 py-1">
                        {ex.inputSummary && (
                          <p className="text-[10px] text-slate-500">
                            <span className="font-bold text-slate-400">in </span>
                            {ex.inputSummary}
                          </p>
                        )}
                        {ex.outputSummary && (
                          <p className="text-[10px] text-slate-500">
                            <span className="font-bold text-slate-400">out </span>
                            {ex.outputSummary}
                          </p>
                        )}
                        {ex.qualityResult && (
                          <p className="text-[10px] font-semibold text-teal-700">
                            {ex.qualityResult}
                          </p>
                        )}
                      </div>
                    )}

                    {events.length === 0 ? (
                      <p className="px-2 py-2 text-[10px] text-slate-400">
                        No events retained for this execution.
                      </p>
                    ) : (
                      events.map((e) => (
                        <EventRow
                          key={e.id}
                          event={e}
                          onOpen={() =>
                            onDrill({ level: 'L5', runId, eventId: e.id, from })
                          }
                        />
                      ))
                    )}

                    {ex.errorDetail && (
                      <p className="mt-1 rounded-lg bg-rose-50 px-2.5 py-1.5 font-mono text-[10px] leading-relaxed text-rose-800">
                        {ex.errorDetail}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-3 border-t border-slate-100 pt-2 text-[10px] leading-relaxed text-slate-400">
          Provider retries are attributes of a single call; a workflow retry creates a new attempt
          row. Conflating the two would make provider instability look like a prompt problem.
        </p>
      </section>
    </div>
  );
};
