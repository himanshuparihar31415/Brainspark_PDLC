import React from 'react';
import {
  EVENT_TYPES,
  PAYLOAD_POLICY_COPY,
  computeCostUsd,
  formatMoney,
  priceAt,
} from '../../data/observability';
import { MODEL_CATALOG, OBSERVABILITY_EVENTS } from '../../data/observabilityData';
import { ArrowLeft, Lock, ShieldAlert } from 'lucide-react';

const Row: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex items-start justify-between gap-3 border-b border-dashed border-slate-200 py-2 last:border-0">
    <span className="shrink-0 text-[10.5px] text-slate-500">{label}</span>
    <span
      className={`min-w-0 text-right text-[10.5px] font-bold text-slate-900 ${
        mono ? 'font-mono' : ''
      }`}
    >
      {value}
    </span>
  </div>
);

/**
 * L5 — event evidence. The deepest level, and the only one where prompt and
 * response content appears at all.
 *
 * Two independent gates decide what is shown: the tenant's capture policy, which
 * decided whether content was ever written; and the viewer's payload right, which
 * decides whether they may read what was written. Reaching this screen satisfies
 * neither on its own.
 */
export const EventEvidence: React.FC<{
  eventId: string;
  mayReadPayloads: boolean;
  onBack: () => void;
}> = ({ eventId, mayReadPayloads, onBack }) => {
  const event = OBSERVABILITY_EVENTS.find((e) => e.id === eventId);

  if (!event)
    return (
      <p className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-xs text-slate-500">
        That event is outside the payload retention window.
      </p>
    );

  const meta = EVENT_TYPES[event.eventType];
  const hasContent = Boolean(event.inputPayload || event.outputPayload || event.toolInput);

  /* Cost is re-derived from the catalog row in force when the call ran, which is how
     a historical figure stays reproducible after a price change. */
  const price =
    event.modelName && priceAt(MODEL_CATALOG, event.modelName, event.startedAt);

  /* Recompute from the catalog and compare. An observability system that cannot
     observe itself degrades silently, so roll-up integrity is shown rather than
     assumed. */
  const recomputed =
    event.modelName && event.inputTokens !== undefined && event.outputTokens !== undefined
      ? computeCostUsd(
          MODEL_CATALOG,
          event.modelName,
          event.startedAt,
          event.inputTokens,
          event.outputTokens
        )
      : undefined;
  const drifted =
    recomputed !== undefined &&
    event.costUsd !== undefined &&
    Math.abs(recomputed - event.costUsd) > 0.0005;

  const Payload: React.FC<{ title: string; body?: string }> = ({ title, body }) => {
    if (!body) return null;
    return (
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{title}</div>
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50/70 p-3 font-mono text-[10px] leading-relaxed text-slate-700">
          {body}
        </pre>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex cursor-pointer items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:underline"
      >
        <ArrowLeft className="h-3 w-3" /> Back to the run timeline
      </button>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Evidence */}
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${meta.chip}`}>
              {meta.label}
            </span>
            <span className="font-mono text-[10px] text-slate-400">{event.id}</span>
            <span
              className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold ${
                event.status === 'success'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {event.status}
            </span>
          </div>

          <p className="text-[10.5px] leading-relaxed text-slate-500">{meta.evidence}</p>

          {/* Content, subject to both gates */}
          {!hasContent ? (
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <Lock className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
              <p className="text-[10.5px] leading-relaxed text-slate-600">
                <b>No content was captured.</b> Policy in force was{' '}
                {PAYLOAD_POLICY_COPY[event.payloadPolicy].label.toLowerCase()} —{' '}
                {PAYLOAD_POLICY_COPY[event.payloadPolicy].hint} This is a policy decision, not a gap
                in capture.
              </p>
            </div>
          ) : !mayReadPayloads ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0 text-amber-700" />
              <p className="text-[10.5px] leading-relaxed text-amber-900">
                <b>Content withheld from your role.</b> This event has{' '}
                {PAYLOAD_POLICY_COPY[event.payloadPolicy].label.toLowerCase()} content on record, and
                reaching this screen does not grant the right to read it. Token accounting, timings
                and lineage remain visible below.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <Payload title="Input" body={event.inputPayload} />
              <Payload title="Output" body={event.outputPayload} />
              <Payload title="Tool input" body={event.toolInput} />
              <Payload title="Tool output" body={event.toolOutput} />
              {event.payloadReference && (
                <p className="font-mono text-[9.5px] text-slate-400">
                  Full content: {event.payloadReference}
                </p>
              )}
            </div>
          )}

          {(event.errorDetail || event.dependencyError) && (
            <div className="space-y-1.5 rounded-xl border border-rose-200 bg-rose-50 p-3">
              {event.dependencyError && (
                <p className="text-[10.5px] leading-relaxed text-rose-900">
                  <b>Upstream: </b>
                  <span className="font-mono">{event.dependencyError}</span>
                </p>
              )}
              {event.errorDetail && (
                <p className="text-[10.5px] leading-relaxed text-rose-900">
                  <b>{event.errorType}: </b>
                  <span className="font-mono">{event.errorDetail}</span>
                </p>
              )}
              {event.dependencyError && (
                <p className="text-[9.5px] leading-relaxed text-rose-700">
                  Recorded as a dependency failure rather than an internal fault, so upstream
                  instability is not counted against our own reliability.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Accounting and lineage — visible whatever the payload right */}
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Accounting</h2>
            <div className="mt-1.5">
              <Row label="Emitted by" value={event.sourceComponent} />
              <Row label="Started" value={event.startedAt.slice(11, 23)} mono />
              <Row label="Duration" value={`${event.durationMs} ms`} mono />
              {event.inputTokens !== undefined && (
                <Row label="Input tokens" value={event.inputTokens.toLocaleString()} mono />
              )}
              {event.outputTokens !== undefined && (
                <Row label="Output tokens" value={event.outputTokens.toLocaleString()} mono />
              )}
              {event.costUsd !== undefined && (
                <Row label="Cost as stored" value={formatMoney(event.costUsd)} mono />
              )}
              {recomputed !== undefined && (
                <Row
                  label="Recomputed"
                  value={
                    <span className={drifted ? 'text-amber-700' : 'text-slate-900'}>
                      {formatMoney(recomputed)}
                      {drifted && ' — drift'}
                    </span>
                  }
                  mono
                />
              )}
              {event.wasCached !== undefined && (
                <Row label="Served from cache" value={event.wasCached ? 'yes' : 'no'} />
              )}
              {event.retryCount !== undefined && (
                <Row label="Provider retries" value={String(event.retryCount)} mono />
              )}
              {event.estimatedSavingsUsd !== undefined && (
                <Row label="Avoided spend" value={formatMoney(event.estimatedSavingsUsd)} mono />
              )}
            </div>
          </section>

          {event.eventType === 'llm_call' && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
                AI configuration
              </h2>
              <p className="mt-0.5 text-[10.5px] text-slate-500">
                What produced this output, so a regression traces to a change.
              </p>
              <div className="mt-1.5">
                <Row label="Model" value={event.modelName ?? '—'} mono />
                <Row label="Provider" value={event.provider ?? '—'} />
                <Row label="Prompt version" value={event.promptVersionLabel ?? '—'} mono />
                <Row label="Prompt fingerprint" value={event.systemPromptHash ?? '—'} mono />
                {event.modelParams && (
                  <Row
                    label="Parameters"
                    value={Object.entries(event.modelParams)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(' · ')}
                    mono
                  />
                )}
                {price && (
                  <Row
                    label="Priced at"
                    value={`$${price.inputCostPer1k}/$${price.outputCostPer1k} per 1k`}
                    mono
                  />
                )}
              </div>
              {price && (
                <p className="mt-2 text-[9.5px] leading-relaxed text-slate-400">
                  Priced against the catalog row effective {price.effectiveFrom}
                  {price.effectiveTo ? ` to ${price.effectiveTo}` : ' onward'}, so this figure does
                  not move when pricing changes.
                </p>
              )}
            </section>
          )}

          {event.eventType === 'hitl_pause' && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-sm font-extrabold tracking-tight text-amber-900">
                Waiting on a human
              </h2>
              <div className="mt-1.5 space-y-1 text-[10.5px] leading-relaxed text-amber-900">
                <p>{event.hitlReason}</p>
                <p>
                  <b>Approver: </b>
                  {event.hitlApproverRole}
                </p>
                <p>
                  <b>Resolution: </b>
                  {event.hitlResolution}
                </p>
              </div>
              <p className="mt-2 text-[9.5px] leading-relaxed text-amber-800">
                Counted separately from AI latency. Without this, waiting-for-a-human time would be
                indistinguishable from a slow model.
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};
