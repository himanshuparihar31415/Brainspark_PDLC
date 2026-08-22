import {
  MetricUnit,
  Role,
  ModuleActivity,
  ModuleDef,
  ModuleKey,
  Project,
  TeamMember,
} from '../types';

/**
 * The five capability modules the admin dashboards roll activity up by.
 *
 * Metrics differ per module because the work differs — a module's `primary` and
 * `secondary` are the two events worth separating (a gap between them is itself
 * a signal), and `quality` is its headline quality measure.
 */
export const MODULE_DEFS: ModuleDef[] = [
  {
    key: 'specai',
    name: 'Spec AI',
    productName: 'Spec AI',
    apiKey: 'spec_ai',
    aliases: ['SpecAI'],
    agentId: 'agent-specai',
    primary: { label: 'stories created', unit: 'count' },
    secondary: { label: 'pushed to tracker', unit: 'count' },
    quality: { label: 'Avg story quality', unit: 'score' },
    pooledRoles: ['Product Manager'],
    pipeline: {
      unit: 'stories',
      completionPhrase: 'stories finalized',
      workspaceSubLabel: 'Requirements & architecture',
    },
  },
  {
    key: 'design',
    name: 'Design',
    productName: 'Proto AI',
    apiKey: 'proto_ai',
    aliases: ['DesignAI', 'Design AI', 'ProtoAI', 'design_ai'],
    agentId: 'agent-design',
    primary: { label: 'designs generated', unit: 'count' },
    secondary: { label: 'accepted', unit: 'count' },
    quality: { label: 'Avg design consistency', unit: 'score' },
    pooledRoles: ['Designer'],
    pipeline: {
      unit: 'artifacts',
      completionPhrase: 'artifacts approved',
      workspaceSubLabel: 'UX & design artifacts',
    },
  },
  {
    key: 'codeiq',
    name: 'CodeIQ',
    productName: 'CodeIQ',
    apiKey: 'code_iq',
    /* 'Code IQ' was the delivery and Observability label and resolved to nothing. */
    aliases: ['Code IQ'],
    agentId: 'agent-codeiq',
    primary: { label: 'PRs scaffolded', unit: 'count' },
    secondary: { label: 'test suites generated', unit: 'count' },
    quality: { label: 'Avg code-scan pass rate', unit: 'percent' },
    pooledRoles: ['Tech Lead'],
    pipeline: {
      /*
       * Criteria, not PRs. A merged PR that realized nothing is precisely what
       * this module exists to catch, so counting merges would report the thing
       * being measured as the measure.
       */
      unit: 'criteria',
      completionPhrase: 'realized in code',
      workspaceSubLabel: 'Code intelligence & scaffolding',
    },
  },
  {
    key: 'intelliqa',
    name: 'IntelliQA',
    productName: 'IntelliQA',
    apiKey: 'intelli_qa',
    aliases: ['Intelli QA'],
    agentId: 'agent-intelliqa',
    primary: { label: 'test cases created', unit: 'count' },
    secondary: { label: 'runs', unit: 'count' },
    quality: { label: 'Avg defect-detection rate', unit: 'percent' },
    // QA capacity is the classic department-level shared pool.
    pooledRoles: ['QA Manager', 'QA Engineer'],
    pipeline: {
      unit: 'test cases',
      completionPhrase: 'passed',
      workspaceSubLabel: 'Test automation & QA',
    },
  },
  {
    key: 'release',
    name: 'Release',
    productName: 'Release Pulse',
    apiKey: 'release_pulse',
    aliases: ['ReleasePulse'],
    agentId: 'agent-release',
    primary: { label: 'deploys', unit: 'count' },
    secondary: { label: 'deploy success rate', unit: 'percent' },
    quality: { label: 'Avg lead time to release', unit: 'days' },
    pooledRoles: ['Release Manager'],
    pipeline: {
      unit: 'checks',
      completionPhrase: 'readiness checks cleared',
      workspaceSubLabel: 'Release readiness',
    },
  },
];

export const moduleDef = (key: ModuleKey): ModuleDef =>
  MODULE_DEFS.find((m) => m.key === key) as ModuleDef;

// ───────────────────────── Module identity ─────────────────────────

/**
 * The module's identity lives in exactly one place, and this is it.
 *
 * Five names for one capability are already in the tree and most of them are
 * legitimate: `ModuleKey` is the typed key, `apiKey` mirrors the PromptOps and
 * Observability server contract, `name` and `productName` are two different
 * display registers, and free-text `Task.module` arrives from fixtures in
 * whatever case someone typed. What was not legitimate was 'Code IQ' — a label
 * that matched none of the above, so the delivery rollup it keyed silently
 * produced an empty set rather than an error.
 *
 * A sixth, `phaseMatch`, was removed after this resolver landed: each of its
 * values was already the module's name, productName or an alias, so it was one
 * more spelling to keep in step for no additional match.
 *
 * Everything below resolves a string to a `ModuleKey`. Nothing else in the
 * codebase should compare module names by hand.
 */

/** Case- and separator-insensitive: 'Code IQ', 'code_iq' and 'codeiq' all agree. */
const normalise = (label: string) => label.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Resolve any spelling of a module to its key, or null when nothing matches.
 *
 * Null is the point. A caller that filters on a label the platform does not
 * recognise gets nothing back, and the difference between "no work in this
 * module" and "this label is a typo" is invisible in the result — so callers
 * are made to handle the miss.
 */
export const moduleKeyFor = (label: string): ModuleKey | null => {
  const target = normalise(label);
  if (!target) return null;

  const hit = MODULE_DEFS.find((d) =>
    [d.key, d.name, d.productName, d.apiKey, ...d.aliases].some(
      (candidate) => normalise(candidate) === target
    )
  );
  return hit?.key ?? null;
};

/** True when a free-text module name belongs to this module. */
export const isModule = (label: string, key: ModuleKey) => moduleKeyFor(label) === key;

/** The product-facing label for a module, whatever namespace the caller holds. */
export const moduleProductName = (label: string): string => {
  const key = moduleKeyFor(label);
  return key ? moduleDef(key).productName : label;
};

export interface ModuleRollup {
  key: ModuleKey;
  def: ModuleDef;
  /** Projects in scope that have this module active. */
  projectCount: number;
  projectIds: string[];
  primary: number;
  secondary: number;
  quality: number;
  qualityTrend: number;
  spend30d: number;
  tokens30d: number;
  /** True when nothing in scope uses this module. */
  empty: boolean;
}

/**
 * Counts sum; rates, scores and durations average. Averaging a percentage
 * across projects unweighted is a deliberate simplification — these are
 * per-project quality scores, not volume-weighted platform rates.
 */
const combine = (values: number[], unit: MetricUnit): number => {
  if (values.length === 0) return 0;
  if (unit === 'count') return values.reduce((a, b) => a + b, 0);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(mean * 10) / 10;
};

/** Roll one module up over the given set of project ids. */
export const rollupModule = (
  key: ModuleKey,
  activity: ModuleActivity[],
  projectIds: string[]
): ModuleRollup => {
  const def = moduleDef(key);
  const rows = activity.filter((a) => a.module === key && projectIds.includes(a.projectId));

  return {
    key,
    def,
    projectCount: rows.length,
    projectIds: rows.map((r) => r.projectId),
    primary: combine(
      rows.map((r) => r.primary),
      def.primary.unit
    ),
    secondary: combine(
      rows.map((r) => r.secondary),
      def.secondary.unit
    ),
    quality: combine(
      rows.map((r) => r.quality),
      def.quality.unit
    ),
    qualityTrend: combine(
      rows.map((r) => r.qualityTrend),
      'score'
    ),
    spend30d: rows.reduce((a, r) => a + r.spend30d, 0),
    tokens30d: rows.reduce((a, r) => a + r.tokens30d, 0),
    empty: rows.length === 0,
  };
};

/**
 * How many projects in scope are competing for the same pooled people in this
 * module. A department-level problem by definition: the platform view is too high
 * to see it and a single project too low.
 */
export const poolContention = (
  key: ModuleKey,
  members: TeamMember[],
  scopeProjects: Project[]
): number => {
  const def = moduleDef(key);
  const inScope = new Set(scopeProjects.map((p) => p.name));

  const contended = new Set<string>();
  for (const m of members) {
    const isPooled = m.roles.some((r) => def.pooledRoles.includes(r));
    const spread = (m.drawnOnByProjects ?? []).filter((p) => inScope.has(p));
    if (isPooled && spread.length > 1) {
      spread.forEach((p) => contended.add(p));
    }
  }
  return contended.size;
};

export const formatMetric = (value: number, unit: MetricUnit): string => {
  switch (unit) {
    case 'percent':
      return `${value}%`;
    case 'score':
      return `${value}`;
    case 'days':
      return `${value}d`;
    default:
      return value.toLocaleString();
  }
};

export const formatTokens = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

export const formatUsd = (n: number): string => `$${Math.round(n).toLocaleString()}`;

/** Percentage change vs the prior period, rounded to one decimal. */
export const trendPct = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};

/**
 * The module a persona's Command Centre foregrounds. Everyone else's phases stay
 * collapsed as context. A Project Admin gets no focus — all five carry equal
 * weight beneath their governance tiles.
 */
export const FOCUS_MODULE_BY_ROLE: Partial<Record<Role, ModuleKey>> = {
  'Product Manager': 'specai',
  Architect: 'specai',
  Designer: 'design',
  'Tech Lead': 'codeiq',
  Developer: 'codeiq',
  'QA Manager': 'intelliqa',
  'QA Engineer': 'intelliqa',
  'Release Manager': 'release',
};

/** Thresholds past which the Command Centre escalates a value to amber / red. */
export const STALE_DAYS = 4;
export const ITEM_STATUS_DAYS = 3;
export const BLOCKED_DAYS_WARN = 2;
export const BLOCKED_DAYS_HARD = 4;
export const REVIEW_HOURS_WARN = 24;

/** "2 min ago" style stamp from a minutes-ago number. */
export const relativeTime = (minutesAgo: number): string => {
  if (minutesAgo < 1) return 'just now';
  if (minutesAgo < 60) return `${minutesAgo} min ago`;
  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
};
