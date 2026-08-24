import { ArtifactGroup, SpecAiState } from '../types/specai';
import { BRIEF_BANDS } from './specai';

/**
 * The Spec AI v2 model, derived in one place.
 *
 * The Command Centre door and the workspace itself both have to describe where a
 * specification has got to, and they were describing two different products: the
 * card reported the original five-stage model — "Knowledge Creation &
 * Contextualization", a stage-weighted percentage — while the workspace you
 * landed in has three phases and gates on artifact approval. Same project, two
 * vocabularies, and the card's was for a surface the button does not open.
 *
 * So the derivations live here and both read them.
 */

/** The PRD is a phase of its own, not one of the supporting artifacts. */
export const PRD_GROUP: ArtifactGroup = 'Product';

/** Of the rest, the ones the PRD is actually written from — they gate it. */
export const CRITICAL_GROUPS: ArtifactGroup[] = ['Architecture', 'Contracts'];

export type V2PhaseKey = 'brief' | 'prd' | 'delivery';

export const V2_PHASE_LABEL: Record<V2PhaseKey, string> = {
  brief: 'Problem Definition',
  prd: 'PRD',
  delivery: 'Specs',
};

export interface V2Signals {
  /** Claims in the brief, and how many of them nothing has confirmed. */
  claims: number;
  unconfirmed: number;
  openQuestions: number;
  /** Supporting artifacts that gate the PRD. */
  criticalTotal: number;
  criticalApproved: number;
  prdApproved: boolean;
  stories: number;
  /** True once the definition has been finalized. */
  definitionLocked: boolean;
  started: boolean;
}

export const v2Signals = (state: SpecAiState): V2Signals => {
  const lines = state.brief ? BRIEF_BANDS.flatMap((b) => state.brief!.bands[b]) : [];

  const supporting = state.artifacts.filter((a) => a.group !== PRD_GROUP);
  const critical = supporting.filter((a) => CRITICAL_GROUPS.includes(a.group));
  const prd = state.artifacts.find((a) => a.group === PRD_GROUP);

  return {
    claims: lines.length,
    unconfirmed: lines.filter(
      (l) => l.evidenceClass !== 'Source fact' && l.evidenceClass !== 'User decision'
    ).length,
    openQuestions: state.questions.filter((q) => q.status === 'Open').length,
    criticalTotal: critical.length,
    criticalApproved: critical.filter((a) => a.status === 'Approved').length,
    prdApproved: prd?.status === 'Approved',
    stories: state.stories.length,
    definitionLocked: state.lockedStages.includes('knowledge'),
    started: Boolean(state.intake?.acceptedAt),
  };
};

/**
 * The gates, exactly as the workspace applies them: the PRD opens when every
 * critical artifact is approved, and Specs open when the PRD is agreed.
 */
export const v2Gates = (s: V2Signals) => {
  const prdOpen = s.criticalTotal > 0 && s.criticalApproved === s.criticalTotal;
  return { prdOpen, deliveryOpen: prdOpen && s.prdApproved };
};

/** How far the specification has actually got, rather than which tab is selected. */
export const v2Phase = (state: SpecAiState): V2PhaseKey => {
  const gates = v2Gates(v2Signals(state));
  if (gates.deliveryOpen) return 'delivery';
  if (gates.prdOpen) return 'prd';
  return 'brief';
};

/**
 * Progress as a count of gates passed, not a weighted guess.
 *
 * Each step is something that either happened or did not, so the number can
 * always be explained by pointing at one — which is the only kind of percentage
 * worth putting on a card.
 */
export const V2_STEPS = [
  'Problem stated',
  'Brief has claims',
  'Definition finalized',
  'Critical artifacts approved',
  'PRD approved',
  'Specs generated',
] as const;

export const v2StepsDone = (s: V2Signals): boolean[] => [
  s.started,
  s.claims > 0,
  s.definitionLocked,
  s.criticalTotal > 0 && s.criticalApproved === s.criticalTotal,
  s.prdApproved,
  s.stories > 0,
];

export const v2Progress = (state: SpecAiState): number => {
  const done = v2StepsDone(v2Signals(state)).filter(Boolean).length;
  return Math.round((done / V2_STEPS.length) * 100);
};

/**
 * The one thing the specification is waiting on, said in the words the
 * workspace uses. Null when nothing is outstanding.
 */
export const v2NextAction = (s: V2Signals): string | null => {
  if (!s.started) return null;
  if (s.openQuestions > 0)
    return `${s.openQuestions} question${s.openQuestions === 1 ? '' : 's'} to answer`;
  if (!s.definitionLocked) return 'Finalize the definition';
  if (s.criticalTotal === 0) return 'Generate the artifacts';
  if (s.criticalApproved < s.criticalTotal)
    return `Approve ${s.criticalTotal - s.criticalApproved} critical artifact${
      s.criticalTotal - s.criticalApproved === 1 ? '' : 's'
    }`;
  if (!s.prdApproved) return 'Approve the PRD';
  if (s.stories === 0) return 'Decompose into specs';
  return null;
};

// ────────────────────────────── Sessions ──────────────────────────────

/**
 * What a session is called before anyone renames it.
 *
 * The first clause of the problem statement, near enough — a name you can find
 * a row by, rather than a paragraph in a table cell. The statement itself stays
 * whole; this is only the label on it.
 */
export const sessionTitleFrom = (statement: string): string => {
  const clean = statement.trim().replace(/\s+/g, ' ');
  if (!clean) return 'Untitled specification';

  /* Prefer a natural break, then fall back to a word boundary near the cap. */
  const stop = clean.search(/[.;:—]|\sbecause\s|\sso that\s/i);
  const head = stop > 24 ? clean.slice(0, stop) : clean;
  if (head.length <= 58) return head;

  const cut = head.slice(0, 58);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 30 ? cut.lastIndexOf(' ') : 58)}…`;
};

/**
 * How long ago a session was touched, in the terms a list needs: precise while
 * that matters, coarse once it does not.
 */
export const sessionAge = (iso: string, now: number = Date.now()): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';

  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(then).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
