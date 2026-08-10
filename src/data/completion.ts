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

/** Unweighted average of phase done/total for one project's pipeline. */
export const projectCompletionFromPhases = (phases: PipelinePhase[]): number => {
  if (phases.length === 0) return 0;
  const sum = phases.reduce((acc, p) => {
    if (p.total <= 0) return acc;
    return acc + p.done / p.total;
  }, 0);
  return Math.round((sum / phases.length) * 100);
};
