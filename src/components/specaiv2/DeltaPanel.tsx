import React, { useState } from 'react';
import { ArrowRight, Minus, Plus, RefreshCw } from 'lucide-react';
import { DELTA, DeltaKind, currentState, deltaImpact, proposedState, touchedNodes } from '../../data/specDelta';

/**
 * The specification, compiled from the delta rather than written alongside it.
 *
 * Current state is what the sources reconcile to, proposed state is the request,
 * and the delta between them is the thing an engineer can act on. Every line
 * names the nodes it lands on, so "what does this touch" is answered by the same
 * data that produced the line.
 */

const KIND_ICON: Record<DeltaKind, React.ReactNode> = {
  add: <Plus size={10} />,
  change: <RefreshCw size={10} />,
  extend: <ArrowRight size={10} />,
  remove: <Minus size={10} />,
};

export const DeltaPanel: React.FC<{
  decided: string[];
  onDiscuss: (question: string) => void;
}> = ({ decided, onDiscuss }) => {
  const [open, setOpen] = useState<string | null>(null);
  const current = currentState();
  const proposed = proposedState(decided);
  const impact = deltaImpact();
  const blocked = DELTA.filter((d) => d.blockedBy).length;

  return (
    <div className="wpanel">
      <div className="wsec">
        Current state <span>reconciled from your systems</span>
      </div>
      {current.map((c) => (
        <div className="dl cur" key={c.text}>
          <span className="dl-t">{c.text}</span>
          {c.reading && (
            <span className={`dl-c ${c.reading.drift ? 'drift' : ''}`}>
              {c.reading.drift ? 'drift' : `${Math.round(c.reading.confidence * 100)}%`}
            </span>
          )}
        </div>
      ))}

      <div className="wsec">
        Proposed state <span>from the problem statement</span>
      </div>
      {proposed.map((p) => (
        <div className="dl prop" key={p}>
          <span className="dl-t">{p}</span>
        </div>
      ))}

      <div className="wsec">
        Implementation delta{' '}
        <span>
          {DELTA.length} changes{blocked > 0 && ` · ${blocked} blocked`}
        </span>
      </div>
      {DELTA.map((d) => (
        <div className={`dl step ${d.blockedBy ? 'blocked' : ''}`} key={d.id}>
          <button className="dl-head" onClick={() => setOpen(open === d.id ? null : d.id)}>
            <span className={`dl-k ${d.kind}`}>{KIND_ICON[d.kind]}</span>
            <span className="dl-t">{d.text}</span>
            <span className="dl-a">{d.area}</span>
          </button>

          {open === d.id && (
            <div className="dl-body">
              <div className="dl-touch">
                {touchedNodes(d).map((n) => (
                  <span key={n.id} className={n.proposed ? 'new' : ''}>
                    {n.label}
                  </span>
                ))}
              </div>
              {d.blockedBy && (
                <div className="dl-block">
                  <span>Blocked — {d.blockedBy}</span>
                  <button className="chip soft" onClick={() => onDiscuss(d.blockedBy!)}>
                    Decide in chat
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="wsec">
        Reach <span>from the graph, not a list</span>
      </div>
      <div className="dl-reach">
        <span>
          <b>{impact.direct.length}</b> directly
        </span>
        <span>
          <b>{impact.inferred.length}</b> one hop out
        </span>
        <span>
          <b>{impact.potential.length}</b> further
        </span>
      </div>
    </div>
  );
};
