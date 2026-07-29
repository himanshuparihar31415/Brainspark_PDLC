import { Role } from '../types';
import {
  Archetype,
  ArtifactGroup,
  CardState,
  CardType,
  EvidenceClass,
  RelationKind,
  SpecAiState,
  SpecStageKey,
  SpecStageState,
  StoryType,
  UnderstandingKey,
} from '../types/specai';

export interface SpecStageDef {
  key: SpecStageKey;
  index: number;
  railLabel: string;
  title: string;
  subtitle: string;
  /** Label on the stage-advancing gate button. */
  gateLabel: string;
}

export const SPEC_STAGES: SpecStageDef[] = [
  {
    key: 'knowledge',
    index: 1,
    railLabel: 'Knowledge',
    title: 'Requirement Chalk Board',
    subtitle:
      'Bring together evidence, observations, ideas, and decisions before formalizing requirements.',
    gateLabel: 'Build project understanding',
  },
  {
    key: 'understanding',
    index: 2,
    railLabel: 'Understanding',
    title: 'Project Understanding',
    subtitle: 'The convergence of everything you brought in. Edit any section, then lock.',
    gateLabel: 'Lock understanding and generate artifacts',
  },
  {
    key: 'artifacts',
    index: 3,
    railLabel: 'Artifacts',
    title: 'Artifact Studio',
    subtitle: 'The full package, generated in one pass. Review, edit, or regenerate any piece.',
    gateLabel: 'Approve package and map modules',
  },
  {
    key: 'modules',
    index: 4,
    railLabel: 'Modules & Features',
    title: 'Modules & Features',
    subtitle: 'The system, decomposed. Rearrange until it’s right, then finalize.',
    gateLabel: 'Finalize map and generate stories',
  },
  {
    key: 'stories',
    index: 5,
    railLabel: 'Stories',
    title: 'Stories',
    subtitle: 'Implementation-ready work items, generated from your module map.',
    gateLabel: 'Review and export to Jira',
  },
];

export const stageDef = (key: SpecStageKey): SpecStageDef =>
  SPEC_STAGES.find((s) => s.key === key) as SpecStageDef;

export const stageIndex = (key: SpecStageKey): number => stageDef(key).index;

/**
 * A stage is reachable only when every stage before it is locked. That is the
 * whole gating rule — everything else follows from it.
 */
export const stageStateFor = (key: SpecStageKey, state: SpecAiState): SpecStageState => {
  if (state.lockedStages.includes(key)) return 'Locked';
  const previous = SPEC_STAGES.filter((s) => s.index < stageIndex(key));
  return previous.every((s) => state.lockedStages.includes(s.key)) ? 'Current' : 'Locked out';
};

export const isStageReachable = (key: SpecStageKey, state: SpecAiState): boolean =>
  stageStateFor(key, state) !== 'Locked out';

export const activeStage = (state: SpecAiState): SpecStageKey =>
  SPEC_STAGES.find((s) => !state.lockedStages.includes(s.key))?.key ?? 'stories';

// ───────────────────────────── Card vocabulary ─────────────────────────────

export interface CardTypeMeta {
  /** Lucide icon name resolved by the board component. */
  icon: 'file' | 'eye' | 'spark' | 'question' | 'split' | 'lock' | 'check' | 'file-check';
  /** Tailwind classes for the card border and its type chip. */
  border: string;
  chip: string;
  /** Fields the type requires, shown in the inspector. */
  requiredFields: string[];
}

export const CARD_TYPES: Record<CardType, CardTypeMeta> = {
  Evidence: {
    icon: 'file',
    border: 'border-slate-200',
    chip: 'bg-slate-100 text-slate-700',
    requiredFields: ['Title', 'Excerpt', 'Source', 'Timestamp'],
  },
  Observation: {
    icon: 'eye',
    border: 'border-emerald-200',
    chip: 'bg-emerald-50 text-emerald-700',
    requiredFields: ['Observed behavior', 'Screen or flow', 'Environment'],
  },
  Idea: {
    icon: 'spark',
    border: 'border-indigo-200',
    chip: 'bg-indigo-50 text-indigo-700',
    requiredFields: ['Idea', 'Rationale', 'Author'],
  },
  Question: {
    icon: 'question',
    border: 'border-amber-200',
    chip: 'bg-amber-50 text-amber-800',
    requiredFields: ['Question', 'Owner', 'Due state'],
  },
  Conflict: {
    icon: 'split',
    border: 'border-rose-300',
    chip: 'bg-rose-50 text-rose-700',
    requiredFields: ['Conflicting claims', 'Sources', 'Decision state'],
  },
  Constraint: {
    icon: 'lock',
    border: 'border-blue-200',
    chip: 'bg-blue-50 text-blue-700',
    requiredFields: ['Constraint', 'Source', 'Impacted areas'],
  },
  Decision: {
    icon: 'check',
    border: 'border-teal-200',
    chip: 'bg-teal-50 text-teal-700',
    requiredFields: ['Decision', 'Decider', 'Rationale', 'Date'],
  },
  'Requirement seed': {
    icon: 'file-check',
    border: 'border-violet-300',
    chip: 'bg-violet-100 text-violet-700',
    requiredFields: ['Actor', 'Need', 'Value', 'Scope', 'Evidence', 'Status'],
  },
};

/** Card states, and what each one allows next. */
export const CARD_STATES: Record<CardState, { chip: string; nextActions: string[] }> = {
  Captured: {
    chip: 'bg-slate-100 text-slate-600',
    nextActions: ['Tag', 'Group', 'Link', 'Inspect', 'Ask AI'],
  },
  Interpreted: {
    chip: 'bg-blue-50 text-blue-700',
    nextActions: ['Edit', 'Confirm', 'Reject', 'Compare'],
  },
  Flagged: {
    chip: 'bg-amber-50 text-amber-800',
    nextActions: ['Resolve', 'Ask stakeholder', 'Mark assumption'],
  },
  Confirmed: {
    chip: 'bg-emerald-50 text-emerald-700',
    nextActions: ['Create requirement seed'],
  },
  'Requirement seed': {
    chip: 'bg-violet-100 text-violet-700',
    nextActions: ['Send to requirements'],
  },
  Superseded: {
    chip: 'bg-slate-100 text-slate-400',
    nextActions: ['Retained for audit'],
  },
};

/** Evidence hierarchy, so a sourced fact never reads like an AI guess. */
export const EVIDENCE_CLASSES: Record<EvidenceClass, { chip: string; short: string }> = {
  'Source fact': { chip: 'bg-slate-900 text-white', short: 'Fact' },
  'User decision': { chip: 'bg-teal-600 text-white', short: 'Decision' },
  'Inferred interpretation': { chip: 'bg-blue-600 text-white', short: 'Inferred' },
  'AI assumption': { chip: 'bg-amber-500 text-white', short: 'Assumption' },
};

export const RELATION_KINDS: RelationKind[] = [
  'Supports',
  'Contradicts',
  'Depends on',
  'Refines',
  'Supersedes',
];

/** Selection-scoped AI actions. Every one operates on the current selection. */
export interface BoardAction {
  id: string;
  label: string;
  /** Minimum cards the action needs. */
  minSelection: number;
}

export const BOARD_ACTIONS: BoardAction[] = [
  { id: 'summarize', label: 'Summarize', minSelection: 1 },
  { id: 'group', label: 'Group', minSelection: 2 },
  { id: 'gaps', label: 'Find gaps', minSelection: 1 },
  { id: 'conflicts', label: 'Find conflicts', minSelection: 2 },
  { id: 'draft', label: 'Draft requirement', minSelection: 1 },
  { id: 'remove', label: 'Remove', minSelection: 1 },
];

export const DEFAULT_LANES = [
  { id: 'lane-inputs', name: 'Inputs' },
  { id: 'lane-current', name: 'Current State' },
  { id: 'lane-proposed', name: 'Proposed Change' },
  { id: 'lane-decisions', name: 'Open Decisions' },
];

// ───────────────────────────── Readiness & gates ─────────────────────────────

export interface Readiness {
  percent: number;
  /** The explanation line under the headline number. */
  explanation: string;
  sourcesReady: number;
  conflictsResolved: number;
  conflictsOpen: number;
  openQuestions: number;
  confirmedSeeds: number;
}

/**
 * Knowledge readiness combines source coverage, unresolved conflicts, open
 * questions, and confirmed requirement seeds — the four things that decide
 * whether the board is safe to build an understanding from.
 */
export const knowledgeReadiness = (state: SpecAiState): Readiness => {
  const sourcesReady = state.channels.filter((c) => c.status === 'Ready').length;
  const conflicts = state.cards.filter((c) => c.type === 'Conflict');
  const conflictsOpen = conflicts.filter((c) => c.state === 'Flagged').length;
  const conflictsResolved = conflicts.length - conflictsOpen;
  const openQuestions = state.cards.filter(
    (c) => c.type === 'Question' && c.state !== 'Confirmed' && c.state !== 'Superseded'
  ).length;
  const confirmedSeeds = state.cards.filter(
    (c) => c.type === 'Requirement seed' && c.state !== 'Superseded'
  ).length;

  const coverage = state.channels.length === 0 ? 0 : sourcesReady / state.channels.length;
  const seedScore = Math.min(1, confirmedSeeds / 8);
  const penalty = conflictsOpen * 0.08 + openQuestions * 0.03;

  const percent = Math.max(
    0,
    Math.min(100, Math.round((coverage * 0.4 + seedScore * 0.6 - penalty) * 100))
  );

  const parts = [
    `${sourcesReady} source${sourcesReady === 1 ? '' : 's'} ready`,
    `${conflictsResolved} conflict${conflictsResolved === 1 ? '' : 's'} resolved`,
    `${openQuestions} open question${openQuestions === 1 ? '' : 's'}`,
    `${confirmedSeeds} confirmed requirement seed${confirmedSeeds === 1 ? '' : 's'}`,
  ];

  return {
    percent,
    explanation: parts.join(' · '),
    sourcesReady,
    conflictsResolved,
    conflictsOpen,
    openQuestions,
    confirmedSeeds,
  };
};

/** One-line summary of what is in a stage right now, shown under its rail entry. */
export const stageDetail = (key: SpecStageKey, state: SpecAiState): string => {
  switch (key) {
    case 'knowledge': {
      const r = knowledgeReadiness(state);
      return r.conflictsOpen > 0
        ? `${state.cards.length} cards · ${r.conflictsOpen} conflict${
            r.conflictsOpen === 1 ? '' : 's'
          }`
        : `${state.cards.length} cards · ${r.percent}% ready`;
    }
    case 'understanding': {
      const filled = state.understanding.filter((s) => s.body.trim() !== '').length;
      return `${filled}/${state.understanding.length} sections · ${state.requirements.length} requirements`;
    }
    case 'artifacts': {
      if (state.artifacts.length === 0) return 'not generated';
      const stale = state.artifacts.filter((a) => a.stale).length;
      return stale > 0
        ? `${state.artifacts.length} artifacts · ${stale} to review`
        : `${state.artifacts.length} artifacts`;
    }
    case 'modules': {
      if (state.modules.length === 0) return 'no modules';
      const features = state.modules.reduce((n, m) => n + m.features.length, 0);
      return `${state.modules.length} modules · ${features} features`;
    }
    default: {
      if (state.stories.length === 0) return 'not generated';
      const pending = state.stories.filter((s) => !s.exported).length;
      return pending > 0
        ? `${state.stories.length} stories · ${pending} to export`
        : `${state.stories.length} stories exported`;
    }
  }
};

export interface GateCheck {
  ok: boolean;
  /** Why the gate is closed, shown on the disabled control. */
  reason?: string;
}

export const canLockStage = (key: SpecStageKey, state: SpecAiState): GateCheck => {
  switch (key) {
    case 'knowledge': {
      const openConflicts = state.cards.filter(
        (c) => c.type === 'Conflict' && c.state === 'Flagged'
      );
      if (openConflicts.length > 0) {
        const influenced = state.cards.filter(
          (c) => c.type === 'Requirement seed' && c.state !== 'Superseded'
        ).length;
        return {
          ok: false,
          reason: `This conflict is still influencing ${influenced} requirement seed${
            influenced === 1 ? '' : 's'
          }.`,
        };
      }
      const seeds = state.cards.filter((c) => c.type === 'Requirement seed').length;
      if (seeds === 0) return { ok: false, reason: 'Confirm at least one requirement seed first.' };
      return { ok: true };
    }
    case 'understanding': {
      const empty = state.understanding.filter((s) => s.body.trim() === '').length;
      if (empty > 0) return { ok: false, reason: 'Every section needs content before locking.' };
      const unresolved = state.understanding
        .find((s) => s.key === 'openQuestions')
        ?.body.trim();
      if (state.requirements.length === 0 && !unresolved)
        return { ok: false, reason: 'Confirm at least one formal requirement first.' };
      return { ok: true };
    }
    case 'artifacts': {
      if (state.archMode === 'Brownfield' && !state.hasLegacyArchitecture)
        return {
          ok: false,
          reason: 'Add the existing architecture in the Knowledge stage first.',
        };
      const low = state.artifacts.filter((a) => a.confidence === 'low' || a.stale).length;
      if (low > 0)
        return {
          ok: false,
          reason: `${low} artifact${low === 1 ? '' : 's'} need review before approval.`,
        };
      return { ok: true };
    }
    case 'modules': {
      if (state.modules.length === 0) return { ok: false, reason: 'Add at least one module.' };
      const bare = state.modules.find((m) => m.features.length === 0);
      if (bare) return { ok: false, reason: `${bare.name} has no features yet.` };
      return { ok: true };
    }
    default:
      return { ok: true };
  }
};

/** Story types that must be mapped before an export can run. */
export const unmappedStoryTypes = (state: SpecAiState): StoryType[] => {
  const used = [...new Set(state.stories.map((s) => s.storyType))];
  return used.filter((t) => !state.jiraMapping.issueTypes[t]);
};

// ───────────────────────────── Copy & permissions ─────────────────────────────

export const UNDERSTANDING_COPY: Record<UnderstandingKey, { header: string; helper: string }> = {
  objective: { header: 'Objective', helper: 'What is this project trying to achieve?' },
  primaryUsers: { header: 'Primary users', helper: 'Who is this for?' },
  currentState: { header: 'Current state', helper: 'How does it work today?' },
  proposedState: { header: 'Proposed state', helper: 'How should it work?' },
  inScope: { header: 'In scope', helper: 'Draw the inner edge.' },
  outOfScope: { header: 'Out of scope', helper: 'Draw the outer edge.' },
  constraints: { header: 'Constraints', helper: 'What must we work within?' },
  assumptions: { header: 'Assumptions', helper: 'What are we taking as given?' },
  openQuestions: { header: 'Open questions', helper: 'Nothing outstanding.' },
};

export const ARTIFACT_GROUP_ORDER: ArtifactGroup[] = [
  'Product',
  'Architecture',
  'Contracts',
  'Decisions',
  'Visuals',
];

export const ARCHETYPES: Archetype[] = [
  {
    id: 'arch-auth',
    name: 'Authentication module',
    description: 'OAuth 2.0, session handling, MFA and recovery flows.',
  },
  {
    id: 'arch-payments',
    name: 'Payments flow',
    description: 'Checkout, ledger posting, reconciliation and refunds.',
  },
  {
    id: 'arch-notify',
    name: 'Notifications',
    description: 'Templating, delivery channels and preference management.',
  },
];

/**
 * Spec AI is the Product Manager and Architect's shared pipeline. Everyone else
 * may look but not edit, matching the read-only rule for workspaces outside your
 * own module.
 */
export const SPEC_OWNER_ROLES: Role[] = ['Product Manager', 'Architect'];

export const canEditSpecAi = (role: Role): boolean => SPEC_OWNER_ROLES.includes(role);
