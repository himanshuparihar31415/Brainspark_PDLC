import React, { useEffect, useMemo, useRef, useState } from 'react';
import './specai-v2.css';
import { useApp } from '../../context/AppContext';
import {
  ArchArtifact,
  BriefLine,
  EvidenceClass,
  SpecQuestion,
  SpecAiState,
} from '../../types/specai';
import {
  BRIEF_BAND_COPY,
  BRIEF_BANDS,
  canEditSpecAi,
  sourceGlyph,
  stageGateWarnings,
  workspaceProgress,
} from '../../data/specai';
import { facetsByWeakest } from '../../data/specAiConfidence';
import {
  Check,
  CheckCircle2,
  CheckSquare,
  Circle,
  Loader2,
  Lock,
  Paperclip,
  Pencil,
} from 'lucide-react';

/* ─────────────────────────── small pieces ─────────────────────────── */

const EV: Record<EvidenceClass, { cls: string; label: string }> = {
  'Source fact': { cls: 'fact', label: 'Fact' },
  'User decision': { cls: 'decision', label: 'Decision' },
  'Inferred interpretation': { cls: 'inferred', label: 'Inferred' },
  'AI assumption': { cls: 'assumption', label: 'Assumption' },
};

/** A claim, wearing its evidence class, promotable on hover. */
const Claim: React.FC<{
  line: BriefLine;
  readOnly: boolean;
  onPromote: () => void;
  onCite: (line: BriefLine) => void;
}> = ({ line, readOnly, onPromote, onCite }) => (
  <div className="claim">
    <span className={`ev ${EV[line.evidenceClass].cls}`}>{EV[line.evidenceClass].label}</span>
    <span className="text">
      {line.text}{' '}
      {line.sourceSummary && (
        <button className="cite" onClick={() => onCite(line)} title="Show the evidence">
          {line.sourceSummary}
        </button>
      )}
    </span>
    {!readOnly && (
      <button className="promote" onClick={onPromote}>
        + Requirement
      </button>
    )}
  </div>
);

/* ─────────────────────────── the view ─────────────────────────── */

export const SpecAiV2View: React.FC = () => {
  const {
    currentScope,
    currentRole,
    currentUser,
    projects,
    tasks,
    specAiFor,
    startFromProblem,
    setProblemStatement,
    askAgent,
    answerQuestion,
    resolveConflict,
    promoteBriefLine,
    addSpecSource,
    retrySpecSource,
    lockSpecStage,
    unlockSpecStage,
    reviewArtifact,
    navigateTo,
    addToast,
  } = useApp();

  const project = projects.find((p) => p.id === currentScope.projectId) ?? projects[0];
  const state: SpecAiState = specAiFor(project?.id ?? '');
  const readOnly = !canEditSpecAi(currentRole);

  const [tab, setTab] = useState<'brief' | 'artifacts'>('brief');
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [showAllFacets, setShowAllFacets] = useState(false);
  const [openFlagId, setOpenFlagId] = useState<string | null>(null);
  const [citeLine, setCiteLine] = useState<BriefLine | null>(null);

  const messagesRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);

  const locked = state.lockedStages.includes('knowledge');
  const briefLocked = state.lockedStages.includes('understanding');
  const progress = workspaceProgress(state);
  const facets = facetsByWeakest(state);
  const shown = showAllFacets ? facets : facets.slice(0, 4);

  const flags = state.cards.filter((c) => c.type === 'Disagreement' && c.state === 'Flagged');
  const openQuestions = state.questions.filter((q) => q.status === 'Open');
  const pendingTasks = tasks.filter((t) => t.status === 'Needs Approval').length;

  const claims = useMemo(
    () =>
      state.brief
        ? BRIEF_BANDS.map((band) => ({ band, lines: state.brief!.bands[band] })).filter(
            (g) => g.lines.length > 0
          )
        : [],
    [state.brief]
  );

  /* ── Artifact build queue. Locking generates them all at once; the queue is what
     makes them arrive a few at a time, with what each one is reading. */
  const [building, setBuilding] = useState(false);
  const [builtIds, setBuiltIds] = useState<string[]>([]);
  const [currentBuild, setCurrentBuild] = useState<{ id: string; reading: string } | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    if (!building || state.artifacts.length === 0 || currentBuild || builtIds.length > 0) return;

    const names = state.sources.filter((s) => s.ingest === 'Indexed').map((s) => s.name);
    const queue = state.artifacts;

    queue.forEach((art, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setCurrentBuild({ id: art.id, reading: names[i % Math.max(1, names.length)] ?? 'the brief' });
        }, i * 1600)
      );
      timers.current.push(
        window.setTimeout(() => {
          setBuiltIds((prev) => [...prev, art.id]);
          if (i === queue.length - 1) {
            setCurrentBuild(null);
            setBuilding(false);
            addToast(`${queue.length} artifacts ready to review.`);
          }
        }, i * 1600 + 1400)
      );
    });
  }, [building, state.artifacts, state.sources, currentBuild, builtIds.length, addToast]);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.transcript.length, claims.length, openQuestions.length]);

  /* ── actions ── */

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMenuOpen(false);
    if (text.toLowerCase() === '/finalize') {
      setDraft('');
      setFinalizeOpen(true);
      return;
    }
    setDraft('');
    if (!state.intake?.acceptedAt) startFromProblem(state.projectId, text);
    else askAgent(state.projectId, text);
  };

  const commitProblem = () => {
    const next = problemRef.current?.textContent?.trim() ?? '';
    if (next && next !== state.problemStatement) setProblemStatement(state.projectId, next);
  };

  const createArtifacts = () => {
    setBuiltIds([]);
    setCurrentBuild(null);
    setBuilding(true);
    lockSpecStage(state.projectId, 'understanding');
    setTab('artifacts');
  };

  if (!project) {
    return (
      <div className="sx">
        <div className="panel">
          <div className="empty-state">
            <p>No project is in scope.</p>
          </div>
        </div>
      </div>
    );
  }

  const initials = (currentUser?.name ?? 'You')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

  return (
    <div className="sx">
      {/* ── TOP BAR ── */}
      <header className="topbar">
        <div className="brand">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <rect x="1" y="10" width="8" height="8" rx="1.6" fill="#3538CD" opacity="0.32" />
            <rect x="6" y="5" width="8" height="8" rx="1.6" fill="#3538CD" opacity="0.62" />
            <rect x="11" y="0" width="8" height="8" rx="1.6" fill="#3538CD" />
          </svg>
          <div className="brand-text">
            <span className="wordmark">Spec AI</span>
            <span className="sub">BRAINSPARK</span>
          </div>
        </div>

        <nav className="tabs">
          <button className={`tab ${tab === 'brief' ? 'active' : ''}`} onClick={() => setTab('brief')}>
            Brief
          </button>
          <button
            className={`tab ${tab === 'artifacts' ? 'active' : ''}`}
            onClick={() => setTab('artifacts')}
          >
            Artifacts
            {state.artifacts.length > 0 && <span className="badge">{state.artifacts.length}</span>}
          </button>
        </nav>

        <div className="topbar-right">
          {/* My Tasks lives outside the workspace; this is the way to it. */}
          <div className="icon-nav">
            <button title="My Tasks" onClick={() => navigateTo('My Tasks')}>
              <CheckSquare size={15} />
              {pendingTasks > 0 && <span className="dot">{pendingTasks}</span>}
            </button>
          </div>
          <span className="breadcrumb">
            Project — <b>{project.name}</b>
          </span>
          <div className="avatar">{initials}</div>
        </div>
      </header>

      {/* ── PROBLEM ── */}
      <div className="problem-bar">
        <span className="eyebrow">Problem</span>
        <div
          ref={problemRef}
          className="problem-text"
          contentEditable={!locked && !readOnly}
          suppressContentEditableWarning
          onBlur={commitProblem}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLElement).blur();
            }
          }}
        >
          {state.problemStatement || 'Describe the problem below to start.'}
        </div>
        <div className="problem-meta">
          {locked && (
            <button
              className="lock-tag"
              onClick={() => !readOnly && setReopenOpen(true)}
              title="Reopen for editing"
            >
              <Lock size={11} /> Locked
            </button>
          )}
          <button className="edit-icon-btn" disabled={locked || readOnly} title="Edit"
            onClick={() => problemRef.current?.focus()}>
            <Pencil size={13} />
          </button>
        </div>
      </div>

      <div className="progress-line">
        <div style={{ width: `${progress}%` }} />
      </div>

      {/* ── WORKSPACE ── */}
      <main className="workspace">
        {tab === 'brief' ? (
          <>
            <section className="thread-panel">
              <div className="messages" ref={messagesRef}>
                {state.transcript.length === 0 && (
                  <div className="msg agent enter">
                    <div className="meta">
                      <span className="meta-dot" />
                      AGENT
                    </div>
                    <div className="content">
                      <p>
                        Start with the problem, in your own words. One or two lines is enough — I
                        will read whatever you bring in and ask for the rest.
                      </p>
                    </div>
                  </div>
                )}

                {state.transcript.map((turn) => (
                  <div key={turn.id} className={`msg ${turn.from === 'you' ? 'user' : 'agent'} enter`}>
                    <div className="meta">
                      {turn.from === 'agent' && <span className="meta-dot" />}
                      {turn.from === 'you' ? 'YOU' : 'AGENT'}
                      {turn.from === 'agent' && state.intake && (
                        <span>· read as {state.intake.kind} — {state.intake.kindReason}</span>
                      )}
                      {turn.briefEffect && (
                        <span>
                          · {turn.briefEffect.added} lines into the brief · v{turn.briefEffect.version}
                        </span>
                      )}
                    </div>

                    {turn.from === 'agent' && (turn.toolCalls?.length ?? 0) > 0 && (
                      <div className="tools">
                        {turn.toolCalls!.map((c) => (
                          <div className="tool" key={c.id}>
                            <span className="nm">{c.name}</span>
                            <span className="arg">{c.argument}</span>
                            <span className={`st ${c.status}`}>
                              {c.status === 'running' ? '…' : c.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {turn.pending && !turn.text ? (
                      <div className="content">
                        <span className="dots">
                          <span />
                          <span />
                          <span />
                        </span>
                      </div>
                    ) : (
                      <div className="content">
                        {turn.text.split('\n').filter(Boolean).map((p, i) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* The reading, as claims you can trace and promote. */}
                {claims.length > 0 && (
                  <div className="msg agent enter">
                    <div className="meta">
                      <span className="meta-dot" />
                      AGENT · reading v{state.brief?.version}
                      {state.brief?.stale && <span>· out of date</span>}
                    </div>
                    <div className="content">
                      {state.brief?.stale && state.brief.staleReason && (
                        <p style={{ color: 'var(--conf-med)' }}>
                          {state.brief.staleReason}{' '}
                          <button className="chip soft" onClick={() => askAgent(state.projectId, '')}>
                            Re-read sources
                          </button>
                        </p>
                      )}
                      {claims.map((group) => (
                        <div key={group.band} style={{ marginBottom: 12 }}>
                          <div
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 10.5,
                              textTransform: 'uppercase',
                              letterSpacing: '.06em',
                              color: 'var(--ink-faint)',
                              marginBottom: 4,
                            }}
                          >
                            {BRIEF_BAND_COPY[group.band].header}
                          </div>
                          {group.lines.map((line) => (
                            <Claim
                              key={line.id}
                              line={line}
                              readOnly={readOnly || locked}
                              onPromote={() => promoteBriefLine(state.projectId, line.id)}
                              onCite={setCiteLine}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Questions — objective, answerable with a tap. */}
                {openQuestions.length > 0 && (
                  <div className="msg agent enter">
                    <div className="meta">
                      <span className="meta-dot" />
                      AGENT · {openQuestions.length} to answer
                    </div>
                    <div className="content">
                      <ol>
                        {openQuestions.map((q: SpecQuestion) => (
                          <li key={q.id}>
                            <span className={`track ${q.track.toLowerCase()}`}>{q.track}</span>{' '}
                            {q.text}
                            <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 3 }}>
                              {q.rationale}
                            </div>
                            {!readOnly && !locked && (
                              <div className="chips">
                                <button
                                  className="chip"
                                  onClick={() => answerQuestion(state.projectId, q.id, 'Answered', 'Confirmed')}
                                >
                                  Yes
                                </button>
                                <button
                                  className="chip"
                                  onClick={() => answerQuestion(state.projectId, q.id, 'Answered', 'No')}
                                >
                                  No
                                </button>
                                <button
                                  className="chip soft"
                                  onClick={() => answerQuestion(state.projectId, q.id, 'Assumed')}
                                >
                                  Assume for now
                                </button>
                                <button
                                  className="chip soft"
                                  onClick={() => answerQuestion(state.projectId, q.id, 'Deferred')}
                                >
                                  Defer
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                )}

                {/* Once the definition is locked, the brief is confirmed here. */}
                {locked && !briefLocked && (
                  <div className="msg agent enter">
                    <div className="meta">
                      <span className="meta-dot" />
                      AGENT · Project Brief
                    </div>
                    <div className="content">
                      <p>
                        The definition is locked. Here is the brief it produced — check nothing is
                        missing, then create the artifacts.
                      </p>
                      {state.understanding
                        .filter((s) => s.body.trim() !== '')
                        .map((s) => (
                          <p key={s.key}>
                            <b>{s.key}</b> — {s.body}
                          </p>
                        ))}
                      {!readOnly && (
                        <div className="chips">
                          <button className="chip selected" onClick={createArtifacts}>
                            Create artifacts
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {state.generating && (
                  <div className="msg agent typing">
                    <div className="meta">
                      <span className="meta-dot" />
                      AGENT
                    </div>
                    <div className="content">
                      <span className="dots">
                        <span />
                        <span />
                        <span />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── COMPOSER ── */}
              <div className="composer">
                <div className="composer-tray">
                  {state.sources.slice(-3).map((s) => (
                    <span className="tray-chip" key={s.id}>
                      {s.name}
                    </span>
                  ))}
                </div>

                {menuOpen && (
                  <div className="command-menu">
                    <button
                      className="command-item"
                      onClick={() => {
                        setDraft('');
                        setMenuOpen(false);
                        setFinalizeOpen(true);
                      }}
                    >
                      <span className="cmd">/finalize</span>
                      <span className="desc">Lock the definition and move to the brief</span>
                    </button>
                  </div>
                )}

                <div className="input-row">
                  <button
                    className="icon-btn"
                    title="Attach a source"
                    disabled={readOnly || locked}
                    onClick={() =>
                      addSpecSource(state.projectId, 'support-tickets-export.csv', 'TXT', 'attached just now')
                    }
                  >
                    <Paperclip size={16} />
                  </button>
                  <input
                    type="text"
                    value={draft}
                    disabled={readOnly || locked}
                    placeholder={
                      locked ? 'Definition is locked' : 'Message Spec AI, or type / for commands'
                    }
                    onChange={(e) => {
                      setDraft(e.target.value);
                      setMenuOpen(e.target.value.trim().startsWith('/'));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <button
                    className="btn btn-ghost"
                    disabled={readOnly || locked || !state.intake?.acceptedAt}
                    onClick={() => setFinalizeOpen(true)}
                  >
                    Finalize
                  </button>
                  <button className="btn btn-primary" disabled={readOnly || locked} onClick={send}>
                    Send
                  </button>
                </div>
                <div className="composer-hint">
                  Tip: type <kbd>/</kbd> for commands, or answer inline above
                </div>
              </div>
            </section>

            {/* ── RAIL ── */}
            <aside className="rail">
              <div className="rail-card">
                <h3>
                  Confidence <span className="count">{facets.filter((f) => f.level === 'low').length} weak</span>
                </h3>
                {shown.map((f) => (
                  <div className="conf-row" key={f.key}>
                    <div className="top">
                      <span className="label">{f.label}</span>
                      <span className={`tag ${f.level}`}>{f.level}</span>
                    </div>
                    <div className="bar-track">
                      <div className={`bar-fill ${f.level}`} />
                    </div>
                    <div className="why">{f.why}</div>
                  </div>
                ))}
                {facets.length > shown.length && (
                  <button className="rail-more" onClick={() => setShowAllFacets(true)}>
                    {facets.length - shown.length} more ·{' '}
                    {facets.slice(4).every((f) => f.level !== 'low') ? 'all Medium+' : 'show all'}
                  </button>
                )}
                {showAllFacets && (
                  <button className="rail-more" onClick={() => setShowAllFacets(false)}>
                    Show fewer
                  </button>
                )}
              </div>

              <div className="rail-card">
                <h3>
                  Flags <span className="count">{flags.length === 0 ? 'all clear' : `${flags.length} open`}</span>
                </h3>
                {flags.length === 0 ? (
                  <div className="rail-empty">
                    <Check size={13} /> No open conflicts
                  </div>
                ) : (
                  flags.map((f) => (
                    <div className="flag-item" key={f.id}>
                      <div className="flag-head">
                        <span className="flag-dot" />
                        Source conflict
                      </div>
                      <p>{f.conflict ? `${f.conflict.claimA} — vs — ${f.conflict.claimB}` : f.content}</p>
                      {openFlagId === f.id ? (
                        <div className="flag-choices">
                          <button
                            onClick={() =>
                              resolveConflict(state.projectId, f.id, f.conflict?.claimA ?? 'Option A')
                            }
                          >
                            {f.conflict?.claimASource ?? 'Option A'}
                          </button>
                          <button
                            onClick={() =>
                              resolveConflict(state.projectId, f.id, f.conflict?.claimB ?? 'Option B')
                            }
                          >
                            {f.conflict?.claimBSource ?? 'Option B'}
                          </button>
                        </div>
                      ) : (
                        <button
                          className="flag-resolve-btn"
                          disabled={readOnly}
                          onClick={() => setOpenFlagId(f.id)}
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="rail-card">
                <h3>
                  Sources <span className="count">{state.sources.length}</span>
                </h3>
                {state.sources.length === 0 ? (
                  <div className="rail-empty">Nothing attached yet</div>
                ) : (
                  state.sources.map((s) => (
                    <div className="src" key={s.id}>
                      <span className="glyph">{sourceGlyph(s.name)}</span>
                      <span className="body">
                        <span className="nm">{s.name}</span>
                        {s.detail && <span className="dt">{s.detail}</span>}
                      </span>
                      {s.ingest === 'Failed' ? (
                        <button
                          className="chip soft"
                          onClick={() => retrySpecSource(state.projectId, s.id)}
                        >
                          Retry
                        </button>
                      ) : (
                        <span className={`ingest ${s.ingest}`}>{s.ingest}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </aside>
          </>
        ) : (
          /* ── ARTIFACTS ── */
          <section className="panel">
            <div className="panel-header">
              <h1>Artifacts</h1>
              <p>
                {building
                  ? 'Being written now — open any of them as they arrive.'
                  : 'Generated from the locked brief. Approving them all unlocks decomposition.'}
              </p>
            </div>

            {state.artifacts.length === 0 ? (
              <div className="empty-state">
                <p>No artifacts yet.</p>
                <p className="sub">Confirm the Project Brief in the thread, then create them.</p>
              </div>
            ) : (
              <>
                {state.artifacts.every((a) => a.status === 'Approved') && (
                  <div className="unlock-banner">
                    <CheckCircle2 size={16} /> All artifacts approved — Module &amp; Feature
                    decomposition is unlocked.
                  </div>
                )}

                <table>
                  <thead>
                    <tr>
                      <th>Artifact</th>
                      <th>Group</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {state.artifacts.map((a: ArchArtifact) => {
                      const isBuilding = currentBuild?.id === a.id;
                      const built = builtIds.includes(a.id) || !building;
                      return (
                        <tr key={a.id}>
                          <td className="art-name">
                            {a.label}
                            {isBuilding && currentBuild && (
                              <div className="reading">reading {currentBuild.reading}…</div>
                            )}
                          </td>
                          <td className="art-type">{a.group}</td>
                          <td>
                            {isBuilding ? (
                              <span className="status-pill building">Writing</span>
                            ) : !built ? (
                              <span className="status-pill pending">Queued</span>
                            ) : (
                              <span
                                className={`status-pill ${
                                  a.status === 'Approved' ? 'approved' : 'pending'
                                }`}
                              >
                                {a.status === 'Approved' ? 'Approved' : 'Pending'}
                              </span>
                            )}
                          </td>
                          <td>
                            <button
                              className="approve-btn"
                              disabled={readOnly || !built || a.status === 'Approved'}
                              onClick={() => reviewArtifact(state.projectId, a.id)}
                            >
                              {a.status === 'Approved' ? '✓ Approved' : 'Approve'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </section>
        )}
      </main>

      {/* ── FINALIZE ── */}
      {finalizeOpen && (
        <div className="sx-modal-overlay" onClick={() => setFinalizeOpen(false)}>
          <div className="sx-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Finalize the definition?</h2>
            <p className="sub">
              This locks the problem definition and produces the Project Brief. You can reopen it
              afterwards — nothing gets deleted.
            </p>
            {(() => {
              const warnings = stageGateWarnings('knowledge', state);
              return warnings.length === 0 ? (
                <div className="all-clear-note">
                  <Check size={14} /> Everything is resolved — nothing outstanding.
                </div>
              ) : (
                <ul className="gate-list">
                  {warnings.map((w, i) => (
                    <li key={i}>
                      <Circle size={7} style={{ marginTop: 5, flexShrink: 0 }} />
                      {w}
                    </li>
                  ))}
                </ul>
              );
            })()}
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setFinalizeOpen(false)}>
                Keep editing
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  lockSpecStage(state.projectId, 'knowledge');
                  setFinalizeOpen(false);
                }}
              >
                {stageGateWarnings('knowledge', state).length > 0
                  ? 'Finalize anyway'
                  : 'Confirm & finalize'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REOPEN ── */}
      {reopenOpen && (
        <div className="sx-modal-overlay" onClick={() => setReopenOpen(false)}>
          <div className="sx-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Reopen the definition?</h2>
            <p className="sub">
              Later stages reopen with it, because they were produced from the version you are about
              to edit. Nothing is deleted — what was generated is kept and flagged for review.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setReopenOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  unlockSpecStage(state.projectId, 'knowledge');
                  setReopenOpen(false);
                }}
              >
                Reopen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROVENANCE ── */}
      {citeLine && (
        <div className="sx-modal-overlay" onClick={() => setCiteLine(null)}>
          <div className="sx-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Where this came from</h2>
            <p className="sub">{citeLine.text}</p>
            <ul className="gate-list">
              <li>
                <b>Evidence</b>&nbsp;— {citeLine.evidenceClass}
              </li>
              <li>
                <b>Backing</b>&nbsp;— {citeLine.sourceSummary || 'not recorded'}
              </li>
              {citeLine.sourceIds.map((id) => {
                const src = state.sources.find((s) => s.id === id);
                return (
                  <li key={id}>
                    <b>Source</b>&nbsp;— {src?.name ?? id}
                    {src?.ingestNote ? ` · ${src.ingestNote}` : ''}
                  </li>
                );
              })}
            </ul>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setCiteLine(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {building && currentBuild && tab === 'brief' && (
        <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 80 }}>
          <div className="rail-card" style={{ width: 260 }}>
            <h3>
              Building <span className="count">{builtIds.length}/{state.artifacts.length}</span>
            </h3>
            {state.artifacts.map((a) => (
              <div className="build" key={a.id} onClick={() => setTab('artifacts')}>
                <span
                  className={`spin ${
                    builtIds.includes(a.id) ? 'done' : currentBuild.id === a.id ? '' : 'queued'
                  }`}
                >
                  {builtIds.includes(a.id) ? (
                    <Check size={14} />
                  ) : currentBuild.id === a.id ? (
                    <Loader2 size={14} className="spinning" />
                  ) : (
                    <Circle size={10} />
                  )}
                </span>
                <span style={{ minWidth: 0 }}>
                  <div className="bnm">{a.label}</div>
                  {currentBuild.id === a.id && (
                    <div className="reading">reading {currentBuild.reading}…</div>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
