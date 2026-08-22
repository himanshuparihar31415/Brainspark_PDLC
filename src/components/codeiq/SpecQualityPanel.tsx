import React from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { ThrashRow } from '../../types/codeiq';

/**
 * Spec quality — the only surface here that is not about code.
 *
 * A criterion that took eleven attempts and discarded nine of them was probably
 * written badly. That is a specification problem wearing engineering clothes,
 * and it is the one finding CodeIQ sends back upstream rather than acting on.
 *
 * Promoted out of the dashboard because it was competing there with the gap
 * report, which is a different question asked by a different person. A lead reads
 * the gap report; a PM reads this.
 *
 * The rows are ordered by discard rate rather than raw attempts. Eleven attempts
 * that all landed is a hard problem being worked; four attempts that were all
 * thrown away is a criterion nobody could interpret.
 */

const CAUSE_COPY: { threshold: number; label: string; helper: string }[] = [
  {
    threshold: 0.8,
    label: 'Unbuildable as written',
    helper: 'Almost everything tried was thrown away. The criterion is not saying what to build.',
  },
  {
    threshold: 0.6,
    label: 'Ambiguous',
    helper: 'Repeated rework suggests more than one reasonable reading.',
  },
  {
    threshold: 0,
    label: 'Contested',
    helper: 'Some rework, some progress. Worth a sentence of clarification.',
  },
];

const cause = (row: ThrashRow) => {
  const rate = row.attempts === 0 ? 0 : row.discarded / row.attempts;
  return CAUSE_COPY.find((c) => rate >= c.threshold) ?? CAUSE_COPY[CAUSE_COPY.length - 1];
};

const discardRate = (row: ThrashRow) => (row.attempts === 0 ? 0 : row.discarded / row.attempts);

export const SpecQualityPanel: React.FC<{
  thrash: ThrashRow[];
  onSendUpstream: (row: ThrashRow) => void;
}> = ({ thrash, onSendUpstream }) => {
  const rows = [...thrash].sort((a, b) => discardRate(b) - discardRate(a));
  const pending = rows.filter((r) => !r.sentUpstream);

  return (
    <div className="cq-wrap">
      <div>
        <h2 className="cq-h2">Rework per criterion</h2>
        <p className="cq-hsub">
          Generation attempts against a single criterion, and how many were discarded. High discard
          is a spec signal, not an engineering one — so the action is to ask the author, never to
          rewrite the criterion here.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="cq-blank">
          <b>No rework recorded.</b>
          <p>
            Attempt history arrives through the IDE agent connector. With it connected, criteria
            that keep causing discarded work appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="cq-card">
            <div className="cq-thrash">
              {rows.map((row) => {
                const c = cause(row);
                return (
                  <div className="cq-sq" key={row.storyKey + row.criterionId}>
                    <div className="top">
                      <span className="id">
                        {row.storyKey} · {row.criterionId}
                      </span>
                      <span className={`cause r${Math.round(discardRate(row) * 10)}`}>
                        {c.label}
                      </span>
                      {row.sentUpstream ? (
                        <span className="sent">
                          <Check size={11} /> Raised in Spec AI
                        </span>
                      ) : (
                        <button className="cq-btn" onClick={() => onSendUpstream(row)}>
                          Raise with the author <ArrowUpRight size={11} />
                        </button>
                      )}
                    </div>
                    <p className="text">{row.text}</p>
                    <div className="nums">
                      <span>
                        <b>{row.discarded}</b> of {row.attempts} attempts discarded
                      </span>
                      <span>
                        over <b>{row.days}</b> {row.days === 1 ? 'day' : 'days'}
                      </span>
                      <span className="why">{c.helper}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="cq-foot">
            <b>Why this is not a developer metric.</b> Rework is counted per criterion, not per
            person. The same criterion churning across two developers is the clearest evidence that
            the problem is the wording rather than whoever was reading it.
            {pending.length > 0 && ` ${pending.length} not yet raised upstream.`}
          </p>
        </>
      )}
    </div>
  );
};
