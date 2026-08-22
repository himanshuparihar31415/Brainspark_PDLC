import { ModuleKey, Project, Task, TeamMember } from '../types';
import { MODULE_DEFS, moduleKeyFor } from './modules';
import { StoryDeliveryStatus, UserStory } from '../types/specai';
import { STORY_DELIVERY_STATUSES, isStoryDone } from './completion';

/**
 * The one shared delivery model.
 *
 * Every surface that shows delivery — the project drawer, My Delivery, the
 * Command Centre card, Spec AI Stage 5 — reads this and nothing else. The rule
 * exists because the alternative was demonstrated: a completion percentage
 * computed in one place and a story list rendered in another, with no way to tell
 * which was right when they disagreed.
 *
 * The measures worth the most here are the negative ones. A done/total bar is
 * table stakes; "five specifications nobody has scheduled" and "three tasks with
 * no specification behind them" are the numbers that change what someone does
 * next, and they only exist because the join is explicit.
 */

// ───────────────────────────── Instrumentation ─────────────────────────────

/**
 * Which modules actually report story-level delivery. Everything else is shown
 * as not instrumented rather than as zero — a module with no data and a module
 * with no work look identical at 0%, and only one of them is a problem.
 *
 * Keyed by ModuleKey rather than by label. The previous version matched on the
 * string 'Spec AI' and listed a sibling as 'Code IQ', which resolved to no
 * module at all: the rollup it keyed produced an empty set that rendered
 * identically to a module with no work.
 */
export const INSTRUMENTED_MODULE_KEYS: ModuleKey[] = ['specai'];

/** Rollup order. Labels come from MODULE_DEFS, so a sixth spelling cannot appear. */
export const DELIVERY_MODULE_KEYS: ModuleKey[] = MODULE_DEFS.map((d) => d.key);

export const DELIVERY_MODULES: string[] = MODULE_DEFS.map((d) => d.productName);

export type DeliveryModule = string;

/** Accepts any spelling — a key, a display name, or a tracker's own wording. */
export const isInstrumented = (module: string): boolean => {
  const key = moduleKeyFor(module);
  return key !== null && INSTRUMENTED_MODULE_KEYS.includes(key);
};

// ───────────────────────────── Shape ─────────────────────────────

/** A story with the delivery work attached to it. */
export type StoryWithTasks = UserStory & { tasks: Task[] };

export interface FeatureDeliverySummary {
  moduleName: string;
  featureName: string;
  completedStories: number;
  totalStories: number;
  completionPercent: number;
  completedPoints: number;
  totalPoints: number;
  taskCount: number;
  blocked: number;
  /** Owner of the most work here, for the row's Owner column. */
  owner?: string;
  stories: StoryWithTasks[];
}

export interface ModuleDeliverySummary {
  moduleName: string;
  instrumented: boolean;
  completedStories: number;
  totalStories: number;
  completionPercent: number;
  completedPoints: number;
  totalPoints: number;
  blocked: number;
  gaps: number;
  features: FeatureDeliverySummary[];
}

export interface DeliveryMeasures {
  totalStories: number;
  completedStories: number;
  completionPercent: number;

  totalPoints: number;
  completedPoints: number;
  pointsCompletionPercent: number;

  attributedCostUsd: number;
  unattributedCostUsd: number;
  /** Null when nothing is done — a cost per outcome with no outcomes is not zero. */
  costPerCompletedStory: number | null;
  costAttributionPercent: number;

  byStatus: Record<StoryDeliveryStatus, number>;
}

export interface ProjectDeliveryResponse {
  project: Project;
  stories: StoryWithTasks[];
  modules: ModuleDeliverySummary[];

  gaps: {
    storiesWithoutTasks: StoryWithTasks[];
    tasksWithoutStories: Task[];
    neverExported: StoryWithTasks[];
    staleStories: StoryWithTasks[];
  };

  attention: {
    blockedStories: StoryWithTasks[];
    blockedTasks: Task[];
    pendingApprovals: Task[];
  };

  measures: DeliveryMeasures;
  /** True when stories exist but the module they belong to reports nothing. */
  partial: boolean;
}

// ───────────────────────────── Helpers ─────────────────────────────

const pct = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 100);

const sum = (ns: number[]): number => ns.reduce((a, b) => a + b, 0);

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Whoever holds the most stories here. Ties break on first seen, which is stable. */
const dominantOwner = (stories: UserStory[]): string | undefined => {
  const counts = new Map<string, number>();
  for (const s of stories) if (s.owner) counts.set(s.owner, (counts.get(s.owner) ?? 0) + 1);
  let best: string | undefined;
  let most = 0;
  for (const [owner, n] of counts) if (n > most) [best, most] = [owner, n];
  return best;
};

// ───────────────────────────── The selector ─────────────────────────────

export interface DeliveryInput {
  project: Project;
  /** Stories belonging to this project. */
  stories: UserStory[];
  /** Every task in the system; filtered here on `projectId`. */
  tasks: Task[];
  team?: TeamMember[];
}

/**
 * Join stories to tasks and derive every measure. Pure, so it can be verified
 * without a browser and memoised without surprises.
 */
export const projectDelivery = (input: DeliveryInput): ProjectDeliveryResponse => {
  const { project, stories, tasks } = input;

  /* The immutable key is the join. `task.project` is a display name and is
     deliberately not consulted here. */
  const projectTasks = tasks.filter((t) => t.projectId === project.id);

  const byStory = new Map<string, Task[]>();
  for (const t of projectTasks) {
    if (!t.storyId) continue;
    byStory.set(t.storyId, [...(byStory.get(t.storyId) ?? []), t]);
  }

  const withTasks: StoryWithTasks[] = stories.map((s) => ({
    ...s,
    tasks: byStory.get(s.id) ?? [],
  }));

  // ── Measures ──────────────────────────────────────────────────────────────

  const completed = withTasks.filter(isStoryDone);
  const totalPoints = sum(withTasks.map((s) => s.points));
  const completedPoints = sum(completed.map((s) => s.points));

  /* Cost splits on whether it can be traced to a specification. The split is the
     point: an unattributed total is not an error, it is the share of spend this
     project cannot yet tie to an outcome. */
  const linkedCost = sum(projectTasks.filter((t) => t.storyId).map((t) => t.costUsd ?? 0));
  const totalCost = sum(projectTasks.map((t) => t.costUsd ?? 0));

  const byStatus = STORY_DELIVERY_STATUSES.reduce(
    (acc, status) => ({
      ...acc,
      [status]: withTasks.filter((s) => s.deliveryStatus === status).length,
    }),
    {} as Record<StoryDeliveryStatus, number>
  );

  const measures: DeliveryMeasures = {
    totalStories: withTasks.length,
    completedStories: completed.length,
    completionPercent: pct(completed.length, withTasks.length),

    totalPoints,
    completedPoints,
    pointsCompletionPercent: pct(completedPoints, totalPoints),

    attributedCostUsd: round2(linkedCost),
    unattributedCostUsd: round2(totalCost - linkedCost),
    costPerCompletedStory: completed.length === 0 ? null : round2(linkedCost / completed.length),
    costAttributionPercent: pct(linkedCost, totalCost),

    byStatus,
  };

  // ── Gaps ──────────────────────────────────────────────────────────────────

  /*
   * Only `story-work` without a story is a gap. An incident, a spike, an ops
   * chore or a governance task has no specification by nature, and counting them
   * would make the measure noise — which is how a real signal gets ignored.
   */
  const gaps = {
    storiesWithoutTasks: withTasks.filter((s) => s.tasks.length === 0),
    tasksWithoutStories: projectTasks.filter((t) => !t.storyId && t.taskType === 'story-work'),
    neverExported: withTasks.filter((s) => s.deliveryStatus === 'Draft'),
    staleStories: withTasks.filter((s) => s.stale),
  };

  const attention = {
    blockedStories: withTasks.filter((s) => s.deliveryStatus === 'Blocked'),
    blockedTasks: projectTasks.filter((t) => t.status === 'Blocked'),
    pendingApprovals: projectTasks.filter((t) => t.status === 'Needs Approval'),
  };

  // ── Module and feature rollups ────────────────────────────────────────────

  const modules: ModuleDeliverySummary[] = DELIVERY_MODULES.map((moduleName) => {
    const instrumented = isInstrumented(moduleName);
    /* Spec AI owns every story today, so its rollup is the whole set. Once other
       workspaces generate stories, this switches to a moduleKey match. */
    const owned = instrumented ? withTasks : [];

    const featureNames = [...new Set(owned.map((s) => s.featureName))].sort();
    const features: FeatureDeliverySummary[] = featureNames.map((featureName) => {
      const inFeature = owned.filter((s) => s.featureName === featureName);
      const doneHere = inFeature.filter(isStoryDone);
      return {
        moduleName,
        featureName,
        completedStories: doneHere.length,
        totalStories: inFeature.length,
        completionPercent: pct(doneHere.length, inFeature.length),
        completedPoints: sum(doneHere.map((s) => s.points)),
        totalPoints: sum(inFeature.map((s) => s.points)),
        taskCount: sum(inFeature.map((s) => s.tasks.length)),
        blocked: inFeature.filter((s) => s.deliveryStatus === 'Blocked').length,
        owner: dominantOwner(inFeature),
        stories: inFeature,
      };
    });

    const doneInModule = owned.filter(isStoryDone);
    return {
      moduleName,
      instrumented,
      completedStories: doneInModule.length,
      totalStories: owned.length,
      completionPercent: pct(doneInModule.length, owned.length),
      completedPoints: sum(doneInModule.map((s) => s.points)),
      totalPoints: sum(owned.map((s) => s.points)),
      blocked: owned.filter((s) => s.deliveryStatus === 'Blocked').length,
      gaps: instrumented
        ? gaps.storiesWithoutTasks.length +
          gaps.tasksWithoutStories.length +
          gaps.neverExported.length
        : 0,
      features,
    };
  });

  return {
    project,
    stories: withTasks,
    modules,
    gaps,
    attention,
    measures,
    /* Tasks exist for this project but no story does: the spec side has not been
       written, or story sync has not run. Either way the numbers are incomplete
       and saying so beats showing 0%. */
    partial: withTasks.length === 0 && projectTasks.length > 0,
  };
};

// ───────────────────────────── Per-person view ─────────────────────────────

export interface MyDelivery {
  /** Tasks assigned to you, plus the stories you own. */
  myTasks: Task[];
  myStories: StoryWithTasks[];
  needsYou: {
    approvals: Task[];
    blockedTasks: Task[];
    blockedStories: StoryWithTasks[];
    staleStories: StoryWithTasks[];
  };
  measures: {
    completedStories: number;
    totalStories: number;
    completionPercent: number;
    completedPoints: number;
    totalPoints: number;
    myCostUsd: number;
  };
}

/**
 * The same delivery response, narrowed to one person. Derived from the shared
 * response rather than recomputed, so a personal total can never disagree with
 * the project total it is part of.
 */
export const myDelivery = (delivery: ProjectDeliveryResponse, userName: string): MyDelivery => {
  const myTasks = delivery.stories
    .flatMap((s) => s.tasks)
    .concat(
      /* Tasks with no story still belong to someone. */
      delivery.gaps.tasksWithoutStories
    )
    .filter((t) => t.assignee === userName);

  const myStories = delivery.stories.filter(
    (s) => s.owner === userName || s.tasks.some((t) => t.assignee === userName)
  );

  const done = myStories.filter(isStoryDone);

  return {
    myTasks,
    myStories,
    needsYou: {
      approvals: myTasks.filter((t) => t.status === 'Needs Approval'),
      blockedTasks: myTasks.filter((t) => t.status === 'Blocked'),
      blockedStories: myStories.filter((s) => s.deliveryStatus === 'Blocked'),
      staleStories: myStories.filter((s) => s.stale),
    },
    measures: {
      completedStories: done.length,
      totalStories: myStories.length,
      completionPercent: pct(done.length, myStories.length),
      completedPoints: sum(done.map((s) => s.points)),
      totalPoints: sum(myStories.map((s) => s.points)),
      myCostUsd: round2(sum(myTasks.map((t) => t.costUsd ?? 0))),
    },
  };
};
