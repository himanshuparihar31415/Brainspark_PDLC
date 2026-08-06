import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { SpecAiState } from '../../types/specai';
import { stageGateWarnings } from '../../data/specai';
import {
  DELTA,
  DELTA_AREAS,
  currentState,
  deltaImpact,
  proposedState,
  scopeItems,
} from '../../data/specDelta';
import { AUTHORITY_COPY, reconcile } from '../../data/specSystemModel';
import { codeImpact, jiraImpact } from '../../data/specImpact';

/**
 * The specification, compiled.
 *
 * Nothing here is authored separately — every section is a rendering of the
 * delta, the reconciliation or the graph. That is the point: a document written
 * alongside the model can disagree with it, and a specification that disagrees
 * with itself is worse than no specification.
 *
 * It opens on Finalize rather than appearing as a card in the thread, because
 * approving a specification is a considered act and a chat bubble is the wrong
 * shape for reading eighteen sections.
 */

const Section: React.FC<{
  n: number;
  title: string;
  meta?: string;
  children: React.ReactNode;
}> = ({ n, title, meta, children }) => (
  <section className="doc-s">
    <h3>
      <span className="doc-n">{n}</span>
      {title}
      {meta && <em>{meta}</em>}
    </h3>
    {children}
  </section>
);

export const SpecDocument: React.FC<{
  state: SpecAiState;
  decided: string[];
  onApprove: () => void;
  onClose: () => void;
  onDiscuss: (question: string) => void;
}> = ({ state, decided, onApprove, onClose, onDiscuss }) => {
  const warnings = stageGateWarnings('knowledge', state);
  const readings = reconcile();
  const drifts = readings.filter((r) => r.drift);
  const current = currentState();
  const proposed = proposedState(decided);
  const impact = deltaImpact();
  const epic = jiraImpact();
  const repos = codeImpact();
  const scope = scopeItems();
  const blocked = DELTA.filter((d) => d.blockedBy);

  const verified = readings.filter((r) => r.by.verified).length;
  const unverifiable = readings.filter((r) => !r.verifiable).length;

  const byArea = DELTA_AREAS.map((area) => ({
    area,
    lines: DELTA.filter((d) => d.area === area),
  })).filter((g) => g.lines.length > 0);

  return (
    <div className="doc-overlay" onClick={onClose}>
      <div className="doc" onClick={(e) => e.stopPropagation()}>
        <header className="doc-head">
          <div>
            <span className="doc-eyebrow">Implementation specification</span>
            <h2>{state.problemStatement.slice(0, 90) || 'Untitled'}</h2>
          </div>
          <button className="doc-x" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="doc-body">
          {/* What is being carried forward, stated before anything is approved. */}
          {warnings.length > 0 ? (
            <div className="doc-warn">
              <AlertTriangle size={13} />
              <div>
                <b>{warnings.length} unresolved</b> — approving carries these forward, and the
                lock records them.
                <ul>
                  {warnings.slice(0, 4).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                  {warnings.length > 4 && <li>and {warnings.length - 4} more</li>}
                </ul>
              </div>
            </div>
          ) : (
            <div className="doc-ok">
              <Check size={13} /> Nothing outstanding.
            </div>
          )}

          <Section n={1} title="Objective">
            <p>{state.problemStatement || 'No problem statement recorded.'}</p>
          </Section>

          <Section n={2} title="Scope" meta={`${scope.length} components`}>
            <div className="doc-chips">
              {scope.slice(0, 14).map((s) => (
                <span key={s.node.id}>
                  {s.node.label}
                  <i>{Math.round(s.relevance * 100)}%</i>
                </span>
              ))}
            </div>
            <p className="doc-note">
              Out of scope: everything not listed. The OAuth gateway is retained unchanged.
            </p>
          </Section>

          <Section n={3} title="Current behaviour" meta="reconciled from your systems">
            <ul className="doc-list">
              {current.map((c) => (
                <li key={c.text}>
                  {c.text}
                  {c.reading && (
                    <span className={`doc-conf ${c.reading.drift ? 'drift' : ''}`}>
                      {c.reading.drift
                        ? 'sources disagree'
                        : `${Math.round(c.reading.confidence * 100)}%`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          <Section n={4} title="Proposed behaviour">
            <ul className="doc-list">
              {proposed.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Section>

          <Section n={5} title="Implementation delta" meta={`${DELTA.length} changes`}>
            {byArea.map((g) => (
              <div className="doc-area" key={g.area}>
                <h4>{g.area}</h4>
                <ul className="doc-list">
                  {g.lines.map((d) => (
                    <li key={d.id}>
                      <span className={`doc-k ${d.kind}`}>{d.kind}</span>
                      {d.text}
                      {d.blockedBy && <span className="doc-conf drift">blocked</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>

          <Section n={6} title="Reconciled facts" meta={`${verified} verified · ${unverifiable} unverifiable`}>
            {readings.map((r) => (
              <div className="doc-fact" key={`${r.nodeId}-${r.property}`}>
                <div className="doc-fh">
                  {r.property}
                  <span className={`doc-conf ${r.drift ? 'drift' : ''}`}>
                    {Math.round(r.confidence * 100)}%
                  </span>
                </div>
                {(['verified', 'observed', 'intended', 'permitted'] as const).map((a) =>
                  r.by[a] ? (
                    <div className="doc-fr" key={a}>
                      <span className={`auth ${a}`}>{AUTHORITY_COPY[a].label}</span>
                      <span>{r.by[a]!.value}</span>
                      <em>{r.by[a]!.locator}</em>
                    </div>
                  ) : null
                )}
                {!r.verifiable && (
                  <div className="doc-unver">No test or contract can falsify this.</div>
                )}
              </div>
            ))}
          </Section>

          <Section n={7} title="Decisions required" meta={`${drifts.length + blocked.length}`}>
            {drifts.length + blocked.length === 0 ? (
              <p className="doc-note">None outstanding.</p>
            ) : (
              <ul className="doc-list">
                {drifts.map((r) => (
                  <li key={r.property}>
                    <b>{r.property}</b> — {r.decision}
                    <button className="doc-link" onClick={() => onDiscuss(r.decision!)}>
                      discuss
                    </button>
                  </li>
                ))}
                {blocked.map((d) => (
                  <li key={d.id}>
                    <b>{d.area}</b> — {d.blockedBy}
                    <button className="doc-link" onClick={() => onDiscuss(d.blockedBy!)}>
                      discuss
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section n={8} title="Change impact" meta={`${impact.direct.length} direct`}>
            <p className="doc-note">
              {impact.direct.length} components directly, {impact.inferred.length} one hop out,{' '}
              {impact.potential.length} further.
            </p>
            <div className="doc-two">
              <div>
                <h4>
                  {epic.key} {epic.title}
                </h4>
                <ul className="doc-list tight">
                  {epic.stories.map((st) => (
                    <li key={st.key}>
                      <code>{st.key}</code> {st.title}
                      <span className="doc-conf">{st.tasks.length} tasks</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Repositories</h4>
                <ul className="doc-list tight">
                  {repos.map((r) => (
                    <li key={r.repo}>
                      <code>{r.repo}</code>
                      <span className="doc-conf">{r.modules.length} files</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section n={9} title="Test requirements">
            <ul className="doc-list">
              {DELTA.filter((d) => d.area === 'Test').map((d) => (
                <li key={d.id}>{d.text}</li>
              ))}
              <li>Regression across the existing OAuth and PIN suites, which this change routes around.</li>
              <li>Failure paths: biometric unavailable, revoked device, hardware not enrolled.</li>
            </ul>
          </Section>

          <Section n={10} title="Rollout and rollback">
            <ul className="doc-list">
              <li>Behind a per-tenant flag, enabled for internal devices first.</li>
              <li>PIN fallback stays wired throughout, so rollback is a flag flip rather than a deploy.</li>
              <li>Schema change is additive — no destructive migration to reverse.</li>
            </ul>
          </Section>
        </div>

        <footer className="doc-foot">
          <span className="doc-fmeta">
            {DELTA.length} changes · {impact.direct.length} components · {verified} verified facts
            {warnings.length > 0 && ` · ${warnings.length} carried forward`}
          </span>
          <button className="btn btn-ghost" onClick={onClose}>
            Keep editing
          </button>
          <button className="btn btn-primary" onClick={onApprove}>
            {warnings.length > 0 ? 'Approve anyway' : 'Approve specification'}
          </button>
        </footer>
      </div>
    </div>
  );
};
