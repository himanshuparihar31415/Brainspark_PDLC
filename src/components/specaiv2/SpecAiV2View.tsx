import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import './specai-v2.css';
import { useApp } from '../../context/AppContext';
import {
  ArchArtifact,
  ArtifactGroup,
  BriefLine,
  EvidenceClass,
  SpecAiState,
} from '../../types/specai';
import {
  BRIEF_BAND_COPY,
  BRIEF_BANDS,
  INTAKE_ACCEPT,
  SOURCE_TYPE_FOR_FILE,
  StoryTrack,
  canEditSpecAi,
} from '../../data/specai';
import { KNOWLEDGE_ROOT, criticalGaps, rollup } from '../../data/specKnowledgeTree';
import { LeafAnswer, isRunning, useOrchestrator } from './orchestrator';
import { OpenQuestions } from './WorkspaceTabs';
import { ImpactPanel } from './ImpactPanel';
import { lensFor } from './personas';
/* Nine artifacts carry a full node-and-edge diagram; the old surface rendered
   them and this one did not. */
const DiagramRenderer = lazy(() =>
  import('../specai/DiagramRenderer').then((m) => ({ default: m.DiagramRenderer }))
);
const SpecDocument = lazy(() =>
  import('./SpecDocument').then((m) => ({ default: m.SpecDocument }))
);
import { scopeBySource } from '../../data/specDelta';
import { hasSystemModel, reconcile } from '../../data/specSystemModel';
import {
  AlertTriangle,
  ArrowUp,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Loader2,
  Layers,
  Lock,
  Paperclip,
  Pencil,
  Play,
  RefreshCw,
  Sparkles,
  Unlock,
  Upload,
  X,
} from 'lucide-react';

/* Modules & Features and Stories are the original Spec AI surfaces, kept whole.
   Lazily loaded so the v2 chunk does not carry them until a spec gets that far. */
/* The map carries the whole taxonomy and React Flow, so it loads on demand. */
/* The system map is the default view: it is what the problem statement
   actually produced. The taxonomy stays as a completeness checklist. */
const SystemMap = lazy(() =>
  import('./SystemMap').then((m) => ({ default: m.SystemMap }))
);
const Stage4Modules = lazy(() =>
  import('../specai/Stage4Modules').then((m) => ({ default: m.Stage4Modules }))
);
const Stage5Stories = lazy(() =>
  import('../specai/Stage5Stories').then((m) => ({ default: m.Stage5Stories }))
);

/**
 * Which artifacts have to be signed off before decomposition can start.
 *
 * Product and Architecture are the load-bearing ones — the PRD and the design a
 * module map would be derived from. Contracts, decision records and diagrams are
 * real work but nothing downstream is shaped by them, so holding the gate on them
 * would be ceremony.
 */
const CRITICAL_GROUPS: ArtifactGroup[] = ['Product', 'Architecture'];

type Tab = 'brief' | 'artifacts' | 'modules' | 'stories';

/* What the change touches, where it sits, then what is still open. */
const WS_ORDER = ['impact', 'system', 'questions'] as const;

/** Openers for the empty thread — a blank field is the hardest thing to answer. */
const STARTERS = [
  'Checkout abandonment is up 18% since the loyalty programme launched.',
  'Our onboarding drops 40% of users at the identity step and we do not know why.',
  'We need to replace the batch settlement job with something near real-time.',
];

const EV: Record<EvidenceClass, { cls: string; label: string }> = {
  'Source fact': { cls: 'fact', label: 'Fact' },
  'User decision': { cls: 'decision', label: 'Decision' },
  'Inferred interpretation': { cls: 'inferred', label: 'Inferred' },
  'AI assumption': { cls: 'assumption', label: 'Assumption' },
};

const Loading: React.FC = () => (
  <div className="empty-state">
    <p>Loading…</p>
  </div>
);

export const SpecAiV2View: React.FC = () => {
  const {
    currentScope,
    currentRole,
    currentUser,
    projects,
    tasks,
    teamMembers,
    specAiFor,
    startFromProblem,
    setProblemStatement,
    askAgent,
    answerQuestion,
    promoteBriefLine,
    addSpecSource,
    lockSpecStage,
    unlockSpecStage,
    reviewArtifact,
    unlockArtifact,
    assignArtifact,
    updateArtifact,
    regenerateArtifact,
    navigateTo,
    addToast,
  } = useApp();

  /* The problem statement is the only trigger. Everything the orchestrator does
     happens because of it, and none of it is a button. */
  const orch = useOrchestrator();

  const project = projects.find((p) => p.id === currentScope.projectId) ?? projects[0];
  const state: SpecAiState = specAiFor(project?.id ?? '');
  const readOnly = !canEditSpecAi(currentRole);

  const [tab, setTab] = useState<Tab>('brief');
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [citeLine, setCiteLine] = useState<BriefLine | null>(null);
  const [openArtifact, setOpenArtifact] = useState<string | null>(null);
  const [artifactDraft, setArtifactDraft] = useState('');
  const [track, setTrack] = useState<StoryTrack | 'All'>('All');

  /* Sources live in the top bar, not the thread. */
  const [readingOpen, setReadingOpen] = useState(false);

  /* The rail collapses to a strip of dots — still readable, 34px wide. */
  /* The panel beside the chat shows one of two readings of the same thing. */
  /* The panel opens where this persona's question lives. */
  const lens = useMemo(() => lensFor(currentRole), [currentRole]);
  const [wsTab, setWsTab] = useState<'system' | 'impact' | 'questions'>(lens.defaultTab);
  const [impactLens, setImpactLens] = useState<'jira' | 'code'>(lens.impactLens);
  useEffect(() => {
    setWsTab(lens.defaultTab);
    setImpactLens(lens.impactLens);
  }, [lens]);

  /* Scope candidates, clubbed by the system that surfaced them. Everything is in
     by default — the user is trimming, not assembling. */
  const groups = useMemo(() => scopeBySource(), []);
  const scopeAll = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (selected.size === 0 && scopeAll.length > 0) {
      setSelected(new Set(scopeAll.map((i) => i.node.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeAll]);
  /* What the conversation is currently about, when the map has been used. */
  const [nodeContext, setNodeContext] = useState<{ path: string[]; evidence?: string } | null>(
    null
  );
  const [mapFull, setMapFull] = useState(false);
  const [barOpen, setBarOpen] = useState(false);

  /* Conversation and workspace share the width, 60/40 to start. The divider is
     draggable because which half matters changes with what you are doing —
     reading a spec wants the panel, arguing with the agent wants the thread. */
  const DEFAULT_SPLIT = 60;
  const [split, setSplit] = useState(DEFAULT_SPLIT);
  const workspaceRef = useRef<HTMLElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current || !workspaceRef.current) return;
      const r = workspaceRef.current.getBoundingClientRect();
      const pct = ((e.clientX - r.left) / r.width) * 100;
      /* Neither side is useful below roughly a third. */
      setSplit(Math.min(76, Math.max(30, pct)));
    };
    const stop = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
    };
  }, []);

  const startDrag = () => {
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  /* The statement anchors the conversation. On the working tabs it is
     reference material, so it folds to one line rather than taking a block. */
  const [pheadOpen, setPheadOpen] = useState(true);

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const problemFileRef = useRef<HTMLInputElement>(null);
  const sourceFileRef = useRef<HTMLInputElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);

  const locked = state.lockedStages.includes('knowledge');
  /* Coverage is how much of the specification is actually answered, which is a
     different question from how far through the stages you are. */
  const treeRoll = useMemo(() => rollup(KNOWLEDGE_ROOT, state), [state]);
  const coverage = Math.min(
    100,
    Math.round(
      ((treeRoll.answered + treeRoll.inferred + Object.keys(orch.answers).length) /
        Math.max(1, treeRoll.total)) *
        100
    )
  );

  const openQuestions = state.questions.filter((q) => q.status === 'Open');
  const pendingTasks = tasks.filter((t) => t.status === 'Needs Approval').length;

  /* Who can be handed an artifact — this project's roster, plus whoever is here. */
  const reviewers = useMemo(() => {
    const names = teamMembers
      .filter((m) => m.projectId === project?.id)
      .map((m) => m.name);
    return [...new Set([currentUser?.name, ...names].filter(Boolean))] as string[];
  }, [teamMembers, project?.id, currentUser?.name]);


  /* Only critical unanswered leaves are allowed to interrupt; the rest wait in the map. */
  /* Drift comes from reconciling the sources, so the badge and the panel cannot
     disagree about how much is outstanding. */
  const driftCount = useMemo(() => reconcile().filter((r) => r.drift).length, []);

  const gaps = useMemo(
    () => criticalGaps(state).filter((g) => !orch.answers[g.node.id]),
    [state, orch.answers]
  );

  const critical = state.artifacts.filter((a) => CRITICAL_GROUPS.includes(a.group));
  const criticalApproved = critical.filter((a) => a.status === 'Approved');
  const gateOpen = critical.length > 0 && criticalApproved.length === critical.length;

  /* One question is asked at a time; the rest wait their turn. */
  const current = openQuestions[0];

  const claims = useMemo(
    () =>
      state.brief
        ? BRIEF_BANDS.map((band) => ({ band, lines: state.brief!.bands[band] })).filter(
            (g) => g.lines.length > 0
          )
        : [],
    [state.brief]
  );

  const claimCount = claims.reduce((n, g) => n + g.lines.length, 0);
  const unsourced = claims.reduce(
    (n, g) =>
      n +
      g.lines.filter(
        (l) => l.evidenceClass !== 'Source fact' && l.evidenceClass !== 'User decision'
      ).length,
    0
  );

  /* ── Artifacts arrive a few at a time, with what each one is reading. */
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
        }, i * 900)
      );
      timers.current.push(
        window.setTimeout(() => {
          setBuiltIds((prev) => [...prev, art.id]);
          if (i === queue.length - 1) {
            setCurrentBuild(null);
            setBuilding(false);
            addToast(`${queue.length} artifacts ready. Approve the critical ones to continue.`);
          }
        }, i * 900 + 800)
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
    if (inputRef.current) inputRef.current.style.height = 'auto';
    if (!state.intake?.acceptedAt) startFromProblem(state.projectId, text);
    else askAgent(state.projectId, text);
  };

  /**
   * The agent refuses a new turn while one is running, and a click that does
   * nothing reads as a broken button. Anything asked mid-turn waits and goes in
   * when the turn finishes.
   */
  const queued = useRef<string[]>([]);
  useEffect(() => {
    if (state.generating || queued.current.length === 0) return;
    const next = queued.current.shift();
    if (next) askAgent(state.projectId, next);
  }, [state.generating, state.projectId, askAgent]);

  const askFromMap = (question: string, path?: string[]) => {
    setTab('brief');
    setMapFull(false);
    if (path) setNodeContext({ path });
    if (state.generating) queued.current.push(question);
    else askAgent(state.projectId, question);
  };

  /* Where the statement came from, when it did not come from typing. */
  const [statementFrom, setStatementFrom] = useState<string | null>(null);
  const [extracting, setExtracting] = useState<string | null>(null);

  /**
   * A problem statement can arrive as a document rather than a sentence — a
   * one-pager, a screenshot of a ticket, a exported brief. Plain text is read
   * for real; PDF and image extraction is simulated in this prototype, and says
   * so rather than pretending.
   */
  const takeProblemFile = async (file: File) => {
    const kind = SOURCE_TYPE_FOR_FILE(file.name);
    addSpecSource(state.projectId, file.name, kind, 'problem statement source');
    setStatementFrom(file.name);

    if (/\.(txt|md)$/i.test(file.name)) {
      const text = (await file.text()).trim().replace(/\s+/g, ' ');
      if (text) setProblemStatement(state.projectId, text.slice(0, 600));
      return;
    }

    setExtracting(file.name);
    window.setTimeout(() => {
      setExtracting(null);
      setProblemStatement(
        state.projectId,
        'Returning customers abandon login because a PIN is demanded every single time. ' +
          'Introduce biometric login for customers who have already onboarded, without ' +
          'weakening device security or changing the shared OAuth gateway.'
      );
    }, 1300);
  };

  /**
   * Settling something in the panel puts it into the conversation.
   *
   * An answer given in a side panel that the agent never hears is a decision
   * with no consequence — the thread is the record, so it goes there, and the
   * systems the answer touches get read again.
   */
  const settleGap = (question: string, answer: string, nodeId?: string, branch?: string) => {
    if (nodeId && branch) orch.answerLeaf(nodeId, answer, branch);
    setTab('brief');
    const line = `${question} — ${answer}`;
    if (state.generating) queued.current.push(line);
    else askAgent(state.projectId, line);
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

  const approveAllCritical = () => {
    critical
      .filter((a) => a.status !== 'Approved')
      .forEach((a) => reviewArtifact(state.projectId, a.id));
  };

  const openModules = () => {
    if (state.modules.length === 0) lockSpecStage(state.projectId, 'artifacts');
    setTab('modules');
  };

  const openStories = () => {
    if (state.modules.length === 0) lockSpecStage(state.projectId, 'artifacts');
    if (state.stories.length === 0) lockSpecStage(state.projectId, 'modules');
    setTab('stories');
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

  /* Expanded only on the thread, and only while the user wants it. */
  /* Only some projects have a system indexed; the rest say so rather than
     being shown somebody else's. */
  const modelled = hasSystemModel(project?.id ?? '');

  const headerOpen = pheadOpen && tab === 'brief';

  const initials = (currentUser?.name ?? 'You')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

  const gateHint = gateOpen
    ? undefined
    : critical.length === 0
    ? 'Create the artifacts first'
    : `Approve the ${critical.length - criticalApproved.length} remaining critical artifact${
        critical.length - criticalApproved.length === 1 ? '' : 's'
      }`;

  return (
    <div className="sx">
      {/* ── TOP BAR ── */}
      <header className="topbar">
        <div className="brand">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
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
            Problem Definition
          </button>
          <button
            className={`tab ${tab === 'artifacts' ? 'active' : ''}`}
            onClick={() => setTab('artifacts')}
          >
            Artifacts
            {state.artifacts.length > 0 && (
              <span className="badge">
                {criticalApproved.length}/{critical.length}
              </span>
            )}
          </button>
          {/* Decomposition and stories open once the critical artifacts are signed off. */}
          <button
            className={`tab ${tab === 'modules' ? 'active' : ''}`}
            disabled={!gateOpen}
            title={gateHint}
            onClick={openModules}
          >
            Modules &amp; Features
          </button>
          <button
            className={`tab ${tab === 'stories' ? 'active' : ''}`}
            disabled={!gateOpen}
            title={gateHint}
            onClick={openStories}
          >
            Stories
            {state.stories.length > 0 && <span className="badge">{state.stories.length}</span>}
          </button>
        </nav>

        <div className="topbar-right">
          <div className="icon-nav">
            <button title="My Tasks" onClick={() => navigateTo('My Tasks')}>
              <CheckSquare size={14} />
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
      {/* ───────────── PROBLEM STATEMENT — the single trigger ─────────────
          One card rather than four things pinned to the edges of a wide band.
          The statement keeps a reading measure; the action sits with the number
          it affects. */}
      <div className={`phead ${headerOpen ? '' : 'mini'}`}>
        {!headerOpen ? (
          <button
            className="phead-mini"
            onClick={() => {
              setTab('brief');
              setPheadOpen(true);
            }}
          >
            <span className="phead-mini-l">Problem</span>
            <span className="phead-mini-t">{state.problemStatement || 'Not set'}</span>
            <span className="phead-mini-c">{orch.phase === 'idle' ? '—' : `${coverage}%`}</span>
            <ChevronDown size={12} />
          </button>
        ) : (
        <div className="phead-card">
          <div className="phead-main">
            <div className="phead-lbl">
              <span>Problem statement</span>
              <button
                className="phead-edit"
                title="Collapse"
                onClick={() => setPheadOpen(false)}
              >
                <ChevronUp size={11} />
              </button>
              {!locked && !readOnly && (
                <button
                  className="phead-edit"
                  title="Edit"
                  onClick={() => problemRef.current?.focus()}
                >
                  <Pencil size={11} />
                </button>
              )}
              {locked && (
                <button className="lock-tag" onClick={() => !readOnly && setReopenOpen(true)}>
                  <Lock size={10} /> Locked
                </button>
              )}
              {!locked && !readOnly && (
                <>
                  <button
                    className="phead-upload"
                    onClick={() => problemFileRef.current?.click()}
                    title="Upload a PDF, image or document"
                  >
                    <Upload size={10} /> Upload
                  </button>
                  <input
                    ref={problemFileRef}
                    type="file"
                    accept={INTAKE_ACCEPT}
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void takeProblemFile(f);
                      e.target.value = '';
                    }}
                  />
                </>
              )}
              {statementFrom && (
                <span className="phead-from">
                  {extracting ? `reading ${extracting}…` : `from ${statementFrom}`}
                </span>
              )}
              {orch.phase !== 'idle' && (
                <span className="phead-status">
                  {orch.phase === 'ready' ? (
                    <>
                      <Check size={11} /> {orch.settledCount}/{orch.sources.length} systems analysed
                    </>
                  ) : orch.phase === 'scoping' ? (
                    <>
                      <Check size={11} /> Discovery complete — confirm scope
                    </>
                  ) : (
                    <>
                      <Loader2 size={11} className="spinning" /> Analysing {orch.sources.length}…
                    </>
                  )}
                </span>
              )}
            </div>
            <div
              ref={problemRef}
              className="phead-text"
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
              {state.problemStatement || 'Describe the problem to start.'}
            </div>
          </div>

          <div className="phead-side">
            <div className="phead-cov">
              {/* A number before anything has been analysed implies work that
                  has not happened. */}
              <b>{orch.phase === 'idle' ? '—' : `${coverage}%`}</b>
              <span>coverage</span>
              <i>
                <i style={{ width: `${coverage}%` }} />
              </i>
            </div>

            {tab !== 'brief' ? null : orch.phase === 'idle' ? (
              <button
                className="btn btn-primary"
                disabled={readOnly || !state.problemStatement.trim()}
                onClick={orch.analyse}
              >
                <Play size={13} /> Analyse problem
              </button>
            ) : orch.phase === 'scoping' ? (
              <button className="btn btn-ghost" disabled>
                Waiting on scope…
              </button>
            ) : orch.phase !== 'ready' ? (
              <button className="btn btn-ghost" disabled>
                <Loader2 size={13} className="spinning" /> Analysing…
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={orch.analyse} disabled={readOnly}>
                Re-analyse
              </button>
            )}
          </div>
        </div>
        )}
      </div>

      {/* The one interruption in the run: confirm what we are about to read
          deeply, clubbed by the system it came from, with how sure we are that
          each thing matters. Scope is inherited by every later artefact, so it
          is the one decision worth showing the working for. */}
      {orch.phase === 'scoping' && (
        <div className="scope">
          <div className="scope-h">
            <b>Confirm scope</b> — discovery found {scopeAll.length} things this problem touches
            across {groups.length} systems. Untick anything that should be left alone.
            <span className="scope-count">
              {selected.size} of {scopeAll.length} selected
            </span>
          </div>

          {/* One line per system, its candidates as toggles. Relevance is a dot
              rather than a bar — at this size a number per row is noise, and the
              detail is a hover away. */}
          <div className="scope-rows">
            {groups.map((g) => {
              const ids = g.items.map((i) => i.node.id);
              const on = ids.filter((id) => selected.has(id)).length;
              return (
                <div className="scope-r" key={g.system}>
                  <button
                    className={`scope-src ${on === 0 ? 'off' : ''}`}
                    onClick={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (on === ids.length) ids.forEach((id) => next.delete(id));
                        else ids.forEach((id) => next.add(id));
                        return next;
                      })
                    }
                  >
                    {g.system}
                    <i>
                      {on}/{ids.length}
                    </i>
                  </button>

                  <div className="scope-pills">
                    {g.items.map((item) => {
                      const isOn = selected.has(item.node.id);
                      const band =
                        item.relevance >= 0.85 ? 'hi' : item.relevance >= 0.7 ? 'md' : 'lo';
                      return (
                        <button
                          key={item.node.id}
                          className={`scope-p ${isOn ? '' : 'off'}`}
                          title={`${item.why} · ${Math.round(item.relevance * 100)}% relevant${
                            item.origins.length > 1 ? ` · also in ${item.origins.slice(1).join(', ')}` : ''
                          }`}
                          onClick={() =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              next.has(item.node.id)
                                ? next.delete(item.node.id)
                                : next.add(item.node.id);
                              return next;
                            })
                          }
                        >
                          <i className={`rel ${band}`} />
                          {item.node.label}
                          {item.origins.length > 1 && <em>{item.origins.length}</em>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="scope-acts">
            <button
              className="btn btn-primary"
              disabled={selected.size === 0}
              onClick={() =>
                orch.confirmScope(
                  groups
                    .filter((g) => g.items.some((i) => selected.has(i.node.id)))
                    .map((g) => g.system)
                )
              }
            >
              Looks right — go deep
            </button>
            <button className="foot-btn" onClick={() => setWsTab('system')}>
              Show me on the map
            </button>
            <span className="scope-note">
              {groups.filter((g) => !g.items.some((i) => selected.has(i.node.id))).length} systems
              will be skipped
            </span>
          </div>
        </div>
      )}

      {/* ── WORKSPACE ── */}
      <main className="workspace" ref={workspaceRef}>
        {tab === 'brief' && (
          <>
            <section className="thread-panel" style={{ flex: `0 0 ${split}%` }}>
              <div className="messages" ref={messagesRef}>
                {state.transcript.length === 0 && (
                  <div className="turn">
                    <span className="av">
                      <Sparkles size={12} />
                    </span>
                    <div className="col">
                      <div className="who">
                        <span className="nm">Spec Agent</span>
                      </div>
                      <div className="say">
                        <p>
                          What are we solving? One or two lines is plenty — I will read whatever
                          you bring in and ask for the rest.
                        </p>
                      </div>
                      <div className="say" style={{ marginTop: 6 }}>
                        <p style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
                          Or upload a one-pager, a screenshot of a ticket or an exported brief —
                          the <b>Upload</b> control above the statement takes PDFs, images and
                          documents.
                        </p>
                      </div>

                      {/* Something to press, rather than a blank field to stare at. */}
                      <div className="starter">
                        {STARTERS.map((t) => (
                          <button key={t} onClick={() => setDraft(t)}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* One turn, not one bubble per system. Five separate messages saying
                    five separate things is a log again. */}
                {orch.narration.length > 0 && (
                  <div className="turn grouped enter">
                    <span className="av">
                      <Sparkles size={12} />
                    </span>
                    <div className="col">
                      <div className="say">
                        {orch.narration.map((n) => (
                          <p key={n.id}>{n.text}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {state.transcript.map((turn, i) => {
                  const mine = turn.from === 'you';
                  /* A run from one speaker keeps the column and drops the repeat. */
                  const grouped = i > 0 && state.transcript[i - 1].from === turn.from;
                  return (
                    <div
                      key={turn.id}
                      className={`turn ${mine ? 'me' : ''} ${grouped ? 'grouped' : ''} enter`}
                    >
                      <span className="av">{mine ? initials : <Sparkles size={12} />}</span>
                      <div className="col">
                        {!grouped && (
                          <div className="who">
                            <span className="nm">{mine ? 'You' : 'Spec Agent'}</span>
                            {turn.briefEffect && (
                              <span className="sub">
                                +{turn.briefEffect.added} to the brief · v{turn.briefEffect.version}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="say">
                          {turn.pending && !turn.text ? (
                            <span className="dots">
                              <span />
                              <span />
                              <span />
                            </span>
                          ) : (
                            turn.text
                              .split('\n')
                              .filter(Boolean)
                              .map((para, k) => <p key={k}>{para}</p>)
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* The reading is a document, so it gets a card rather than being
                    poured into the conversation. Collapsed until asked for. */}
                {claims.length > 0 && (
                  <div className="turn grouped">
                    <span className="av">
                      <Sparkles size={12} />
                    </span>
                    <div className="col">
                      {state.brief?.stale && state.brief.staleReason && (
                        <div className="say" style={{ color: 'var(--conf-med)', fontSize: 11.5 }}>
                          {state.brief.staleReason}{' '}
                          <button className="chip soft" onClick={() => askAgent(state.projectId, '')}>
                            Re-read
                          </button>
                        </div>
                      )}
                      <div className="card">
                        <button className="card-head" onClick={() => setReadingOpen((v) => !v)}>
                          {readingOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          <span className="t">What I understand so far</span>
                          <span className="s">
                            {claimCount} claim{claimCount === 1 ? '' : 's'}
                            {unsourced > 0 && ` · ${unsourced} unsourced`}
                          </span>
                        </button>
                        {readingOpen && (
                          <div className="card-body">
                            {claims.map((group) => (
                              <div key={group.band}>
                                <div className="band-h">{BRIEF_BAND_COPY[group.band].header}</div>
                                {group.lines.map((line) => (
                                  <div className="cl" key={line.id}>
                                    <span
                                      className={`evd ${EV[line.evidenceClass].cls}`}
                                      title={line.evidenceClass}
                                    />
                                    <span className="tx">
                                      {line.text}{' '}
                                      {line.sourceSummary && (
                                        <button className="cite" onClick={() => setCiteLine(line)}>
                                          {line.sourceSummary}
                                        </button>
                                      )}
                                    </span>
                                    {!readOnly && !locked && (
                                      <button
                                        className="promote"
                                        onClick={() => promoteBriefLine(state.projectId, line.id)}
                                      >
                                        + Requirement
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* One question at a time. Sixteen buttons on screen is a form;
                    one question with a few answers is a conversation. */}
                {current && (
                  <div className="turn grouped">
                    <span className="av">
                      <Sparkles size={12} />
                    </span>
                    <div className="col">
                      <div className="q">
                        <div className="q-top">
                          <span className={`track ${current.track.toLowerCase()}`}>
                            {current.track}
                          </span>
                          <span className="q-n">{openQuestions.length} left</span>
                        </div>
                        <div className="q-text">{current.text}</div>
                        {current.rationale && <div className="q-why">{current.rationale}</div>}
                        {!readOnly && !locked && (
                          <div className="chips">
                            <button
                              className="chip"
                              onClick={() =>
                                answerQuestion(state.projectId, current.id, 'Answered', 'Yes')
                              }
                            >
                              Yes
                            </button>
                            <button
                              className="chip"
                              onClick={() =>
                                answerQuestion(state.projectId, current.id, 'Answered', 'No')
                              }
                            >
                              No
                            </button>
                            <button
                              className="chip soft"
                              onClick={() => answerQuestion(state.projectId, current.id, 'Assumed')}
                            >
                              Assume for now
                            </button>
                            <button
                              className="chip soft"
                              onClick={() => answerQuestion(state.projectId, current.id, 'Deferred')}
                            >
                              Skip
                            </button>
                          </div>
                        )}
                        {openQuestions.length > 1 && (
                          <div className="q-rest">{openQuestions.length - 1} more after this</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {state.generating && (
                  <div className="turn grouped">
                    <span className="av">
                      <Sparkles size={12} />
                    </span>
                    <div className="col">
                      <div className="thinking">{state.generating}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* The conversation follows the map. */}
              {nodeContext && (
                <div className="nctx">
                  <span className="nctx-l">Discussing</span>
                  <span className="nctx-p">{nodeContext.path.slice(1).join(' › ')}</span>
                  {nodeContext.evidence && <span className="nctx-e">{nodeContext.evidence}</span>}
                  <button onClick={() => setNodeContext(null)}>×</button>
                </div>
              )}

              {/* ── COMPOSER ── */}
              <div className="composer">
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

                <div className="composer-shell">
                  <div className="composer-box">
                    <button
                      className="clip"
                      title="Attach a PDF, image or document"
                      disabled={readOnly || locked}
                      onClick={() => sourceFileRef.current?.click()}
                    >
                      <Paperclip size={15} />
                    </button>
                    <input
                      ref={sourceFileRef}
                      type="file"
                      accept={INTAKE_ACCEPT}
                      hidden
                      multiple
                      onChange={(e) => {
                        Array.from(e.target.files ?? []).forEach((f: File) =>
                          addSpecSource(
                            state.projectId,
                            f.name,
                            SOURCE_TYPE_FOR_FILE(f.name),
                            `${Math.max(1, Math.round(f.size / 1024))} KB`
                          )
                        );
                        e.target.value = '';
                      }}
                    />

                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={draft}
                      disabled={readOnly || locked}
                      placeholder={
                        locked ? 'The definition is locked' : 'Describe the problem, or ask anything'
                      }
                      onChange={(e) => {
                        setDraft(e.target.value);
                        setMenuOpen(e.target.value.trim().startsWith('/'));
                        /* Grow with the text, the way a message box should. */
                        const el = e.target;
                        el.style.height = 'auto';
                        el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
                      }}
                      onKeyDown={(e) => {
                        /* Enter sends, Shift+Enter breaks the line. */
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                    />

                    <button
                      className="send-fab"
                      title="Send"
                      disabled={readOnly || locked || draft.trim() === ''}
                      onClick={send}
                    >
                      <ArrowUp size={15} />
                    </button>
                  </div>

                  {/* Secondary actions live under the box, not inside it — the
                      composer should look like one thing you type into. */}
                  <div className="composer-foot">
                    <button
                      className="foot-btn"
                      disabled={readOnly || locked || !state.intake?.acceptedAt}
                      onClick={() => setFinalizeOpen(true)}
                    >
                      Finalize the definition
                    </button>
                    <span>·</span>
                    <span>
                      <kbd>/</kbd> for commands, <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ── RAIL ── */}
            <div
              className="splitter"
              role="separator"
              aria-orientation="vertical"
              aria-valuenow={Math.round(split)}
              tabIndex={0}
              title="Drag to resize · double-click to reset"
              onMouseDown={startDrag}
              onDoubleClick={() => setSplit(DEFAULT_SPLIT)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') setSplit((v) => Math.max(30, v - 2));
                if (e.key === 'ArrowRight') setSplit((v) => Math.min(76, v + 2));
              }}
            >
              <i />
            </div>

            {/* ───────────── KNOWLEDGE WORKSPACE ─────────────
                One panel, four readings of the same retrieved knowledge. The map
                is the default because it is the thing the problem statement
                produced; the others are cuts through it. */}
            <aside className="ws">
              <div className="ws-tabs">
                {WS_ORDER.map((t) => (
                  <button
                    key={t}
                    className={wsTab === t ? 'on' : ''}
                    onClick={() => setWsTab(t)}
                  >
                    {t === 'system' ? 'System Map' : t === 'impact' ? 'Change Impact' : 'Open Questions'}
                    {t === 'questions' && gaps.length + driftCount > 0 && (
                      <i>{gaps.length + driftCount}</i>
                    )}
                  </button>
                ))}
              </div>

              {wsTab === 'system' && !modelled && (
                <div className="wpanel">
                  <div className="wempty">
                    <Layers size={22} />
                    <p>No system model connected for this project.</p>
                    <p className="sub">
                      {project.name} has no repositories, APIs or architecture indexed yet, so
                      there is nothing to map. The conversation and the questions still work.
                    </p>
                  </div>
                </div>
              )}
              {wsTab === 'system' && modelled && (
                <Suspense fallback={<div className="rail-empty">Loading map…</div>}>
                  <SystemMap
                    compact
                    onExpand={() => setMapFull(true)}
                    onDiscuss={askFromMap}
                    onSelect={(path, evidence) => setNodeContext({ path, evidence })}
                    focus={lens.focus}
                  />
                </Suspense>
              )}
              {wsTab === 'impact' && !modelled && (
                <div className="wpanel">
                  <div className="wempty">
                    <Layers size={22} />
                    <p>Impact needs a system model.</p>
                    <p className="sub">
                      Reach is walked over the graph. Without one there is nothing honest to
                      report.
                    </p>
                  </div>
                </div>
              )}
              {wsTab === 'impact' && modelled && (
                <ImpactPanel
                  onDiscuss={(q) => askFromMap(q)}
                  lens={impactLens}
                  onLens={setImpactLens}
                />
              )}
              {wsTab === 'questions' && (
                <OpenQuestions
                  state={state}
                  orch={orch}
                  onDiscuss={(q) => askFromMap(q)}
                  onAnswer={settleGap}
                  onResolveDrift={(property, choice) => settleGap(property, choice)}
                  onSettle={(id, status, answer) => {
                    const q = state.questions.find((x) => x.id === id);
                    answerQuestion(state.projectId, id, status, answer);
                    if (q) {
                      setTab('brief');
                      askAgent(state.projectId, `${q.text} — ${answer ?? status}`);
                    }
                  }}
                />
              )}
            </aside>
          </>
        )}

        {/* ── ARTIFACTS ── */}
        {tab === 'artifacts' && (
          <section className="panel">
            <div className="panel-header">
              <h1>Artifacts</h1>
              <p>
                {building
                  ? 'Being written now — open any of them as they arrive.'
                  : `Approve the critical ones — ${CRITICAL_GROUPS.join(' and ')} — to unlock decomposition.`}
              </p>
            </div>

            {state.artifacts.length === 0 ? (
              <div className="empty-state">
                <p>No artifacts yet.</p>
                <p className="sub">Confirm the Project Brief in the thread, then create them.</p>
              </div>
            ) : (
              <>
                {gateOpen ? (
                  <div className="unlock-banner">
                    <CheckCircle2 size={15} /> Critical artifacts approved — Modules &amp; Features
                    and Stories are open.
                  </div>
                ) : (
                  <div className="gate-note">
                    <Circle size={9} />
                    {criticalApproved.length} of {critical.length} critical artifacts approved.
                    {!readOnly && (
                      <button
                        className="chip soft"
                        style={{ marginLeft: 'auto' }}
                        onClick={approveAllCritical}
                      >
                        Approve all critical
                      </button>
                    )}
                  </div>
                )}

                <table>
                  <thead>
                    <tr>
                      <th>Artifact</th>
                      <th>Group</th>
                      <th>Status</th>
                      <th>Assigned</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {state.artifacts.map((a: ArchArtifact) => {
                      const isBuilding = currentBuild?.id === a.id;
                      const built = builtIds.includes(a.id) || !building;
                      const isCritical = CRITICAL_GROUPS.includes(a.group);
                      return (
                        <tr key={a.id}>
                          <td className="art-name">
                            <button
                              className="art-open"
                              onClick={() => {
                                setOpenArtifact(a.id);
                                setArtifactDraft(a.body);
                              }}
                            >
                              {a.label}
                            </button>
                            {isCritical && (
                              <span className="ev fact" style={{ marginLeft: 6 }}>
                                critical
                              </span>
                            )}
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
                            <select
                              className="art-assign"
                              value={a.assignee ?? ''}
                              disabled={readOnly}
                              onChange={(e) =>
                                assignArtifact(state.projectId, a.id, e.target.value)
                              }
                            >
                              <option value="">Unassigned</option>
                              {reviewers.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="art-acts">
                            {a.status === 'Approved' ? (
                              <button
                                className="approve-btn undo"
                                disabled={readOnly}
                                title="Reopen for changes"
                                onClick={() => unlockArtifact(state.projectId, a.id)}
                              >
                                <Unlock size={11} /> Unlock
                              </button>
                            ) : (
                              <button
                                className="approve-btn"
                                disabled={readOnly || !built}
                                onClick={() => reviewArtifact(state.projectId, a.id)}
                              >
                                Approve
                              </button>
                            )}
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

        {/* ── MODULES & FEATURES — the original surface, kept whole ── */}
        {tab === 'modules' && (
          <div className="legacy">
            {state.modules.length === 0 ? (
              <div className="empty-state" style={{ fontFamily: 'var(--font-body)' }}>
                <p>No module map yet.</p>
                <p className="sub">Generated from the approved artifacts.</p>
                {!readOnly && (
                  <button
                    className="chip selected"
                    style={{ marginTop: 14 }}
                    onClick={() => lockSpecStage(state.projectId, 'artifacts')}
                  >
                    Generate module map
                  </button>
                )}
              </div>
            ) : (
              <Suspense fallback={<Loading />}>
                <Stage4Modules state={state} readOnly={readOnly} locked={false} />
              </Suspense>
            )}
          </div>
        )}

        {/* ── STORIES — the original surface, kept whole ── */}
        {tab === 'stories' && (
          <div className="legacy">
            {state.stories.length === 0 ? (
              <div className="empty-state" style={{ fontFamily: 'var(--font-body)' }}>
                <p>No stories yet.</p>
                <p className="sub">Created straight from the module map.</p>
                {!readOnly && (
                  <button className="chip selected" style={{ marginTop: 14 }} onClick={openStories}>
                    Create stories
                  </button>
                )}
              </div>
            ) : (
              <Suspense fallback={<Loading />}>
                <Stage5Stories
                  state={state}
                  readOnly={readOnly}
                  onViewSource={() => setTab('artifacts')}
                  track={track}
                  onTrackChange={setTrack}
                />
              </Suspense>
            )}
          </div>
        )}
      </main>

      {/* Indexed sources, along the bottom. The only place they are reported —
          the strip that used to sit under the header said the same thing twice. */}
      {orch.phase !== 'idle' && (
        <button className="cbar" onClick={() => setBarOpen((v) => !v)}>
          <span className="cbar-l">Indexed</span>
          {orch.sources.map((src) => (
            <span key={src.key} className={`cbar-s ${src.status.replace(/ /g, '-')}`}>
              {src.label} <b>{src.count}</b>
              {isRunning(src.status) && <i>·{src.status.toLowerCase()}</i>}
              {src.status === 'Skipped' && <i>·skipped</i>}
              {src.status === 'Partial' && <i>·partial</i>}
            </span>
          ))}
          <span className="cbar-more">{barOpen ? 'hide' : 'detail'}</span>
        </button>
      )}

      {barOpen && orch.phase !== 'idle' && (
        <div className="sact-panel">
          {orch.sources.map((src) => (
            <div className="sact-row" key={src.key}>
              <span className="sact-l">{src.label}</span>
              <span className={`sact-s ${src.status.replace(/ /g, '-')}`}>{src.status}</span>
              <span className="sact-d">
                {isRunning(src.status) && src.total
                  ? `${src.done ?? 0} of ${src.total}`
                  : src.detail}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* The map, given room when the panel is not enough. */}
      {mapFull && (
        <div className="kfull" onClick={() => setMapFull(false)}>
          <div className="kfull-inner" onClick={(e) => e.stopPropagation()}>
            <button className="kfull-x" onClick={() => setMapFull(false)}>
              ×
            </button>
            <Suspense fallback={<Loading />}>
              <SystemMap
                onDiscuss={askFromMap}
                onSelect={(path, evidence) => setNodeContext({ path, evidence })}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* One artifact: read it, change it, regenerate it, or take the tick back. */}
      {openArtifact && (() => {
        const art = state.artifacts.find((a) => a.id === openArtifact);
        if (!art) return null;
        return (
          <div className="doc-overlay" onClick={() => setOpenArtifact(null)}>
            <div className="doc art" onClick={(e) => e.stopPropagation()}>
              <header className="doc-head">
                <div>
                  <span className="doc-eyebrow">
                    {art.group} · v{art.versions} · {art.status}
                  </span>
                  <h2>{art.label}</h2>
                </div>
                <button className="doc-x" onClick={() => setOpenArtifact(null)}>
                  <X size={16} />
                </button>
              </header>

              <div className="doc-body">
                {art.stale && (
                  <div className="doc-warn">
                    <AlertTriangle size={13} />
                    <div>Something upstream changed after this was written. Worth a read before approving.</div>
                  </div>
                )}
                {art.flowDiagram && (
                  <Suspense fallback={null}>
                    <DiagramRenderer diagram={art.flowDiagram} />
                  </Suspense>
                )}
                <textarea
                  className="art-body"
                  value={artifactDraft}
                  readOnly={readOnly || art.status === 'Approved'}
                  onChange={(e) => setArtifactDraft(e.target.value)}
                />
                {art.status === 'Approved' && (
                  <p className="doc-note">Approved and read-only. Unlock it to make changes.</p>
                )}
              </div>

              <footer className="doc-foot">
                <span className="doc-fmeta">
                  {art.confidence === 'low' ? 'Low confidence — review before locking' : 'Generated from the locked brief'}
                </span>
                <button
                  className="btn btn-ghost"
                  disabled={readOnly || art.status === 'Approved'}
                  onClick={() => regenerateArtifact(state.projectId, art.id)}
                >
                  <RefreshCw size={12} /> Regenerate
                </button>
                {art.status === 'Approved' ? (
                  <button
                    className="btn btn-ghost"
                    disabled={readOnly}
                    onClick={() => unlockArtifact(state.projectId, art.id)}
                  >
                    <Unlock size={12} /> Unlock
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    disabled={readOnly}
                    onClick={() => {
                      if (artifactDraft !== art.body) updateArtifact(state.projectId, art.id, artifactDraft);
                      reviewArtifact(state.projectId, art.id);
                      setOpenArtifact(null);
                    }}
                  >
                    Save &amp; approve
                  </button>
                )}
              </footer>
            </div>
          </div>
        );
      })()}

      {/* Finalize opens the specification itself. Approving is a considered act,
          so it happens over a document rather than in a chat bubble. */}
      {finalizeOpen && (
        <Suspense fallback={null}>
          <SpecDocument
            state={state}
            decided={Object.values(orch.answers).map((a: LeafAnswer) => a.value)}
            onClose={() => setFinalizeOpen(false)}
            onDiscuss={(q) => {
              setFinalizeOpen(false);
              askFromMap(q);
            }}
            onApprove={() => {
              setFinalizeOpen(false);
              lockSpecStage(state.projectId, 'knowledge');
              /* Approval is the trigger for generation — one action, not two. */
              createArtifacts();
            }}
          />
        </Suspense>
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
                  /* Editing happens on the thread, so go back to it. */
                  setTab('brief');
                  setPheadOpen(true);
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

      {/* Build progress, while you keep working in the thread. */}
      {building && currentBuild && tab === 'brief' && (
        <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 80 }}>
          <div className="rail-card" style={{ width: 230 }}>
            <h3>
              Building{' '}
              <span className="count">
                {builtIds.length}/{state.artifacts.length}
              </span>
            </h3>
            <div className="build" onClick={() => setTab('artifacts')}>
              <span className="spin">
                <Loader2 size={13} className="spinning" />
              </span>
              <span style={{ minWidth: 0 }}>
                <div className="bnm">
                  {state.artifacts.find((a) => a.id === currentBuild.id)?.label}
                </div>
                <div className="reading">reading {currentBuild.reading}…</div>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
