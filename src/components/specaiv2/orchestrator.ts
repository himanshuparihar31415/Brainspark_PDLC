import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Knowledge orchestrator.
 *
 * The problem statement is the only trigger in the product. Everything below is
 * the machinery it sets off, and none of it is a user action: no Run Jira, no Run
 * Code, no Run Architecture. Those are implementation details and they do not
 * belong on screen.
 *
 * Two stages, deliberately. Broad discovery sweeps every connected system to find
 * what might be relevant; focused retrieval then reads deeply only where the
 * problem actually points. Retrieving everything at full depth would be slower,
 * noisier and would bury the few things that matter.
 *
 * Simulated with timers here — the sequencing, the statuses and the incremental
 * re-retrieval are the real design; what sits behind them is not this module's
 * concern.
 */

export type SourceStatus =
  | 'Connecting'
  | 'Discovering'
  | 'Retrieving'
  | 'Analysing'
  | 'Complete'
  | 'Partial'
  | 'Unavailable'
  | 'Permission required'
  | 'Queued'
  | 'Skipped'
  | 'Stale';

export interface KnowledgeSource {
  key: string;
  label: string;
  /** Short count for the strip along the bottom. */
  count: string;
  /** What the expanded panel says about it. */
  detail: string;
  status: SourceStatus;
  done?: number;
  total?: number;
  /** Taxonomy branches this system can speak to, by their label. */
  feeds: string[];
}

/** Terminal states — nothing more is coming without a change upstream. */
const SETTLED: SourceStatus[] = [
  'Complete',
  'Partial',
  'Unavailable',
  'Permission required',
  'Skipped',
];
export const isSettled = (s: SourceStatus) => SETTLED.includes(s);
export const isRunning = (s: SourceStatus) =>
  s === 'Discovering' || s === 'Retrieving' || s === 'Analysing' || s === 'Connecting';

/**
 * The connected systems, and which parts of the specification each can answer.
 * The mapping is what lets a branch say "waiting for architecture" instead of
 * just sitting empty.
 */
const SOURCES: Omit<KnowledgeSource, 'status' | 'done' | 'total'>[] = [
  {
    key: 'code',
    label: 'Code',
    count: '3 repos',
    detail: '3 repositories · services, schema and tests',
    feeds: ['Context', 'System Design', 'Functional Requirements', 'Risks and Unknowns'],
  },
  {
    key: 'jira',
    label: 'Jira',
    count: '24 items',
    detail: '1 epic · 5 stories · 3 defects',
    feeds: ['Context', 'Problem Definition', 'Validation'],
  },
  {
    key: 'apps',
    label: 'Apps',
    count: '9 screens',
    detail: '1 application · 9 screens inspected',
    feeds: ['Experience', 'Inputs'],
  },
  {
    key: 'flows',
    label: 'Flows',
    count: '7 journeys',
    detail: '7 journeys traced end to end',
    feeds: ['Experience', 'Problem Definition'],
  },
];

/** What the agent says when a system comes back — findings, never progress logs. */
const FINDINGS: Record<string, string[]> = {
  code: [
    'There is an existing PIN fallback in the mobile repository — wired, but not surfaced in the current journey.',
    'Session handling last changed four months ago, and that commit removed a device-binding check nothing replaced.',
  ],
  jira: [
    'The backlog already has an authentication epic with five open stories, so this is not starting from nothing.',
  ],
  apps: ['No screen exists for a biometric prompt or its failure state.'],
  flows: ['Login and recovery both route through PIN entry, so removing it would break recovery too.'],
};

export interface Conflict {
  id: string;
  title: string;
  claimA: string;
  claimB: string;
  reason: string;
}

const CONFLICTS: Conflict[] = [
  {
    id: 'c-timeout',
    title: 'Session timeout',
    claimA: 'Security policy — 15 minutes',
    claimB: 'Application configuration — 30 minutes',
    reason: 'Conflicting evidence found',
  },
  {
    id: 'c-fallback',
    title: 'PIN fallback',
    claimA: 'Mobile repository — PIN flow present and functional',
    claimB: 'Product brief — fallback described as removed',
    reason: 'Conflicting evidence found',
  },
  {
    id: 'c-enrol',
    title: 'Device binding on enrolment',
    claimA: 'Identity API — binding available per device',
    claimB: 'Git history — binding check removed and not replaced',
    reason: 'Conflicting evidence found',
  },
];

export interface Narration {
  id: string;
  text: string;
  /** Which system it came out of, for attribution. */
  from?: string;
}

/**
 * A line of the agent's working.
 *
 * Between pressing Analyse and the first finding there was nothing but four
 * status pills changing colour, which reads as a hang. These are the steps it is
 * taking, in the order it takes them — short, present tense, one clause each.
 * They are reasoning, not a progress log: no percentages, no timings, nothing
 * that would be meaningless if the run were instant.
 */
export interface ThinkingStep {
  id: string;
  text: string;
}

export interface LeafAnswer {
  value: string;
  /** Systems re-read because of this answer. */
  affected: string[];
  at: number;
}

/**
 * `scoping` is the pause between the two stages. Broad discovery has finished,
 * focused retrieval has not started, and it is the last moment where correcting
 * the scope costs one click instead of a rewrite. Every artefact downstream
 * inherits this decision, so it is worth the interruption — and it is the only
 * interruption in the whole run.
 */
export type Phase = 'idle' | 'discovering' | 'scoping' | 'retrieving' | 'ready';

const now = () => Date.now();

export const useOrchestrator = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [sources, setSources] = useState<KnowledgeSource[]>(
    SOURCES.map((s) => ({ ...s, status: 'Queued' }))
  );
  const [narration, setNarration] = useState<Narration[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [answers, setAnswers] = useState<Record<string, LeafAnswer>>({});
  const [thinking, setThinking] = useState<ThinkingStep[]>([]);
  /** Seconds the run took, once it has finished — for the collapsed summary. */
  const [thoughtFor, setThoughtFor] = useState<number | null>(null);

  const timers = useRef<number[]>([]);
  const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const patch = (key: string, next: Partial<KnowledgeSource>) =>
    setSources((prev) => prev.map((s) => (s.key === key ? { ...s, ...next } : s)));

  const startedAt = useRef(0);
  const think = (text: string) =>
    setThinking((prev) => [...prev, { id: `t${prev.length}-${now()}`, text }]);

  /**
   * The one action. Everything after this happens without being asked for.
   */
  const analyse = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setNarration([]);
    setConflicts([]);
    setThinking([]);
    setThoughtFor(null);
    startedAt.current = now();
    setPhase('discovering');
    setSources(SOURCES.map((s) => ({ ...s, status: 'Queued' })));

    think('Reading the problem statement and pulling out what it names.');

    /* Stage 1 — broad discovery. Every system, shallow, fast. */
    SOURCES.forEach((s, i) => {
      at(120 + i * 90, () => patch(s.key, { status: 'Discovering' }));
    });

    at(340, () => think(`Sweeping ${SOURCES.map((s) => s.label).join(', ')} for anything related.`));
    at(760, () => think('Ranking what came back by how close it sits to the change.'));

    /* Discovery done: stop and show what we intend to read deeply. */
    at(1100, () => {
      think('Enough to propose a scope — checking it with you before reading deeply.');
      setPhase('scoping');
    });
  }, []);

  /**
   * Stage 2 — focused retrieval, once the scope has been confirmed.
   *
   * Takes what to *skip*, not what to keep. The confirmation panel only offers
   * the sources anyone actually rules on, so an allow-list would have quietly
   * excluded every source it had no candidates for — a system nobody was asked
   * about would end up marked "excluded from scope" as if they had unticked it.
   */
  const confirmScope = useCallback((skipSystems?: string[]) => {
    setPhase('retrieving');

    const skip = new Set((skipSystems ?? []).map((a) => a.toLowerCase()));

    SOURCES.forEach((s, i) => {
      if (skip.has(s.label.toLowerCase())) {
        patch(s.key, { status: 'Skipped', detail: 'excluded from scope' });
        return;
      }
      const base = i * 260;
      const total = parseInt(s.count, 10) || 6;

      at(base, () => think(`Reading ${s.label} — ${s.detail}.`));
      at(base, () => patch(s.key, { status: 'Retrieving', done: 0, total }));
      at(base + 320, () =>
        patch(s.key, { status: 'Analysing', done: Math.max(1, Math.floor(total / 2)), total })
      );

      at(base + 780, () => {
        /* Not everything comes back clean, and pretending otherwise would make a
           reading look more complete than it is. */
        const status: SourceStatus =
          s.key === 'flows' ? 'Partial' : 'Complete';
        patch(s.key, { status, done: status === 'Partial' ? Math.floor(total * 0.6) : total, total });

        const lines = FINDINGS[s.key] ?? [];
        if (lines.length > 0) {
          setNarration((prev) => [
            ...prev,
            ...lines.map((text, k) => ({ id: `${s.key}-${k}-${now()}`, text, from: s.label })),
          ]);
        }
      });
    });

    /* Consolidation: what disagrees only becomes visible once several systems
       have been read against each other. */
    const settleAt = SOURCES.length * 260 + 900;
    at(settleAt - 300, () => think('Cross-checking what each system claims against the others.'));
    at(settleAt, () => {
      think(`${CONFLICTS.length} of them disagree — those become questions rather than claims.`);
      setThoughtFor(Math.max(1, Math.round((now() - startedAt.current) / 1000)));
      setConflicts(CONFLICTS);
      setNarration((prev) => [
        ...prev,
        {
          id: `sum-${now()}`,
          text: `I found ${CONFLICTS.length} conflicts between your systems and a handful of decisions only you can make. They are in Open Questions.`,
        },
      ]);
      setPhase('ready');
    });
  }, []);

  /**
   * Greenfield — there is nothing to read.
   *
   * Confirm-scope assumed a system already exists, which left a new project with
   * one usable button and a list of somebody else's services to untick. Skipping
   * every source through `confirmScope([])` would have worked mechanically and
   * then reported three conflicts between systems it never read, which is worse
   * than no path at all: retrieval findings and cross-system conflicts are both
   * meaningless here.
   *
   * So the run still happens — it just ends with decisions to make rather than
   * findings to reconcile.
   */
  const goGreenfield = useCallback(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setPhase('retrieving');
    setConflicts([]);
    setSources(
      SOURCES.map((s) => ({
        ...s,
        status: 'Skipped' as SourceStatus,
        count: '—',
        detail: 'greenfield — nothing to read yet',
      }))
    );

    think('Nothing connected to read — treating this as a new build.');
    at(300, () => think('Working the specification out from the statement alone.'));
    at(700, () => {
      think('Listing the decisions this needs before anything can be designed.');
      setThoughtFor(Math.max(1, Math.round((now() - startedAt.current) / 1000)));
      setNarration([
        {
          id: `gf-${now()}`,
          text:
            'Nothing existing to read, so the specification is built from your problem statement alone. ' +
            'That means everything is a decision rather than a finding — I have put the ones I need in Open Questions.',
        },
      ]);
      setPhase('ready');
    });
  }, []);

  /**
   * A confirmed answer changes what is true, so the systems it touches are read
   * again — and only those. Re-running everything on every answer is how a
   * workspace becomes something you avoid using.
   */
  const answerLeaf = useCallback(
    (nodeId: string, value: string, branchLabel: string) => {
      const affected = SOURCES.filter((s) => s.feeds.includes(branchLabel)).map((s) => s.key);

      setAnswers((prev) => ({ ...prev, [nodeId]: { value, affected, at: now() } }));

      affected.forEach((key, i) => {
        at(80 + i * 90, () => patch(key, { status: 'Analysing' }));
        at(900 + i * 120, () => patch(key, { status: 'Complete' }));
      });

      setNarration((prev) => [
        ...prev,
        {
          id: `ans-${now()}`,
          text:
            affected.length > 0
              ? `Noted. That changes ${branchLabel.toLowerCase()}, so I am re-reading ${affected.length} connected ${
                  affected.length === 1 ? 'system' : 'systems'
                } against it.`
              : 'Noted, and folded into the brief.',
        },
      ]);
    },
    []
  );

  const resolveConflictLocal = useCallback((id: string) => {
    setConflicts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /** Which systems still owe a branch something, for the tree's status line. */
  const pendingFor = useCallback(
    (branchLabel: string) =>
      sources.filter((s) => s.feeds.includes(branchLabel) && !isSettled(s.status)),
    [sources]
  );

  const running = sources.filter((s) => isRunning(s.status));
  const settled = sources.filter((s) => isSettled(s.status));

  return {
    phase,
    sources,
    narration,
    conflicts,
    answers,
    thinking,
    thoughtFor,
    analyse,
    confirmScope,
    goGreenfield,
    answerLeaf,
    resolveConflictLocal,
    pendingFor,
    runningCount: running.length,
    settledCount: settled.length,
  };
};

export type Orchestrator = ReturnType<typeof useOrchestrator>;
