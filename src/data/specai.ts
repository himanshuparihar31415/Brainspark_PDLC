import { Role } from '../types';
import {
  Archetype,
  SpecAiState,
  SpecStageKey,
  SpecStageState,
  UnderstandingKey,
} from '../types/specai';

export interface SpecStageDef {
  key: SpecStageKey;
  /** Ordinal shown on the stage rail. */
  index: number;
  railLabel: string;
  /** Full name, used for the screen title and the rail tooltip. */
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
    subtitle: 'Create and contextualize what you know. Use either path, or both.',
    gateLabel: 'Lock knowledge & build understanding',
  },
  {
    key: 'understanding',
    index: 2,
    railLabel: 'Understanding',
    title: 'Project Understanding',
    subtitle: 'The convergence of everything you brought in. Edit any field, then lock.',
    gateLabel: 'Lock understanding & generate architecture',
  },
  {
    key: 'architecture',
    index: 3,
    railLabel: 'Architecture',
    title: 'Architecture',
    subtitle:
      'The full design package, generated in one pass. Review, edit, or regenerate any piece.',
    gateLabel: 'Lock architecture & map modules',
  },
  {
    key: 'modules',
    index: 4,
    railLabel: 'Modules & Features',
    title: 'Modules & Features',
    subtitle: 'The system, decomposed. Rearrange until it’s right, then finalize.',
    gateLabel: 'Finalize map & generate stories',
  },
  {
    key: 'stories',
    index: 5,
    railLabel: 'Stories',
    title: 'Stories',
    subtitle: 'Jira-ready stories, generated from your module map.',
    gateLabel: 'Export to Jira',
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
  const allPreviousLocked = previous.every((s) => state.lockedStages.includes(s.key));
  return allPreviousLocked ? 'Current' : 'Locked out';
};

export const isStageReachable = (key: SpecStageKey, state: SpecAiState): boolean =>
  stageStateFor(key, state) !== 'Locked out';

/** The furthest stage the user may currently work in. */
export const activeStage = (state: SpecAiState): SpecStageKey => {
  const firstUnlocked = SPEC_STAGES.find((s) => !state.lockedStages.includes(s.key));
  return firstUnlocked?.key ?? 'stories';
};

export interface GateCheck {
  ok: boolean;
  /** Why the gate is closed, shown on the disabled control. */
  reason?: string;
}

/** Per-stage preconditions for locking. */
export const canLockStage = (key: SpecStageKey, state: SpecAiState): GateCheck => {
  switch (key) {
    case 'knowledge': {
      const openFlags = state.flaggedQuestions.filter((f) => f.status === 'Open').length;
      if (openFlags > 0) return { ok: false, reason: 'Resolve all flagged questions first.' };
      const hasKnowledge = state.sources.length > 0 || state.chalkBoard.acceptedRequirements > 0;
      if (!hasKnowledge)
        return { ok: false, reason: 'Add a source or accept a requirement first.' };
      return { ok: true };
    }
    case 'understanding': {
      const empty = state.understanding.filter((s) => s.body.trim() === '').length;
      if (empty > 0) return { ok: false, reason: 'Every section needs content before locking.' };
      return { ok: true };
    }
    case 'architecture': {
      if (state.archMode === 'Brownfield' && !state.hasLegacyArchitecture)
        return {
          ok: false,
          reason: 'Upload or link the existing architecture in the Knowledge stage first.',
        };
      const lowConfidence = state.artifacts.filter((a) => a.confidence === 'low').length;
      if (lowConfidence > 0)
        return {
          ok: false,
          reason: `${lowConfidence} low-confidence section${
            lowConfidence === 1 ? '' : 's'
          } need review before locking.`,
        };
      return { ok: true };
    }
    case 'modules': {
      if (state.modules.length === 0) return { ok: false, reason: 'Add at least one module.' };
      const emptyModules = state.modules.filter((m) => m.features.length === 0);
      if (emptyModules.length > 0)
        return { ok: false, reason: `${emptyModules[0].name} has no features yet.` };
      return { ok: true };
    }
    default:
      return { ok: true };
  }
};

/** Section headers and empty-state helpers for the Project Understanding editor. */
export const UNDERSTANDING_COPY: Record<
  UnderstandingKey,
  { header: string; helper: string }
> = {
  objective: {
    header: 'Objective summary',
    helper: 'What is this project trying to achieve?',
  },
  stakeholders: { header: 'Stakeholders', helper: 'Who’s involved and what do they need?' },
  scope: { header: 'In scope / Out of scope', helper: 'Draw the edges.' },
  assumptions: { header: 'Assumptions', helper: 'What are we taking as given?' },
  questions: { header: 'Open questions', helper: 'Nothing outstanding.' },
};

export const ARTIFACT_GROUP_ORDER = [
  'Design docs',
  'Diagrams',
  'Contracts',
  'Decisions',
] as const;

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
 * Spec AI is the PM and Architect's shared pipeline. Everyone else may look but
 * not edit, matching the read-only rule for workspaces outside your module.
 */
export const SPEC_OWNER_ROLES: Role[] = ['Product Manager', 'Architect'];

export const canEditSpecAi = (role: Role): boolean => SPEC_OWNER_ROLES.includes(role);

/** Which persona label the shell shows. Non-owners see their own role. */
export const specPersonaLabel = (role: Role): string => role;
