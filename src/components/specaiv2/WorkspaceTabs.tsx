import React from 'react';
import { SpecAiState } from '../../types/specai';
import { criticalGaps } from '../../data/specKnowledgeTree';
import { LeafAnswer, Orchestrator } from './orchestrator';
import { deltaImpact } from '../../data/specDelta';
import { AUTHORITY_COPY, SysNode, reconcile } from '../../data/specSystemModel';
import { AlertTriangle, ArrowRight, Check, CircleDot, FileText, Lock } from 'lucide-react';

/**
 * The three panels beside the Knowledge Map.
 *
 * Open Questions only holds what the connected systems could not settle. Anything
 * retrieval can answer has no business being asked of a person — that is the
 * difference between this and a requirements questionnaire.
 */

/* ─────────────────────────── Open Questions ─────────────────────────── */

export const OpenQuestions: React.FC<{
  state: SpecAiState;
  orch: Orchestrator;
  onDiscuss: (question: string) => void;
}> = ({ state, orch, onDiscuss }) => {
  const gaps = criticalGaps(state).filter((g) => !orch.answers[g.node.id]);
  /* Drift is a conflict the sources produced, not one somebody wrote down. */
  const drifts = reconcile().filter((r) => r.drift);
  const decisions = state.questions.filter((q) => q.status === 'Open');
  const total = drifts.length + gaps.length + decisions.length;

  if (total === 0) {
    return (
      <div className="wpanel">
        <div className="wempty">
          <Check size={22} />
          <p>Nothing outstanding.</p>
          <p className="sub">Everything the systems could answer, they answered.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wpanel">
      {drifts.length > 0 && (
        <>
          <div className="wsec">
            Drift <span>{drifts.length} where sources disagree</span>
          </div>
          {drifts.map((r) => (
            <div className="wq crit" key={r.property}>
              <div className="wq-h">
                <AlertTriangle size={11} />
                {r.property}
              </div>
              <div className="wq-claims">
                {(['verified', 'observed', 'intended', 'permitted'] as const).map((a) =>
                  r.by[a] ? (
                    <span key={a}>
                      <b>{AUTHORITY_COPY[a].label}</b> {r.by[a]!.value} — {r.by[a]!.system}
                    </span>
                  ) : null
                )}
              </div>
              <div className="wq-why">{r.summary}</div>
              {r.decision && (
                <div className="wq-acts">
                  <button className="chip soft" onClick={() => onDiscuss(r.decision!)}>
                    Decide in chat
                  </button>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {gaps.length > 0 && (
        <>
          <div className="wsec">
            Unanswered <span>{gaps.length} with no source</span>
          </div>
          {gaps.map((g) => (
            <div className="wq" key={g.node.id}>
              <div className="wq-h">
                <CircleDot size={11} />
                {g.node.label}
              </div>
              <div className="wq-q">{g.question}</div>
              <div className="wq-why">No source-backed answer found.</div>
              <div className="wq-path">{g.path.slice(1).join(' › ')}</div>
              <div className="wq-acts">
                <button className="chip soft" onClick={() => onDiscuss(g.question)}>
                  Answer in chat
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {decisions.length > 0 && (
        <>
          <div className="wsec">
            Decisions <span>{decisions.length} for you</span>
          </div>
          {decisions.map((q) => (
            <div className="wq" key={q.id}>
              <div className="wq-h">
                <CircleDot size={11} />
                {q.track}
              </div>
              <div className="wq-q">{q.text}</div>
              <div className="wq-why">{q.rationale || 'Business decision required.'}</div>
              <div className="wq-acts">
                <button className="chip soft" onClick={() => onDiscuss(q.text)}>
                  Answer in chat
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

/* ─────────────────────────── Change Impact ─────────────────────────── */

/**
 * Reach, walked from the delta rather than listed from memory. One hop out is
 * direct, two is inferred, three is worth mentioning — and it recalculates for
 * free when an answer changes what the delta contains.
 */
export const ChangeImpact: React.FC<{ state: SpecAiState; orch: Orchestrator }> = ({
  state,
  orch,
}) => {
  const confirmed: [string, LeafAnswer][] = Object.entries(orch.answers);
  const impact = deltaImpact();

  const ring = (title: string, hint: string, nodes: SysNode[]) => (
    <>
      <div className="wsec">
        {title} <span>{hint}</span>
      </div>
      {nodes.map((n) => (
        <div className={`wimp ${title === 'Direct' ? 'direct' : ''}`} key={n.id}>
          <ArrowRight size={11} />
          <span className="wimp-l">{n.label}</span>
          <span className="wimp-k">{n.kind}</span>
        </div>
      ))}
    </>
  );

  return (
    <div className="wpanel">
      <div className="wsec">Proposed capability</div>
      <div className="wcap">{state.problemStatement || 'No problem statement yet.'}</div>

      {ring('Direct', `${impact.direct.length} nodes the delta lands on`, impact.direct)}
      {ring('Inferred', 'one hop from the change', impact.inferred)}
      {ring('Potential', 'two hops — worth a look', impact.potential)}

      {confirmed.length > 0 && (
        <>
          <div className="wsec">
            From your answers <span>{confirmed.length}</span>
          </div>
          {confirmed.map(([id, a]) => (
            <div className="wq" key={id}>
              <div className="wq-q">{a.value}</div>
              <div className="wq-why">
                Re-read {a.affected.length} connected{' '}
                {a.affected.length === 1 ? 'system' : 'systems'}: {a.affected.join(', ')}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

/* ─────────────────────────── Outputs ─────────────────────────── */

export const Outputs: React.FC<{ state: SpecAiState; orch: Orchestrator }> = ({ state, orch }) => {
  const existing = [
    { label: 'Mobile login application', from: 'Apps' },
    { label: 'Authentication API', from: 'APIs' },
    { label: 'OAuth architecture', from: 'Architecture' },
    { label: 'Login test suite', from: 'Tests' },
    { label: 'Jira authentication epic', from: 'Jira' },
  ];

  const generated = [
    { label: 'Updated requirement brief', ready: Boolean(state.brief) },
    { label: 'Proposed biometric user flow', ready: state.artifacts.length > 0 },
    { label: 'Updated architecture', ready: state.artifacts.length > 0 },
    { label: 'API change specification', ready: state.artifacts.length > 0 },
    { label: 'Additional test scenarios', ready: state.stories.length > 0 },
  ];

  const stale = Object.keys(orch.answers).length > 0 && state.artifacts.length > 0;

  return (
    <div className="wpanel">
      <div className="wsec">
        Existing <span>discovered</span>
      </div>
      {existing.map((e) => (
        <div className="wout" key={e.label}>
          <FileText size={11} />
          <span className="wout-l">{e.label}</span>
          <span className="wout-f">{e.from}</span>
        </div>
      ))}

      <div className="wsec">
        Generated <span>{generated.filter((g) => g.ready).length} of {generated.length}</span>
      </div>
      {generated.map((g) => (
        <div className={`wout ${g.ready ? '' : 'pending'}`} key={g.label}>
          {g.ready ? <Check size={11} /> : <Lock size={11} />}
          <span className="wout-l">{g.label}</span>
          <span className="wout-f">
            {g.ready ? (stale ? 'review' : 'ready') : 'not yet'}
          </span>
        </div>
      ))}

      {stale && (
        <div className="wnote">
          An answer changed after these were produced, so they are marked for review rather than
          replaced.
        </div>
      )}
    </div>
  );
};
