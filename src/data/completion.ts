import { PhaseStatus, PipelinePhase } from '../types';
import {
  ModuleNode,
  StoryDeliveryStatus,
  UserStory,
} from '../types/specai';

/** Feature-level rollup inside Spec AI's module map. */
export interface FeatureCompletion {
  moduleName: string;
  featureName: string;
  featureId: string;
  done: number;
  total: number;
  percent: number;
}

/** Module-node rollup (story-weighted across features). */
export interface ModuleCompletionSummary {
  moduleId: string;
  moduleName: string;
  done: number;
  total: number;
  percent: number;
  features: FeatureCompletion[];
}

export const STORY_DELIVERY_STATUSES: StoryDeliveryStatus[] = [
  'Draft',
  'Exported',
  'In progress',
  'Done',
  'Blocked',
];

export const isStoryDone = (s: UserStory): boolean => s.deliveryStatus === 'Done';

export const isStoryExported = (s: UserStory): boolean => s.deliveryStatus !== 'Draft';

/** Keep the legacy `exported` flag aligned with delivery status. */
export const withDeliveryStatus = (
  story: UserStory,
  deliveryStatus: StoryDeliveryStatus
): UserStory => ({
  ...story,
  deliveryStatus,
  exported: deliveryStatus !== 'Draft',
});

export const plannedDoneFromStories = (
  stories: UserStory[]
): { planned: number; done: number } => ({
  planned: stories.length,
  done: stories.filter(isStoryDone).length,
});

export const storyCompletionPercent = (stories: UserStory[]): number => {
  const { planned, done } = plannedDoneFromStories(stories);
  return planned === 0 ? 0 : Math.round((done / planned) * 100);
};

/**
 * Per-feature completion for a Spec AI module map. Stories match on
 * moduleName + featureName (the tags Stage 5 already carries).
 */
export const featureCompletions = (
  modules: ModuleNode[],
  stories: UserStory[]
): FeatureCompletion[] =>
  modules.flatMap((m) =>
    m.features.map((f) => {
      const owned = stories.filter(
        (s) => s.moduleName === m.name && s.featureName === f.name
      );
      const done = owned.filter(isStoryDone).length;
      const total = owned.length;
      return {
        moduleName: m.name,
        featureName: f.name,
        featureId: f.id,
        done,
        total,
        percent: total === 0 ? 0 : Math.round((done / total) * 100),
      };
    })
  );

export const moduleCompletions = (
  modules: ModuleNode[],
  stories: UserStory[]
): ModuleCompletionSummary[] => {
  const features = featureCompletions(modules, stories);
  return modules.map((m) => {
    const owned = features.filter((f) => f.moduleName === m.name);
    const done = owned.reduce((n, f) => n + f.done, 0);
    const total = owned.reduce((n, f) => n + f.total, 0);
    return {
      moduleId: m.id,
      moduleName: m.name,
      done,
      total,
      percent: total === 0 ? 0 : Math.round((done / total) * 100),
      features: owned,
    };
  });
};

/* ─────────────────── the delivery tree ─────────────────── */

export interface DeliveryFeature {
  id: string;
  name: string;
  stories: UserStory[];
  done: number;
  total: number;
}

export interface DeliveryModule {
  id: string;
  name: string;
  features: DeliveryFeature[];
  done: number;
  total: number;
}

/**
 * Modules, features and the stories beneath them, as one tree.
 *
 * Modules & Features and User Stories were always two views of this: a story
 * already carries the module and feature it belongs to, and completion already
 * joins on that pair. Deriving the tree once means the two cannot disagree.
 *
 * `orphans` matters more than it looks. Stories match their feature by *name*,
 * so renaming a feature silently detaches every story under it — they vanish
 * from their group and appear nowhere else. Collecting them here is the only
 * thing that makes that visible.
 */
export const deliveryTree = (
  modules: ModuleNode[],
  stories: UserStory[]
): { modules: DeliveryModule[]; orphans: UserStory[] } => {
  const claimed = new Set<string>();

  const tree = modules.map((m) => {
    const features = m.features.map((f) => {
      const owned = stories.filter(
        (s) => s.moduleName === m.name && s.featureName === f.name
      );
      owned.forEach((s) => claimed.add(s.id));
      return {
        id: f.id,
        name: f.name,
        stories: owned,
        done: owned.filter(isStoryDone).length,
        total: owned.length,
      };
    });

    return {
      id: m.id,
      name: m.name,
      features,
      done: features.reduce((n, f) => n + f.done, 0),
      total: features.reduce((n, f) => n + f.total, 0),
    };
  });

  return { modules: tree, orphans: stories.filter((s) => !claimed.has(s.id)) };
};

/** Spec AI workspace completion across every module node (story-weighted). */
export const workspaceStoryCompletion = (
  modules: ModuleNode[],
  stories: UserStory[]
): { done: number; total: number; percent: number } => {
  const { planned, done } = plannedDoneFromStories(stories);
  if (planned > 0) {
    return { done, total: planned, percent: Math.round((done / planned) * 100) };
  }
  // No stories yet — fall back to empty modules as 0%.
  void modules;
  return { done: 0, total: 0, percent: 0 };
};

/**
 * Derive the Spec AI pipeline phase numerator/denominator and categorical status
 * from live stories. Empty story list means "not derived yet" — callers keep mock.
 */
export const specAiPhaseFromStories = (
  stories: UserStory[]
): { done: number; total: number; status: PhaseStatus } | null => {
  if (stories.length === 0) return null;

  const { planned, done } = plannedDoneFromStories(stories);
  let status: PhaseStatus;
  if (stories.some((s) => s.deliveryStatus === 'Blocked')) {
    status = 'Blocked';
  } else if (done === planned) {
    status = 'Complete';
  } else {
    status = 'In progress';
  }

  return { done, total: planned, status };
};

/**
 * Derive the CodeIQ pipeline phase from its review targets.
 *
 * Deliberately not the same shape as Spec AI's. Spec AI *owns* stories, so its
 * numerator is stories finished. CodeIQ owns nothing — it adjudicates — so its
 * numerator is criteria realized in code out of criteria it could see.
 *
 * A dismissed criterion counts as resolved rather than as a gap: someone put
 * their name to a reason, and continuing to count it would mean the number could
 * never reach its denominator no matter what anyone did.
 *
 * Status is not a completion judgement. Anything unrealized on work the tracker
 * already calls done is the module's headline finding, and a phase that reads
 * 'In progress' while a story claims Done is the contradiction worth surfacing.
 * Returns null when nothing has been indexed — the caller keeps its seeded
 * numbers rather than showing a confident zero.
 */
export const codeIqPhaseFromTargets = (
  targets: { claimed: string; criteria: { status: string; dismissal?: unknown }[] }[]
): { done: number; total: number; status: PhaseStatus } | null => {
  if (targets.length === 0) return null;

  const criteria = targets.flatMap((t) => t.criteria);
  if (criteria.length === 0) return null;

  const resolved = criteria.filter((c) => c.status === 'covered' || Boolean(c.dismissal));

  /* Unrealized criteria on work already claimed done. The gap that matters. */
  const overstated = targets
    .filter((t) => t.claimed === 'Done')
    .flatMap((t) => t.criteria)
    .filter((c) => c.status !== 'covered' && !c.dismissal).length;

  const status: PhaseStatus =
    overstated > 0 ? 'Blocked' : resolved.length === criteria.length ? 'Complete' : 'In progress';

  return { done: resolved.length, total: criteria.length, status };
};

/** Unweighted average of phase done/total for one project's pipeline. */
export const projectCompletionFromPhases = (phases: PipelinePhase[]): number => {
  if (phases.length === 0) return 0;
  const sum = phases.reduce((acc, p) => {
    if (p.total <= 0) return acc;
    return acc + p.done / p.total;
  }, 0);
  return Math.round((sum / phases.length) * 100);
};
