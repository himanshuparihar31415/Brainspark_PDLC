import React from 'react';
import { AlertTriangle, ArrowUpRight, GitCommitHorizontal } from 'lucide-react';
import { ReviewTarget, ThrashReading, UntrackedChange } from '../../types/codeiq';
import {
  UNTRACKED_POLICY_COPY,
  countBy,
  isGenuinelyDone,
  storiesWithGaps,
  trustSplit,
} from '../../data/codeiq';

/**
 * The EM/PM dashboard — the only true portal surface.
 *
 * Three rollups, in the order a lead actually asks for them: what is genuinely
 * done versus claimed done, which stories carry gaps, and which criteria
 * keep causing rework. The last one is not an engineering signal at all — it is
 * a spec signal, and it goes back to Spec AI.
 *
 * Same discipline as the review panel: the trust metric is two numbers rather
 * than one ratio, because a single percentage hides which side of it you are on.
 */

const verdict = (t: ReviewTarget) => {
  if (t.claimed !== 'Done') return { cls: 'open', label: 'In flight' };
  return isGenuinelyDone(t)
    ? { cls: 'clean', label: 'Stands up' }
    : { cls: 'overstated', label: 'Overstated' };
};

const ThrashItem: React.FC<{ row: ThrashReading; onSend: (row: ThrashReading) => void }> = ({
  row,
  onSend,
}) => (
  <div className="cq-th">
    <span className="id">
      {row.storyKey} · {row.criterionId}
    </span>
    <span className="tx">{row.text}</span>
    <span className="n">
      <b>{row.discarded}</b> discarded of {row.attempts} · {row.days}d
    </span>
    <button
      className="cq-btn"
      disabled={row.sentUpstream}
      onClick={() => onSend(row)}
      title="Send this churn signal back to Spec AI as an under-specified criterion"
    >
      {row.sentUpstream ? 'Sent to Spec AI' : 'Send to Spec AI'}
      {!row.sentUpstream && <ArrowUpRight size={11} style={{ marginLeft: 4 }} />}
    </button>
  </div>
);

/*
 * Every row this panel reads now arrives as a prop. It used to import the
 * fixtures directly, which is why one project's rollup rendered under every
 * project's name — the panel had no way to know whose numbers it was showing.
 */
export const DashboardPanel: React.FC<{
  instrumentation: { structuredPct: number; joinedPct: number; unjoined: number };
  /*
   * Targets, not a rollup type. Every field the old TicketRollup carried was
   * either already here or one countBy away, so the second shape was a second
   * thing to keep in step.
   */
  targets: ReviewTarget[];
  untracked: UntrackedChange[];
  thrash: ThrashReading[];
  onSendUpstream: (row: ThrashReading) => void;
  onOpenStory: (storyKey: string) => void;
}> = ({ instrumentation, targets, untracked, thrash, onSendUpstream, onOpenStory }) => {
  const trust = trustSplit(targets);
  const gaps = storiesWithGaps(targets);
  const genuinePct = trust.claimed === 0 ? 0 : (trust.genuine / trust.claimed) * 100;

  return (
    <div className="cq-wrap">
      {/*
       * How much of the report can be trusted, before any of the report.
       *
       * Both numbers are about the pipeline rather than the code, and both change
       * what everything below them means: gaps found over criteria that arrived
       * as prose, or over commits with no join key, are a statement about the
       * instrumentation and not about what was built.
       */}
      <div className="cq-instr">
        <span>
          <b>{instrumentation.structuredPct}%</b> of stories arrived as Given/When/Then
        </span>
        <span>
          <b>{instrumentation.joinedPct}%</b> could be joined to a change set
        </span>
        {instrumentation.unjoined > 0 && (
          <span className="warn">
            {instrumentation.unjoined} exported{' '}
            {instrumentation.unjoined === 1 ? 'story has' : 'stories have'} no code CodeIQ can see
          </span>
        )}
      </div>

      {/* ── Lead with the gap ── */}
      <div className="cq-gap">
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          <b>
            {trust.overstated} of {trust.claimed} stories marked done have unaddressed criteria —{' '}
            {trust.missingCriteria} criteria with no code at all
          </b>
          <p>
            The list below is the output. There is no single completion score anywhere on this
            screen, and there should not be one.
          </p>
        </span>
      </div>

      {/* ── The trust metric ── */}
      <section className="cq-card">
        <div>
          <h2 className="cq-h2">Genuinely done vs claimed done</h2>
          <p className="cq-hsub">
            A story stands up when nothing is missing, drifted or partly realized. Anything else
            is overstated, whatever the tracker says.
          </p>
        </div>

        <div className="cq-trust">
          <div className="cq-num good">
            <b>{trust.genuine}</b>
            <span>stand up</span>
          </div>
          <div className="cq-num bad">
            <b>{trust.overstated}</b>
            <span>overstated</span>
          </div>
          <div className="cq-bar" title={`${trust.genuine} of ${trust.claimed} marked done`}>
            <i className="g" style={{ width: `${genuinePct}%` }} />
            <i className="b" style={{ width: `${100 - genuinePct}%` }} />
          </div>
        </div>
      </section>

      {/* ── Tickets carrying gaps ── */}
      <section className="cq-card">
        <div>
          <h2 className="cq-h2">Stories with gaps</h2>
          <p className="cq-hsub">
            {gaps.length} of {targets.length} stories have at least one criterion that is
            missing, drifted or partial.
          </p>
        </div>

        <div className="cq-table">
          <div className="cq-tr head">
            <span>Story</span>
            <span>Title</span>
            <span>Gaps</span>
            <span>Verdict</span>
          </div>
          {targets.map((t) => {
            const n = countBy(t.criteria);
            const v = verdict(t);
            return (
              <div className="cq-tr" key={t.storyKey}>
                <button
                  className="k"
                  style={{ border: 0, background: 'transparent', textAlign: 'left', padding: 0 }}
                  onClick={() => onOpenStory(t.storyKey)}
                  title="Open the review panel for this story"
                >
                  {t.storyKey}
                </button>
                <span className="t">
                  {t.title}
                  <span className="o"> · {t.owner}</span>
                </span>
                <span className="cq-mini">
                  {n.missing > 0 && <span className="m">{n.missing} missing</span>}
                  {n.drifted > 0 && <span className="d">{n.drifted} drifted</span>}
                  {n.partial > 0 && <span className="p">{n.partial} partial</span>}
                  {n.missing + n.drifted + n.partial === 0 && (
                    <span style={{ color: 'var(--ink-faint)' }}>none</span>
                  )}
                </span>
                <span className={`cq-verdict ${v.cls}`}>{v.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Thrash, which is a spec problem rather than a code one ── */}
      <section className="cq-card">
        <div>
          <h2 className="cq-h2">Rework by criterion</h2>
          <p className="cq-hsub">
            Criteria that took the most attempts to realize. A criterion rewritten nine times was
            probably written badly — that signal belongs upstream, not in a retro.
          </p>
        </div>

        <div className="cq-thrash">
          {thrash.map((row) => (
            <ThrashItem key={row.storyKey + row.criterionId} row={row} onSend={onSendUpstream} />
          ))}
        </div>
      </section>

      {/* ── Untracked change, per repo policy ── */}
      <section className="cq-card">
        <div>
          <h2 className="cq-h2">Untracked change</h2>
          <p className="cq-hsub">
            Commits with no linked story — hotfixes, refactors, agent cleanups. Left alone these
            rot the graph, so each repo carries an explicit policy.
          </p>
        </div>

        <div>
          {untracked.map((u) => (
            <div className="cq-un" key={u.commit}>
              <GitCommitHorizontal size={12} style={{ flexShrink: 0, color: 'var(--ink-faint)' }} />
              <span className="sha">{u.commit}</span>
              <span className="s">
                {u.summary} <span style={{ color: 'var(--ink-faint)' }}>· {u.files} files</span>
              </span>
              <span className="who">
                {u.author} · {u.repo}
              </span>
              <span className={`cq-pol ${u.policy}`} title={UNTRACKED_POLICY_COPY[u.policy].helper}>
                {UNTRACKED_POLICY_COPY[u.policy].label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="cq-foot">
        <b>Accuracy is bounded by the intent it reads.</b> These numbers hold where acceptance
        criteria arrive structured from Spec AI. On prose stories the mapping degrades, and this
        screen would be measuring its own guesswork.
      </p>
    </div>
  );
};
