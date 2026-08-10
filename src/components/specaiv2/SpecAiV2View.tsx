import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import './specai-v2.css';
import { useApp } from '../../context/AppContext';
import {
  ArtifactGroup,
  BriefLine,
  SourceType,
  SpecAiState,
} from '../../types/specai';
import { BRIEF_BANDS, SOURCE_TYPE_FOR_FILE, canEditSpecAi } from '../../data/specai';
import { criticalGaps } from '../../data/specKnowledgeTree';
import { LeafAnswer, isRunning, useOrchestrator } from './orchestrator';
import { OpenQuestions } from './WorkspaceTabs';
import { ImpactPanel } from './ImpactPanel';
import { ArtifactsPanel } from './ArtifactsPanel';
import { PhaseRail, WS_ITEMS, Phase, WsKey } from './PhaseRail';
import { UnderstandingPanel } from './UnderstandingPanel';
import { lensFor } from './personas';
/* Nine artifacts carry a full node-and-edge diagram; the old surface rendered
   them and this one did not. */
const DiagramRenderer = lazy(() =>
  import('../specai/DiagramRenderer').then((m) => ({ default: m.DiagramRenderer }))
);
const SpecDocument = lazy(() =>
  import('./SpecDocument').then((m) => ({ default: m.SpecDocument }))
);
import { scopeBySource, scopeItems } from '../../data/specDelta';
import { hasSystemModel, reconcile } from '../../data/specSystemModel';
import {
  AlertTriangle,
  ArrowUp,
  AudioLines,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileStack,
  FileText,
  GitBranch,
  Image as ImageIcon,
  Link2,
  Loader2,
  Layers,
  Lock,
  MonitorSmartphone,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Play,
  RefreshCw,
  ScrollText,
  Sparkles,
  Ticket,
  Unlock,
  Upload,
  Waypoints,
  X,
} from 'lucide-react';

/* Delivery carries the module tree and the story list; loaded when a spec gets
   that far rather than up front. */
/* The map carries the whole taxonomy and React Flow, so it loads on demand. */
/* The system map is the default view: it is what the problem statement
   actually produced. The taxonomy stays as a completeness checklist. */
const SystemMap = lazy(() =>
  import('./SystemMap').then((m) => ({ default: m.SystemMap }))
);
const DeliveryPanel = lazy(() =>
  import('./DeliveryPanel').then((m) => ({ default: m.DeliveryPanel }))
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

/* Three phases now: define the problem, agree the understanding, decompose it.
   The rail owns the order and the nesting — see PhaseRail. */
type Tab = Phase;

/**
 * The four connected systems, as marks rather than words. "Code · Jira · Apps ·
 * Flows" in 9px mono is four labels you have to read; four icons are four things
 * you recognise, which is what a status strip is for.
 */
const SYSTEM_ICON: Record<string, React.ElementType> = {
  code: GitBranch,
  jira: Ticket,
  apps: MonitorSmartphone,
  flows: Waypoints,
};

/**
 * What each kind of attachment looks like at 11px. Attachments were going into
 * the state and then only being visible through the agent quoting them, so a
 * file you uploaded left no trace on screen you could point at.
 */
const SOURCE_ICON: Record<SourceType, React.ElementType> = {
  PDF: FileText,
  DOCX: FileText,
  TXT: FileText,
  URL: Link2,
  Confluence: Layers,
  Jira: Ticket,
  Repository: GitBranch,
  Transcript: AudioLines,
  App: MonitorSmartphone,
  Image: ImageIcon,
  Audio: AudioLines,
};

/**
 * What can be brought in by hand.
 *
 * Documents and images only. Jira, Confluence and repositories are *connected*
 * systems — the orchestrator reads them, and it reads all of them, so offering
 * them here as things to upload one at a time would be offering a worse version
 * of something already happening. The shared INTAKE_ACCEPT still carries audio
 * and transcripts for the original surface; this one does not.
 */
const V2_ACCEPT = '.pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.svg';

/** Only these reach the strip — a connected system is not an attachment. */
const ATTACHABLE: SourceType[] = ['PDF', 'DOCX', 'TXT', 'Image'];

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
    teamMembers,
    specAiFor,
    startFromProblem,
    setProblemStatement,
    askAgent,
    answerQuestion,
    promoteBriefLine,
    addSpecSource,
    removeSpecSource,
    lockSpecStage,
    unlockSpecStage,
    reviewArtifact,
    unlockArtifact,
    assignArtifact,
    updateArtifact,
    regenerateArtifact,
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

  /* The rail collapses to a strip of dots — still readable, 34px wide. */
  /* The panel beside the chat shows one of two readings of the same thing. */
  /* The panel opens where this persona's question lives. */
  const lens = useMemo(() => lensFor(currentRole), [currentRole]);
  /* Change Impact for everyone. What a change touches is the question every role
     arrives with; the persona difference that earns its keep is which lens it
     opens in and what the map emphasises, not which tab is in front. */
  const [wsTab, setWsTab] = useState<WsKey>('impact');
  /* The rail folds to icons when the work wants the width. */
  const [railMini, setRailMini] = useState(false);

  /* The five readings are stacked, so the strip jumps rather than filters and
     `wsTab` is now "what you are looking at" rather than "what is rendered". */
  const stackRef = useRef<HTMLDivElement>(null);
  /* Everything starts folded. Five sections open at once is a wall on arrival,
     and the conversation is what you came for — the panel is reference you pull
     open, not the first thing competing for the screen. */
  const [folded, setFolded] = useState<Set<WsKey>>(
    () => new Set(WS_ITEMS.map((i) => i.key))
  );
  /* The panel is open on arrival — the sections inside it are what start folded,
     so it is present without being a wall to read past. It still closes to a
     strip of marks when the conversation wants the width. */
  const [wsOpen, setWsOpen] = useState(true);

  const foldSection = (key: WsKey) =>
    setFolded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const jumpTo = (key: WsKey) => {
    setWsTab(key);
    setWsOpen(true);
    /* Unfold what you asked to see — jumping to a folded section lands on a
       header with nothing under it. */
    setFolded((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    /* The panel may have been closed a line ago, so wait for it to exist. */
    window.setTimeout(() => {
      stackRef.current
        ?.querySelector(`#wsx-${key}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  /* Which section you are actually in, so the strip reflects the scroll rather
     than only the last thing clicked. */
  useEffect(() => {
    const root = stackRef.current;
    if (!root) return;
    const onScroll = () => {
      const top = root.getBoundingClientRect().top;
      let nearest: WsKey | null = null;
      let best = Infinity;
      for (const { key } of WS_ITEMS) {
        const el = root.querySelector(`#wsx-${key}`);
        if (!el) continue;
        const d = Math.abs(el.getBoundingClientRect().top - top);
        if (d < best) [best, nearest] = [d, key];
      }
      if (nearest) setWsTab(nearest);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, [tab]);
  /* The working is open while it runs and folds to one line once it is done. */
  const [thinkOpen, setThinkOpen] = useState(true);
  useEffect(() => {
    if (orch.thoughtFor) setThinkOpen(false);
  }, [orch.thoughtFor]);

  /* Nothing has been given yet, so there is nothing for the agent to say. */
  /* Uploads only. A Jira or Confluence connection is read by the orchestrator,
     not carried in the strip as though somebody had dragged it in. */
  const attachments = useMemo(
    () => state.sources.filter((s) => ATTACHABLE.includes(s.type)),
    [state.sources]
  );
  const hasIntake = state.problemStatement.trim().length > 0 || attachments.length > 0;
  /* The persona decides which impact tile leads. Both are always shown, so this
     is an ordering, not a filter. */

  /* Scope candidates, clubbed by the system that surfaced them. Everything is in
     by default — the user is trimming, not assembling. */
  const groups = useMemo(() => scopeBySource(), []);
  const scopeAll = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  /* The panel shows the top few per source. The header says so rather than
     letting a trimmed list read as the whole of what discovery found. */
  const scopeFound = useMemo(() => scopeItems().length, []);
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

  const openQuestions = state.questions.filter((q) => q.status === 'Open');

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
  /* Kept below with the other claim metrics — see `context`. */
  const unsourced = claims.reduce(
    (n, g) =>
      n +
      g.lines.filter(
        (l) => l.evidenceClass !== 'Source fact' && l.evidenceClass !== 'User decision'
      ).length,
    0
  );

  /**
   * How much the workspace is standing on, as one number.
   *
   * Coverage in the header answers "how much of the specification is filled in".
   * This answers the different and more useful question: how much of what is
   * filled in is actually grounded. Two halves — how much of the connected
   * estate was read, and how much of what is claimed cites a source — with a
   * deduction for disagreements, because a conflict is context you have but
   * cannot rely on yet.
   */
  const context = useMemo(() => {
    const read =
      orch.sources.length === 0
        ? 0
        : orch.sources.reduce(
            (n, s) => n + (s.status === 'Complete' ? 1 : s.status === 'Partial' ? 0.5 : 0),
            0
          ) / orch.sources.length;
    const grounded = claimCount === 0 ? 0 : (claimCount - unsourced) / claimCount;
    const score = Math.max(
      0,
      Math.round((read * 55 + grounded * 45) - orch.conflicts.length * 5)
    );
    return {
      score,
      read,
      grounded,
      band: score >= 70 ? 'hi' : score >= 40 ? 'md' : 'lo',
      /* Whichever half is holding the number down is the thing to go fix. */
      weakest:
        orch.conflicts.length > 0
          ? `${orch.conflicts.length} unresolved conflict${
              orch.conflicts.length === 1 ? '' : 's'
            }`
          : read < 0.6
          ? `${orch.sources.filter((s) => s.status === 'Complete').length}/${
              orch.sources.length
            } systems read`
          : unsourced > 0
          ? `${unsourced} claim${unsourced === 1 ? '' : 's'} without a source`
          : 'grounded',
    };
  }, [orch.sources, orch.conflicts.length, claimCount, unsourced]);

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
    /* Artifacts live beside the conversation now, so stay on the thread and
       scroll the stack to them — setting the key alone moves nothing. */
    setTab('brief');
    jumpTo('artifacts');
  };

  /* One door now the two surfaces are one tree. */
  const openDelivery = () => {
    if (state.modules.length === 0) lockSpecStage(state.projectId, 'artifacts');
    setTab('delivery');
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

  /* Understanding opens as soon as there is a brief to read; generating the
     artifacts from it is the act that closes it. */
  /* The PRD is written from the artifacts, so it opens when they are signed off.
     Understanding moved inside Problem Definition — it is read alongside the
     material it was built from, not after it. */
  const prd = state.artifacts.find((a) => a.group === 'Product');
  const prdHint = gateOpen
    ? undefined
    : 'Approve the critical artifacts — the PRD is written from them';

  return (
    <div className="sx">
      {/* The top bar is gone. Its title repeated whichever phase the rail was
          already highlighting, and the project, tasks and account moved into the
          foot of the rail — so the whole strip was a row of height holding one
          duplicated label. The chat gets it. */}
      <div className="shell">
        <PhaseRail
          collapsed={railMini}
          onToggleCollapsed={() => setRailMini((v) => !v)}
          phase={tab}
          prdOpen={gateOpen}
          prdHint={prdHint}
          deliveryOpen={gateOpen}
          deliveryHint={gateHint}
          counts={{ stories: state.stories.length }}
          onPick={(p) => {
            if (p === 'delivery') return openDelivery();
            setTab(p);
          }}
        />

        <div className="shell-main">

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
            <ChevronDown size={12} />
          </button>
        ) : (
        <div className="phead-card">
          <div className="phead-main">
            {/* Four things, not seven. The pencil went because the statement is
                already click-to-edit, and the analysis status moved to sit with
                the number it describes. */}
            <div className="phead-lbl">
              <span>Problem statement</span>
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
                    <Upload size={12} /> Upload
                  </button>
                  <input
                    ref={problemFileRef}
                    type="file"
                    accept={V2_ACCEPT}
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

          {/* No number here. Coverage and the systems count were both readouts
              of the run, and the run already reports itself twice — the thinking
              block while it happens, the indexed strip after. A third copy over
              the statement was noise on the one thing that should be readable. */}
          <div className="phead-side">
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

            {/* Collapsing is a card-level action, so it sits at the card edge
                rather than inside the label row. */}
            <button
              className="phead-edit"
              title="Collapse"
              onClick={() => setPheadOpen(false)}
            >
              <ChevronUp size={13} />
            </button>
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
            <b>Confirm scope</b> — discovery found {scopeFound} things this problem touches across{' '}
            {groups.length} systems. The {scopeAll.length} most relevant are below; untick anything
            that should be left alone.
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
              /* Skip only what was actively emptied. A source with nothing in
                 this panel was never offered, so it is read as normal. */
              onClick={() =>
                orch.confirmScope(
                  groups
                    .filter((g) => !g.items.some((i) => selected.has(i.node.id)))
                    .map((g) => g.system)
                )
              }
            >
              Looks right — go deep
            </button>
            {/* The other answer. Until now the only way through assumed a system
                already exists, which left a new build ticking through somebody
                else's services to say none of them apply. */}
            <button className="btn btn-outline" onClick={orch.goGreenfield}>
              <Sparkles size={13} /> None of this — greenfield
            </button>
            <button className="foot-btn" onClick={() => jumpTo('system')}>
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
            <section
              className="thread-panel"
              style={{ flex: wsOpen ? `0 0 ${split}%` : '1 1 auto' }}
            >
              {/* What has been brought in, as a strip rather than a list. It sits
                  above the thread because it is context for everything in it, and
                  it stays one line however much gets attached. */}
              {attachments.length > 0 && (
                <div className="upstrip">
                  <span className="upstrip-l">
                    <Paperclip size={10} />
                    {attachments.length}
                  </span>
                  <div className="upstrip-items">
                    {attachments.map((s) => {
                      const Icon = SOURCE_ICON[s.type] ?? FileText;
                      return (
                        <span
                          className={`upchip ${s.ingest}`}
                          key={s.id}
                          title={`${s.name} · ${s.type}${s.detail ? ` · ${s.detail}` : ''} · ${
                            s.ingest
                          }`}
                        >
                          {s.ingest === 'Parsing' || s.ingest === 'Queued' ? (
                            <Loader2 size={11} className="spinning" />
                          ) : (
                            <Icon size={11} />
                          )}
                          <b>{s.name}</b>
                          {!readOnly && !locked && (
                            <button
                              className="upchip-x"
                              title="Remove"
                              onClick={() => removeSpecSource(state.projectId, s.id)}
                            >
                              <X size={9} />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="messages" ref={messagesRef}>
                {/* Nothing until there is something to talk about. The agent
                    greeting before any input was the agent speaking first about
                    a problem nobody had stated yet. */}
                {!hasIntake && state.transcript.length === 0 && (
                  <div className="thread-empty">
                    <p>Start with the problem, or upload what you have.</p>
                  </div>
                )}

                {/* The working, while it is working. */}
                {orch.thinking.length > 0 && (
                  <div className="turn grouped enter">
                    <span className="av">
                      <Sparkles size={12} />
                    </span>
                    <div className="col">
                      <div className={`think ${orch.thoughtFor ? 'done' : ''}`}>
                        <button className="think-h" onClick={() => setThinkOpen((v) => !v)}>
                          {orch.thoughtFor ? (
                            <Check size={11} />
                          ) : (
                            <Loader2 size={11} className="spinning" />
                          )}
                          <span>
                            {orch.thoughtFor
                              ? `Thought for ${orch.thoughtFor}s`
                              : orch.thinking[orch.thinking.length - 1].text}
                          </span>
                          {thinkOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                        {thinkOpen && (
                          <ol className="think-l">
                            {orch.thinking.map((t, i) => (
                              <li
                                key={t.id}
                                className={
                                  !orch.thoughtFor && i === orch.thinking.length - 1 ? 'now' : ''
                                }
                              >
                                {t.text}
                              </li>
                            ))}
                          </ol>
                        )}
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

                {/* The brief moved to its own phase. What stays in the thread is
                    the pointer to it — a claim list is a document, and it was
                    living in a disclosure widget between two chat bubbles. */}
                {claimCount > 0 && (
                  <div className="turn grouped enter">
                    <span className="av">
                      <Sparkles size={12} />
                    </span>
                    <div className="col">
                      <button className="brief-ptr" onClick={() => setTab('understanding')}>
                        <BookOpen size={13} />
                        <span>
                          The brief is at {claimCount} claim{claimCount === 1 ? '' : 's'}
                          {unsourced > 0 && ` · ${unsourced} unconfirmed`}
                        </span>
                        <em>Open Understanding</em>
                        <ChevronRight size={12} />
                      </button>
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
                      accept={V2_ACCEPT}
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

            {/* Only meaningful when there is a second panel to size against. */}
            {wsOpen && (
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
            )}

            {/* ───────────── KNOWLEDGE WORKSPACE ─────────────
                Five readings of the same retrieved knowledge, stacked. Closed on
                arrival: it is reference you pull open, not a thing competing
                with the conversation for the screen. */}
            {!wsOpen ? (
              <div className="ws-shut">
                <button
                  className="ws-shut-open"
                  title="Open the workspace"
                  onClick={() => setWsOpen(true)}
                >
                  <PanelRightOpen size={14} />
                </button>
                {WS_ITEMS.map(({ key, label, icon: Icon }) => {
                  const badge =
                    key === 'questions' && gaps.length + driftCount > 0
                      ? gaps.length + driftCount
                      : key === 'artifacts' && critical.length > 0
                      ? critical.length - criticalApproved.length || null
                      : key === 'understanding' && claimCount > 0
                      ? claimCount
                      : null;
                  return (
                    <button
                      key={key}
                      className="ws-shut-i"
                      title={label}
                      onClick={() => jumpTo(key)}
                    >
                      <Icon size={14} />
                      {badge ? <i>{badge}</i> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
            <aside className="ws">
              {/* What the panel below is standing on. Coverage in the header is
                  how much is filled in; this is how much of it is grounded. */}
              {orch.phase !== 'idle' && (
                <div className={`ctx ${context.band}`} title="Share of the estate read, weighted with how much of the brief cites a source, less unresolved conflicts">
                  <b>{context.score}%</b>
                  <span>context confidence</span>
                  <em>{context.weakest}</em>
                  <i>
                    <i style={{ width: `${context.score}%` }} />
                  </i>
                </div>
              )}

              <button
                className="ws-close"
                title="Close the workspace"
                onClick={() => setWsOpen(false)}
              >
                <PanelRightClose size={13} /> Close
              </button>

              {/* Everything, stacked. Switching between five readings meant
                  holding four of them in your head; scrolling past them does
                  not. Each section folds when it is in the way — its sticky
                  header is the only navigation the stack needs. */}
              <div className="ws-stack" ref={stackRef}>
                <section className="wsx" id="wsx-impact">
                  <button className="wsx-h" onClick={() => foldSection('impact')}>
                    {folded.has('impact') ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    <b>Change Impact</b>
                    <span>what this touches, in Jira and in the code</span>
                  </button>
                  {!folded.has('impact') &&
                    (modelled ? (
                      <ImpactPanel onDiscuss={(q) => askFromMap(q)} lens={lens.impactLens} />
                    ) : (
                      <div className="wpanel">
                        <div className="wempty">
                          <Layers size={22} />
                          <p>Impact needs a system model.</p>
                          <p className="sub">
                            Reach is walked over the graph. Without one there is nothing honest
                            to report.
                          </p>
                        </div>
                      </div>
                    ))}
                </section>

                <section className="wsx" id="wsx-system">
                  <button className="wsx-h" onClick={() => foldSection('system')}>
                    {folded.has('system') ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    <b>System Map</b>
                    <span>where it sits</span>
                  </button>
                  {!folded.has('system') &&
                    (modelled ? (
                      <div className="wsx-map">
                        <Suspense fallback={<div className="rail-empty">Loading map…</div>}>
                          <SystemMap
                            compact
                            onExpand={() => setMapFull(true)}
                            onDiscuss={askFromMap}
                            onSelect={(path, evidence) => setNodeContext({ path, evidence })}
                            focus={lens.focus}
                          />
                        </Suspense>
                      </div>
                    ) : (
                      <div className="wpanel">
                        <div className="wempty">
                          <Layers size={22} />
                          <p>No system model connected for this project.</p>
                          <p className="sub">
                            {project.name} has no repositories, APIs or architecture indexed yet,
                            so there is nothing to map. The conversation and the questions still
                            work.
                          </p>
                        </div>
                      </div>
                    ))}
                </section>

                <section className="wsx" id="wsx-questions">
                  <button className="wsx-h" onClick={() => foldSection('questions')}>
                    {folded.has('questions') ? (
                      <ChevronRight size={13} />
                    ) : (
                      <ChevronDown size={13} />
                    )}
                    <b>Open Questions</b>
                    {gaps.length + driftCount > 0 && <i>{gaps.length + driftCount}</i>}
                    <span>what only you can settle</span>
                  </button>
                  {!folded.has('questions') && (
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
                          askAgent(state.projectId, q.text + ' — ' + (answer ?? status));
                        }
                      }}
                    />
                  )}
                </section>

                <section className="wsx" id="wsx-artifacts">
                  <button className="wsx-h" onClick={() => foldSection('artifacts')}>
                    {folded.has('artifacts') ? (
                      <ChevronRight size={13} />
                    ) : (
                      <ChevronDown size={13} />
                    )}
                    <b>Artifacts</b>
                    {critical.length > 0 && (
                      <i>
                        {criticalApproved.length}/{critical.length}
                      </i>
                    )}
                    <span>what the definition produced</span>
                  </button>
                  {!folded.has('artifacts') && (
                    <ArtifactsPanel
                      state={state}
                      readOnly={readOnly}
                      criticalGroups={CRITICAL_GROUPS}
                      building={building}
                      builtIds={builtIds}
                      currentBuild={currentBuild}
                      onOpen={(id) => {
                        const a = state.artifacts.find((x) => x.id === id);
                        setOpenArtifact(id);
                        setArtifactDraft(a?.body ?? '');
                      }}
                    />
                  )}
                </section>

                <section className="wsx" id="wsx-understanding">
                  <button className="wsx-h" onClick={() => foldSection('understanding')}>
                    {folded.has('understanding') ? (
                      <ChevronRight size={13} />
                    ) : (
                      <ChevronDown size={13} />
                    )}
                    <b>Understanding</b>
                    {claimCount > 0 && <i>{claimCount}</i>}
                    <span>what we now believe</span>
                  </button>
                  {!folded.has('understanding') && (
                    <UnderstandingPanel
                      state={state}
                      readOnly={readOnly}
                      locked={state.lockedStages.includes('understanding')}
                      building={building}
                      hasArtifacts={state.artifacts.length > 0}
                      onPromote={(id) => promoteBriefLine(state.projectId, id)}
                      onCite={setCiteLine}
                      onReread={() => askAgent(state.projectId, '')}
                      onGenerate={createArtifacts}
                      onOpenSpec={() => setFinalizeOpen(true)}
                    />
                  )}
                </section>
              </div>
            </aside>
            )}
          </>
        )}

        {/* ── PRD — the product requirement document the artifacts produced ── */}
        {tab === 'prd' && (
          <div className="prd">
            {!prd ? (
              <div className="und-empty">
                <ScrollText size={22} />
                <p>No PRD yet.</p>
                <p className="sub">
                  It is written from the signed-off artifacts. Generate them from Understanding
                  first.
                </p>
              </div>
            ) : (
              <>
                <header className="prd-head">
                  <div>
                    <span className="und-eyebrow">
                      {prd.group} · v{prd.versions}
                      {prd.stale && ' · needs review'}
                    </span>
                    <h2>{prd.label}</h2>
                  </div>
                  <div className="und-acts">
                    {prd.status === 'Approved' ? (
                      <span className="und-locked">
                        <Lock size={11} /> Approved
                      </span>
                    ) : (
                      <button
                        className="btn btn-primary"
                        disabled={readOnly}
                        onClick={() => reviewArtifact(state.projectId, prd.id)}
                      >
                        Approve
                      </button>
                    )}
                    <button className="btn btn-ghost" onClick={() => setFinalizeOpen(true)}>
                      <FileStack size={13} /> Full specification
                    </button>
                  </div>
                </header>
                <div className="prd-body">
                  <pre>{prd.body}</pre>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── DELIVERY — modules, features and stories as one tree ── */}
        {tab === 'delivery' && (
          <Suspense fallback={<Loading />}>
            <DeliveryPanel state={state} readOnly={readOnly} />
          </Suspense>
        )}

      </main>

      {/* Indexed sources, along the bottom. The only place they are reported —
          the strip that used to sit under the header said the same thing twice. */}
      {orch.phase !== 'idle' && (
        <button className="cbar" onClick={() => setBarOpen((v) => !v)}>
          <span className="cbar-l">Indexed</span>
          <span className="cbar-row">
            {orch.sources.map((src) => {
              const Icon = SYSTEM_ICON[src.key] ?? Layers;
              const pct =
                src.total && src.done !== undefined
                  ? Math.round((src.done / src.total) * 100)
                  : null;
              return (
                <span
                  key={src.key}
                  className={`csrc ${src.status.replace(/ /g, '-')}`}
                  title={`${src.label} — ${src.status}${src.detail ? ` · ${src.detail}` : ''}`}
                >
                  <span className="csrc-i">
                    {isRunning(src.status) ? (
                      <Loader2 size={10} className="spinning" />
                    ) : (
                      <Icon size={10} />
                    )}
                  </span>
                  <b>{src.label}</b>
                  <em>{src.count}</em>
                  {/* Progress fills the pill itself rather than adding a row. */}
                  {isRunning(src.status) && pct !== null && (
                    <span className="csrc-fill" style={{ width: `${pct}%` }} />
                  )}
                </span>
              );
            })}
          </span>
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

        </div>
      </div>

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

                <label className="art-assign-row">
                  Reviewer
                  <select
                    value={art.assignee ?? ''}
                    disabled={readOnly}
                    onChange={(e) => assignArtifact(state.projectId, art.id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {reviewers.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
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
      {building && currentBuild && wsTab !== 'artifacts' && (
        <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 80 }}>
          <div className="rail-card" style={{ width: 230 }}>
            <h3>
              Building{' '}
              <span className="count">
                {builtIds.length}/{state.artifacts.length}
              </span>
            </h3>
            <div className="build" onClick={() => jumpTo('artifacts')}>
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
