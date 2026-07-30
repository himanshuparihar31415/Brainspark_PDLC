import { Role } from '../types';
import {
  Archetype,
  ArtifactGroup,
  BriefBandKey,
  CardState,
  CardType,
  EvidenceClass,
  IngestState,
  QuestionStatus,
  QuestionTrack,
  RelationKind,
  SourceType,
  SpecAiState,
  SpecQuestion,
  SpecSource,
  SpecStageKey,
  SpecStageState,
  StoryType,
  UnderstandingKey,
  UnderstandingSection,
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
    title: 'Knowledge Creation & Contextualization',
    subtitle: 'Bring together everything you know, inspect what exists, and shape rough requirements.',
    gateLabel: 'Build understanding',
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
    railLabel: 'User Stories',
    title: 'User Stories',
    subtitle:
      'Implementation-ready work items, split into non-technical and technical tracks and generated from your module map.',
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
  /**
   * Board-facing name. The union member is the stable key; this is what the chalk
   * board prints, so a card reads as what a person would call it.
   */
  label: string;
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
    label: 'Evidence',
    icon: 'file',
    border: 'border-slate-300',
    chip: 'bg-slate-100 text-slate-700',
    requiredFields: ['Title', 'Excerpt', 'Source', 'Timestamp'],
  },
  Observation: {
    label: 'Observed flow',
    icon: 'eye',
    border: 'border-emerald-400',
    chip: 'bg-emerald-50 text-emerald-700',
    requiredFields: ['Observed behavior', 'Screen or flow', 'Environment'],
  },
  Idea: {
    label: 'Feature idea',
    icon: 'spark',
    border: 'border-indigo-400',
    chip: 'bg-indigo-50 text-indigo-700',
    requiredFields: ['Idea', 'Rationale', 'Author'],
  },
  Question: {
    label: 'Open question',
    icon: 'question',
    border: 'border-amber-400',
    chip: 'bg-amber-50 text-amber-800',
    requiredFields: ['Question', 'Owner', 'Due state'],
  },
  Conflict: {
    label: 'Conflict',
    icon: 'split',
    border: 'border-rose-400',
    chip: 'bg-rose-50 text-rose-700',
    requiredFields: ['Conflicting claims', 'Sources', 'Decision state'],
  },
  Constraint: {
    label: 'Technical context',
    icon: 'lock',
    border: 'border-blue-400',
    chip: 'bg-blue-50 text-blue-700',
    requiredFields: ['Constraint', 'Source', 'Impacted areas'],
  },
  Decision: {
    label: 'Decision',
    icon: 'check',
    border: 'border-teal-400',
    chip: 'bg-teal-50 text-teal-700',
    requiredFields: ['Decision', 'Decider', 'Rationale', 'Date'],
  },
  'Requirement seed': {
    label: 'Requirement seed',
    icon: 'file-check',
    border: 'border-violet-400',
    chip: 'bg-violet-100 text-violet-700',
    requiredFields: ['Actor', 'Need', 'Value', 'Scope', 'Evidence', 'Status'],
  },
};

/**
 * The line the chalk board prints at the foot of a card. A conflict says how many
 * sources disagree, a question says who it is waiting on, and anything sourced
 * names its source — so the card's standing is readable without opening it.
 */
export const cardFooter = (card: {
  type: CardType;
  provenance?: { system: string; itemId?: string };
  conflict?: unknown;
  owner?: string;
  dueState?: string;
  author?: string;
  evidenceClass: EvidenceClass;
}): string => {
  if (card.type === 'Conflict') return '2 sources disagree';
  if (card.type === 'Question') return card.dueState ?? 'Needs stakeholder input';
  if (card.provenance) return `Source: ${card.provenance.itemId ?? card.provenance.system}`;
  if (card.author) return `Added by ${card.author}`;
  return card.evidenceClass;
};

/** Avatar glyph and tint for a knowledge source, keyed by what it came from. */
export const SOURCE_BADGE: Record<SourceType, { glyph: string; tint: string }> = {
  Jira: { glyph: 'J', tint: 'bg-blue-100 text-blue-700' },
  Confluence: { glyph: 'C', tint: 'bg-sky-100 text-sky-700' },
  DOCX: { glyph: 'D', tint: 'bg-indigo-100 text-indigo-700' },
  PDF: { glyph: 'P', tint: 'bg-rose-100 text-rose-700' },
  TXT: { glyph: 'T', tint: 'bg-slate-200 text-slate-600' },
  URL: { glyph: '↗', tint: 'bg-slate-200 text-slate-600' },
  Transcript: { glyph: 'M', tint: 'bg-violet-100 text-violet-700' },
  App: { glyph: 'A', tint: 'bg-emerald-100 text-emerald-700' },
  Repository: { glyph: '</>', tint: 'bg-slate-800 text-white' },
  Image: { glyph: '▣', tint: 'bg-amber-100 text-amber-700' },
  Audio: { glyph: '♪', tint: 'bg-fuchsia-100 text-fuchsia-700' },
};

/** File extensions the intake picker accepts, and what each becomes. */
export const SOURCE_TYPE_FOR_FILE = (filename: string): SourceType => {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'Image';
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) return 'Audio';
  if (['vtt', 'srt'].includes(ext)) return 'Transcript';
  if (ext === 'pdf') return 'PDF';
  if (['doc', 'docx'].includes(ext)) return 'DOCX';
  return 'TXT';
};

export const INTAKE_ACCEPT =
  '.pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp3,.wav,.m4a,.aac,.vtt,.srt';

export const INGEST_COPY: Record<IngestState, { label: string; chip: string; dot: string }> = {
  Queued: { label: 'Queued', chip: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' },
  Parsing: { label: 'Parsing', chip: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' },
  Indexed: { label: 'Indexed', chip: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  Failed: { label: 'Failed', chip: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
};

// ──────────────── Synthesis: the brief and the question queue ────────────────

export const BRIEF_BANDS: BriefBandKey[] = ['understood', 'inferring', 'cannotTell'];

export const BRIEF_BAND_COPY: Record<
  BriefBandKey,
  { header: string; helper: string; accent: string }
> = {
  understood: {
    header: 'What I understand',
    helper: 'Drawn straight from indexed sources. Each line names its backing.',
    accent: 'border-emerald-300',
  },
  inferring: {
    header: 'What I’m inferring',
    helper: 'Reasoned rather than stated. Confirm before any of it carries weight.',
    accent: 'border-blue-300',
  },
  cannotTell: {
    header: 'What I can’t tell yet',
    helper: 'No source covers this. These became the questions below.',
    accent: 'border-amber-300',
  },
};

export const QUESTION_TRACKS: QuestionTrack[] = ['Product', 'Architecture'];

export const QUESTION_TRACK_COPY: Record<
  QuestionTrack,
  { helper: string; chip: string; defaultOwnerRole: Role }
> = {
  Product: {
    helper: 'Scope, priority, and behaviour a stakeholder decides.',
    chip: 'bg-indigo-50 text-indigo-700',
    defaultOwnerRole: 'Product Manager',
  },
  Architecture: {
    helper: 'Where things live, what they depend on, and what the build must honour.',
    chip: 'bg-slate-800 text-white',
    defaultOwnerRole: 'Architect',
  },
};

export const QUESTION_STATUS_CHIP: Record<QuestionStatus, string> = {
  Open: 'bg-amber-100 text-amber-800',
  Answered: 'bg-emerald-50 text-emerald-700',
  Assumed: 'bg-blue-50 text-blue-700',
  Deferred: 'bg-slate-100 text-slate-500',
};

export const openQuestionsIn = (state: SpecAiState, track?: QuestionTrack): SpecQuestion[] =>
  state.questions.filter((q) => q.status === 'Open' && (!track || q.track === track));

/**
 * Carries the Stage 1 reading into Stage 2 as a starting draft. Only empty
 * sections are filled — the brief seeds Project Understanding, it never
 * overwrites something a person has already written.
 *
 * This is the whole relationship between the two surfaces: Stage 1's brief is
 * disposable and regenerated freely, Stage 2's understanding is edited, owned,
 * and locked. Seeding on lock is the one moment they touch.
 */
export const seedUnderstandingFromBrief = (state: SpecAiState): UnderstandingSection[] => {
  const brief = state.brief;
  if (!brief) return state.understanding;

  const join = (band: BriefBandKey) =>
    brief.bands[band].map((l) => l.text).join(' ');

  const unsettled = state.questions.filter((q) => q.status === 'Open');

  const seed: Partial<Record<UnderstandingSection['key'], string>> = {
    objective: state.problemStatement.trim(),
    currentState: join('understood'),
    assumptions: join('inferring'),
    openQuestions: [join('cannotTell'), ...unsettled.map((q) => `${q.track}: ${q.text}`)]
      .filter(Boolean)
      .join(' '),
  };

  return state.understanding.map((section) => {
    const candidate = seed[section.key];
    if (section.body.trim() !== '' || !candidate) return section;
    return {
      ...section,
      body: candidate,
      versions: section.versions + 1,
      supportingCardIds: section.supportingCardIds,
    };
  });
};

/** Sources that synthesis can actually read. */
export const indexedSources = (state: SpecAiState): SpecSource[] =>
  state.sources.filter((s) => s.ingest === 'Indexed');

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

/**
 * Copilot prompt chips. Each one is a board action wearing a question, so the
 * conversational surface and the direct-manipulation surface can never drift:
 * asking "what is missing?" runs exactly what the Find-gaps button runs.
 */
export interface CopilotSuggestion {
  label: string;
  /** Board action this dispatches. */
  actionId: string;
  /** What the user's turn reads as in the transcript. */
  asks: string;
}

export const COPILOT_SUGGESTIONS: CopilotSuggestion[] = [
  { label: 'What is missing?', actionId: 'gaps', asks: 'What is missing from this?' },
  { label: 'Find evidence', actionId: 'summarize', asks: 'What evidence supports this?' },
  { label: 'Draft requirement', actionId: 'draft', asks: 'Draft a requirement from this.' },
  { label: 'Compare sources', actionId: 'conflicts', asks: 'Do these sources agree?' },
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
  /*
   * Both surfaces count. A question sitting unanswered in the queue is exactly as
   * unresolved as one on the board — promoted ones are skipped so they are not
   * counted twice.
   */
  const openQuestions =
    state.cards.filter(
      (c) => c.type === 'Question' && c.state !== 'Confirmed' && c.state !== 'Superseded'
    ).length +
    state.questions.filter((q) => q.status === 'Open' && !q.cardId).length;
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
      /*
       * Architecture questions gate the stage. An unanswered "where does this
       * live?" propagates into every artifact generated downstream, so it is
       * cheaper to settle it here — answering, assuming, or deferring all count,
       * because a recorded assumption is traceable and silence is not.
       */
      const openArch = openQuestionsIn(state, 'Architecture');
      if (openArch.length > 0)
        return {
          ok: false,
          reason: `${openArch.length} architecture question${
            openArch.length === 1 ? '' : 's'
          } unsettled — answer, assume, or defer before locking.`,
        };

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

// ─────────────────────── Story tracks: technical vs not ───────────────────────

/**
 * Stage 5 splits into two tracks. Non-technical work is what a stakeholder can
 * read and accept on their own; technical work is everything that exists because
 * of how the system is built. The split drives grouping, not permissions —
 * both tracks export to the same backlog.
 */
export type StoryTrack = 'Non-technical' | 'Technical';

export const STORY_TRACKS: StoryTrack[] = ['Non-technical', 'Technical'];

export const STORY_TRACK_OF: Record<StoryType, StoryTrack> = {
  'User story': 'Non-technical',
  'Technical story': 'Technical',
  'API story': 'Technical',
  'Security story': 'Technical',
  'Data story': 'Technical',
  'Testing story': 'Technical',
  'Migration story': 'Technical',
};

export const STORY_TRACK_COPY: Record<StoryTrack, { helper: string; chip: string }> = {
  'Non-technical': {
    helper: 'Customer-facing behaviour a stakeholder can accept without reading the design.',
    chip: 'bg-indigo-50 text-indigo-700',
  },
  Technical: {
    helper: 'Work that exists because of how the system is built — services, contracts, data, tests.',
    chip: 'bg-slate-800 text-white',
  },
};

export const storyTrackCounts = (state: SpecAiState): Record<StoryTrack, number> => ({
  'Non-technical': state.stories.filter((s) => STORY_TRACK_OF[s.storyType] === 'Non-technical')
    .length,
  Technical: state.stories.filter((s) => STORY_TRACK_OF[s.storyType] === 'Technical').length,
});

/**
 * How much of the workspace has actually been looked at: every locked stage
 * counts in full, and the stage in hand counts for the share of its board cards
 * that have moved off Captured.
 */
export const workspaceProgress = (state: SpecAiState): number => {
  const perStage = 1 / SPEC_STAGES.length;
  const locked = state.lockedStages.length * perStage;
  const reviewed = state.cards.length
    ? state.cards.filter((c) => c.state !== 'Captured').length / state.cards.length
    : 0;
  const inFlight = state.lockedStages.length < SPEC_STAGES.length ? reviewed * perStage : 0;
  return Math.round(Math.min(1, locked + inFlight) * 100);
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
