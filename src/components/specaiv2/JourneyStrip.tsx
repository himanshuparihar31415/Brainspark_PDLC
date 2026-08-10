import React from 'react';
import { Check, ChevronRight, Lock } from 'lucide-react';
import { JourneyStep, Lens, WsTab } from './personas';

/**
 * What this person is here to do, and how far through it they are.
 *
 * Steps the system can judge — is scope confirmed, is anything still unresolved,
 * is it approved — report themselves. The rest complete when the person has been
 * and looked, which is the only honest signal available for "have you reviewed
 * the schema migration". Faking certainty about that would be worse than a tick
 * that means "you have seen this".
 */

export interface JourneyState {
  scope: boolean;
  decisions: boolean;
  approved: boolean;
  drift: boolean;
  generated: boolean;
}

export const JourneyStrip: React.FC<{
  lens: Lens;
  state: JourneyState;
  visited: Set<string>;
  readOnly: boolean;
  onGo: (step: JourneyStep) => void;
  activeTab: WsTab;
}> = ({ lens, state, visited, readOnly, onGo, activeTab }) => {
  const isDone = (s: JourneyStep) => (s.auto ? state[s.auto] : visited.has(s.id));
  const done = lens.steps.filter(isDone).length;
  /* The first thing not yet done is the one being pointed at. */
  const nextIdx = lens.steps.findIndex((s) => !isDone(s));

  return (
    <div className="jrn">
      <div className="jrn-h">
        <span className="jrn-role">
          {lens.role}
          {readOnly && (
            <i title="You can read and trace, but not change">
              <Lock size={8} /> read only
            </i>
          )}
        </span>
        <span className="jrn-prog">
          {done}/{lens.steps.length}
          <i>
            <i style={{ width: `${(done / lens.steps.length) * 100}%` }} />
          </i>
        </span>
      </div>

      <div className="jrn-blurb">{lens.blurb}</div>

      <div className="jrn-steps">
        {lens.steps.map((s, i) => {
          const complete = isDone(s);
          const next = i === nextIdx;
          return (
            <button
              key={s.id}
              className={`jrn-s ${complete ? 'done' : ''} ${next ? 'next' : ''} ${
                activeTab === s.tab ? 'here' : ''
              }`}
              onClick={() => onGo(s)}
              title={s.hint}
            >
              <span className="jrn-n">{complete ? <Check size={9} /> : i + 1}</span>
              <span className="jrn-l">
                {s.label}
                <em>{s.hint}</em>
              </span>
              <ChevronRight size={11} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
