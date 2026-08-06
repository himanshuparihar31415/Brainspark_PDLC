import { BriefLine, SpecAiState, UnderstandingKey } from '../types/specai';
import { UNDERSTANDING_COPY } from './specai';

/**
 * Per-item confidence for the Spec AI rail.
 *
 * Scored against every item, not a reduced set of three — a single score, or a
 * coarse grouping, hides exactly the gap the rail exists to surface.
 *
 * Derived, never stored. A stored score can only be nudged, and the most important
 * thing this can tell you is that confidence went *down* because a new source
 * contradicted something. That only works if the value is recomputed from evidence
 * every render.
 */

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface FacetConfidence {
  key: UnderstandingKey;
  label: string;
  level: ConfidenceLevel;
  /** Claims backed by a source or a decision. */
  supported: number;
  total: number;
  /** Distinct sources behind the supported claims. */
  sources: number;
  /** An unresolved disagreement touches this item, which caps it at Low. */
  conflicted: boolean;
  /** One line explaining the level, shown under the bar. */
  why: string;
}

export const FACET_ORDER: UnderstandingKey[] = [
  'objective',
  'primaryUsers',
  'currentState',
  'proposedState',
  'inScope',
  'outOfScope',
  'constraints',
  'assumptions',
  'openQuestions',
];

/**
 * Which item a claim belongs to.
 *
 * The agent will eventually tag lines as it writes them; until then this reads the
 * text. Order matters — the first match wins, so the more specific patterns come
 * before the general ones.
 */
const FACET_HINTS: { key: UnderstandingKey; test: RegExp }[] = [
  { key: 'outOfScope', test: /\b(out of scope|excluded|not in scope|won'?t (be )?(include|cover)|deferred)\b/i },
  { key: 'inScope', test: /\b(in scope|scope (is|covers)|includes|covers the)\b/i },
  { key: 'constraints', test: /\b(must|cannot|constraint|limit|compliance|regulat|deadline|budget|SLA|latency)\b/i },
  { key: 'primaryUsers', test: /\b(user|customer|persona|stakeholder|audience|guest|member|admin)s?\b/i },
  { key: 'currentState', test: /\b(current|today|existing|as-is|legacy|at present|right now)\b/i },
  { key: 'proposedState', test: /\b(should|will|propose|target state|to-be|new flow|redesign)\b/i },
  { key: 'assumptions', test: /\b(assum|presum|infer|likely|probably|we think)\b/i },
  { key: 'openQuestions', test: /\b(unclear|unknown|no source|not stated|question|undecided|tbd)\b/i },
];

export const facetOf = (line: BriefLine): UnderstandingKey => {
  for (const hint of FACET_HINTS) if (hint.test.test(line.text)) return hint.key;
  /* Anything that is not obviously about scope, users or state is read as being
     about what the project is for. */
  return 'objective';
};

const allLines = (state: SpecAiState): BriefLine[] =>
  state.brief ? Object.values(state.brief.bands).flat() : [];

/** Unresolved disagreements, and the sources they sit between. */
const conflictedSourceIds = (state: SpecAiState): Set<string> => {
  const ids = new Set<string>();
  for (const card of state.cards) {
    if (card.type === 'Disagreement' && card.state === 'Flagged' && card.sourceId) {
      ids.add(card.sourceId);
    }
  }
  return ids;
};

export const facetConfidence = (state: SpecAiState, key: UnderstandingKey): FacetConfidence => {
  const label = UNDERSTANDING_COPY[key].header;
  const lines = allLines(state).filter((l) => facetOf(l) === key);
  const conflictIds = conflictedSourceIds(state);

  const supportedLines = lines.filter(
    (l) => l.evidenceClass === 'Source fact' || l.evidenceClass === 'User decision'
  );
  const sources = new Set(supportedLines.flatMap((l) => l.sourceIds)).size;
  const conflicted = lines.some((l) => l.sourceIds.some((id) => conflictIds.has(id)));

  /* An item nobody has written about yet is Low, and says so — that is a gap, not
     a neutral state. */
  if (lines.length === 0) {
    return {
      key,
      label,
      level: 'low',
      supported: 0,
      total: 0,
      sources: 0,
      conflicted: false,
      why: 'Nothing covers this yet',
    };
  }

  const ratio = supportedLines.length / lines.length;

  let level: ConfidenceLevel;
  let why: string;

  if (conflicted) {
    level = 'low';
    why = 'Sources disagree — decide it in the rail';
  } else if (ratio < 0.5) {
    level = 'low';
    why = `${supportedLines.length} of ${lines.length} claims are sourced`;
  } else if (ratio < 1) {
    level = 'medium';
    why = `${lines.length - supportedLines.length} claim${
      lines.length - supportedLines.length === 1 ? '' : 's'
    } still unsourced`;
  } else if (sources < 2) {
    level = 'medium';
    why = 'All sourced, but from one source only';
  } else {
    level = 'high';
    why = `${sources} sources agree`;
  }

  return {
    key,
    label,
    level,
    supported: supportedLines.length,
    total: lines.length,
    sources,
    conflicted,
    why,
  };
};

const RANK: Record<ConfidenceLevel, number> = { low: 0, medium: 1, high: 2 };

/**
 * Every item, weakest first, conflicts ahead of everything else.
 *
 * The rail reads this so it answers "what is weakest right now" rather than
 * reciting nine numbers in a fixed order. The agent's question ranking should read
 * the same function, so the rail and the next question can never disagree about
 * where the gap is.
 */
export const facetsByWeakest = (state: SpecAiState): FacetConfidence[] =>
  FACET_ORDER.map((key) => facetConfidence(state, key)).sort((a, b) => {
    if (a.conflicted !== b.conflicted) return a.conflicted ? -1 : 1;
    if (RANK[a.level] !== RANK[b.level]) return RANK[a.level] - RANK[b.level];
    /* Same level: the one resting on less evidence is the weaker. */
    return a.total - b.total;
  });

/** Rolled up for the card in the Command Centre. */
export const confidenceSummary = (
  state: SpecAiState
): { high: number; medium: number; low: number } => {
  const all = FACET_ORDER.map((k) => facetConfidence(state, k));
  return {
    high: all.filter((f) => f.level === 'high').length,
    medium: all.filter((f) => f.level === 'medium').length,
    low: all.filter((f) => f.level === 'low').length,
  };
};
