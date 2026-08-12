import {
  ActivationStatus,
  Connector,
  ConnectorActivation,
  Project,
  Role,
  ScopeContext,
} from '../types';
import { connectorCapabilities } from './rbac';

/**
 * Connector derivations.
 *
 * Every figure on a connector card is a count taken from here, never a stored
 * number. Seed a fourth department and all three readings stay true, which is
 * the property that makes the card grid safe to change.
 *
 * The four Spec AI call sites that ask "is this connected?" read `isActivated`
 * from here too. They each used to read a single global flag, which meant one
 * project activating Jira answered yes for every other project on the platform.
 */

// ───────────────────────────── Predicates ─────────────────────────────

export const isEnabledFor = (c: Connector, departmentId?: string): boolean =>
  Boolean(c.tenantAvailable && departmentId && c.enabledDepartments.includes(departmentId));

export const activationFor = (
  c: Connector,
  projectId?: string
): ConnectorActivation | undefined => (projectId ? c.activations[projectId] : undefined);

/**
 * The question every consumer actually asks. A binding only counts when the two
 * rungs above it are open — an activation left behind by a withdrawn connector
 * is stale data, not a live connection.
 */
export const isActivated = (
  c: Connector | undefined,
  projectId: string | undefined,
  departmentId?: string
): boolean => {
  if (!c || !projectId) return false;
  const activation = c.activations[projectId];
  if (!activation || activation.status === 'not-set-up') return false;
  if (!c.tenantAvailable) return false;
  /* Callers that do not know the department trust the enablement that let the
     activation be created in the first place. */
  if (departmentId && !c.enabledDepartments.includes(departmentId)) return false;
  return true;
};

// ───────────────────────────── Counts ─────────────────────────────

export interface Reach {
  departments: number;
  departmentsTotal: number;
  projects: number;
  projectsTotal: number;
  failing: number;
}

/** What a Tenant Admin is looking at: how far this connector has spread. */
export const reachOf = (c: Connector, projects: Project[], departmentCount: number): Reach => {
  const bound = Object.values(c.activations).filter((a) => a.status !== 'not-set-up');
  return {
    departments: c.enabledDepartments.length,
    departmentsTotal: departmentCount,
    projects: bound.length,
    projectsTotal: projects.length,
    failing: bound.filter((a) => a.status === 'sync-failed').length,
  };
};

export interface Coverage {
  connected: number;
  total: number;
  failing: number;
}

/** What a Department Admin is looking at: how much of *their* estate has it. */
export const coverageOf = (
  c: Connector,
  departmentId: string | undefined,
  projects: Project[]
): Coverage => {
  const mine = projects.filter((p) => p.departmentId === departmentId);
  const bound = mine
    .map((p) => c.activations[p.id])
    .filter((a): a is ConnectorActivation => Boolean(a) && a.status !== 'not-set-up');

  return {
    connected: bound.length,
    total: mine.length,
    failing: bound.filter((a) => a.status === 'sync-failed').length,
  };
};

// ───────────────────────────── The lens ─────────────────────────────

export type ConnectorLens = 'tenant' | 'department' | 'project';

const LENS_RANK: ConnectorLens[] = ['tenant', 'department', 'project'];

/**
 * Which reading of a connector you get.
 *
 * The narrowest of what your role permits and what scope you have selected. A
 * Tenant Admin holds all three rungs, so at tenant scope they get reach; filter
 * to one project and they get that project's connection instead — because that
 * is the question they just asked. A Project Admin only ever gets the project
 * reading, because the ladder gives them nothing else.
 *
 * This is what makes the scope filter load-bearing rather than decorative.
 */
export const lensFor = (
  role: Role,
  scope: { departmentId?: string; projectId?: string }
): ConnectorLens => {
  const caps = connectorCapabilities(role);
  const byRole: ConnectorLens = caps.includes('tenant-availability')
    ? 'tenant'
    : caps.includes('department-baseline')
    ? 'department'
    : 'project';

  const byScope: ConnectorLens = scope.projectId
    ? 'project'
    : scope.departmentId
    ? 'department'
    : 'tenant';

  return LENS_RANK[Math.max(LENS_RANK.indexOf(byRole), LENS_RANK.indexOf(byScope))];
};

/** Resolves the scope a mutation should act on, given the filter and the identity. */
export const effectiveScope = (
  filter: { departmentId: string; projectId: string },
  bound: ScopeContext
): { departmentId?: string; projectId?: string } => ({
  departmentId: filter.departmentId !== 'all' ? filter.departmentId : bound.departmentId,
  projectId: filter.projectId !== 'all' ? filter.projectId : bound.projectId,
});

// ───────────────────────────── Card state ─────────────────────────────

export type CardTone = 'accent' | 'success' | 'danger' | 'warning' | 'muted';

export interface CardState {
  badge: string;
  tone: CardTone;
  /** The sentence under the badge. Counts, or the reason there is no action. */
  meta: string;
  /** Empty means a dead end — the card says so rather than greying out a button. */
  actions: ConnectorAction[];
}

export type ConnectorAction =
  | 'make-available'
  | 'withdraw'
  | 'enable'
  | 'disable'
  | 'connect'
  | 'configure'
  | 'test'
  | 'retry';

export const ACTION_LABEL: Record<ConnectorAction, string> = {
  'make-available': 'Make available',
  withdraw: 'Withdraw',
  enable: 'Enable',
  disable: 'Disable',
  connect: 'Connect',
  configure: 'Configure',
  test: 'Test connection',
  retry: 'Retry',
};

/** Actions that destroy bindings beneath them, and must confirm first. */
export const DESTRUCTIVE: ConnectorAction[] = ['withdraw', 'disable'];

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

/**
 * What the card says and offers, for one connector at one lens.
 *
 * A table rather than a branching component: a new state is a return, and the
 * three readings sit next to each other where they can be compared.
 */
export const cardState = (
  c: Connector,
  lens: ConnectorLens,
  ctx: {
    projects: Project[];
    departmentCount: number;
    departmentId?: string;
    departmentName?: string;
    projectId?: string;
    canEdit: boolean;
  }
): CardState => {
  const gate = (actions: ConnectorAction[]) => (ctx.canEdit ? actions : []);

  // ── Tenant: availability, and how far it has spread ──
  if (lens === 'tenant') {
    if (!c.tenantAvailable) {
      return {
        badge: 'Withdrawn',
        tone: 'muted',
        meta: 'No departments — every binding beneath it was cleared.',
        actions: gate(['make-available']),
      };
    }

    const r = reachOf(c, ctx.projects, ctx.departmentCount);
    const parts = [
      `${r.departments} of ${r.departmentsTotal} ${plural(r.departmentsTotal, 'department')}`,
      r.projects > 0
        ? `${r.projects} of ${r.projectsTotal} projects connected`
        : 'no project has connected it yet',
    ];
    if (r.failing > 0) parts.push(`${r.failing} failing`);

    return {
      badge: 'Available',
      tone: 'accent',
      meta: parts.join(' · '),
      actions: gate(['withdraw']),
    };
  }

  // ── Department: enablement, and how much of my estate has it ──
  if (lens === 'department') {
    if (!c.tenantAvailable) {
      return {
        badge: 'Not available',
        tone: 'muted',
        meta: 'Withdrawn by a tenant admin.',
        actions: [],
      };
    }

    if (!ctx.departmentId) {
      return {
        badge: 'Available',
        tone: 'accent',
        meta: 'Select a department to enable or disable it.',
        actions: [],
      };
    }

    if (!c.enabledDepartments.includes(ctx.departmentId)) {
      return {
        badge: 'Disabled',
        tone: 'muted',
        meta: `Not enabled for ${ctx.departmentName ?? 'this department'}.`,
        actions: gate(['enable']),
      };
    }

    const cov = coverageOf(c, ctx.departmentId, ctx.projects);
    /* A ratio with a zero denominator is a division nobody should print. */
    const meta =
      cov.total === 0
        ? 'Enabled — no projects in this department yet.'
        : `${cov.connected} of ${cov.total} projects connected` +
          (cov.failing > 0 ? ` · ${cov.failing} failing` : '');

    return { badge: 'Enabled', tone: 'success', meta, actions: gate(['disable']) };
  }

  // ── Project: the connection itself ──
  if (!c.tenantAvailable) {
    return {
      badge: 'Unavailable',
      tone: 'muted',
      meta: 'Withdrawn by a tenant admin.',
      actions: [],
    };
  }

  if (ctx.departmentId && !c.enabledDepartments.includes(ctx.departmentId)) {
    return {
      badge: 'Unavailable',
      tone: 'muted',
      meta: `${ctx.departmentName ?? 'Your department'} has not enabled this.`,
      actions: [],
    };
  }

  const a = activationFor(c, ctx.projectId);

  if (!a || a.status === 'not-set-up') {
    return {
      badge: 'Not set up',
      tone: 'warning',
      meta: 'Enabled for you — not connected yet.',
      actions: gate(['connect']),
    };
  }

  if (a.status === 'sync-failed') {
    return {
      badge: 'Sync failed',
      tone: 'danger',
      meta: `Last attempt ${a.lastSyncTime} — ${a.lastError ?? 'no error recorded'}`,
      actions: gate(['retry', 'configure']),
    };
  }

  return {
    badge: 'Connected',
    tone: 'success',
    meta: [a.workspaceRepo, `synced ${a.lastSyncTime}`].filter(Boolean).join(' · '),
    actions: gate(['configure', 'test']),
  };
};

// ───────────────────────── Drilling down a rung ─────────────────────────

/**
 * One row beneath the count.
 *
 * A card that says "2 of 3 departments" and offers no way to reach the third is
 * a dead end wearing a number. Expanding the count lists the things counted,
 * and each row carries the action *that rung* is allowed to take — which is how
 * a tenant configures a department, and a department a project, without hunting
 * for the scope filter first.
 */
export interface DrillRow {
  /** departmentId or projectId, passed back with the action. */
  id: string;
  label: string;
  status: string;
  tone: CardTone;
  action?: ConnectorAction;
}

export interface Drill {
  title: string;
  rows: DrillRow[];
}

export const drillFor = (
  c: Connector,
  lens: ConnectorLens,
  ctx: {
    projects: Project[];
    departments: { id: string; name: string }[];
    departmentId?: string;
    canEditBelow: boolean;
  }
): Drill | null => {
  if (!c.tenantAvailable) return null;

  // ── Tenant drills into departments ──
  if (lens === 'tenant') {
    return {
      title: 'Departments',
      rows: ctx.departments.map((d) => {
        const enabled = c.enabledDepartments.includes(d.id);
        const cov = coverageOf(c, d.id, ctx.projects);
        return {
          id: d.id,
          label: d.name,
          status: !enabled
            ? 'Not enabled'
            : cov.total === 0
            ? 'Enabled · no projects'
            : `${cov.connected} of ${cov.total} connected` +
              (cov.failing > 0 ? ` · ${cov.failing} failing` : ''),
          tone: !enabled ? 'muted' : cov.failing > 0 ? 'danger' : 'success',
          action: ctx.canEditBelow ? (enabled ? 'disable' : 'enable') : undefined,
        };
      }),
    };
  }

  // ── Department drills into its own projects ──
  if (lens === 'department') {
    if (!ctx.departmentId || !c.enabledDepartments.includes(ctx.departmentId)) return null;

    const mine = ctx.projects.filter((p) => p.departmentId === ctx.departmentId);
    if (mine.length === 0) return null;

    return {
      title: 'Projects',
      rows: mine.map((p) => {
        const a = c.activations[p.id];
        const status = !a || a.status === 'not-set-up' ? 'not-set-up' : a.status;
        return {
          id: p.id,
          label: p.name,
          status:
            status === 'connected'
              ? `Connected · ${a?.lastSyncTime ?? 'unknown'}`
              : status === 'sync-failed'
              ? `Failing · ${a?.lastError ?? 'no error recorded'}`
              : 'Not connected',
          tone: status === 'connected' ? 'success' : status === 'sync-failed' ? 'danger' : 'warning',
          /* A Department Admin holds project-activation too, so they can connect
             on a project's behalf — with that project's credentials, which is
             why it opens the same form rather than acting silently. */
          action: ctx.canEditBelow
            ? status === 'connected'
              ? 'configure'
              : status === 'sync-failed'
              ? 'retry'
              : 'connect'
            : undefined,
        };
      }),
    };
  }

  /* The project reading is the leaf. There is nothing beneath it to list. */
  return null;
};

/**
 * What a destructive action is about to destroy, counted before it runs.
 *
 * Withdrawing used to flip two booleans; it now walks every department and
 * project, so the confirmation has to say so with real numbers rather than a
 * general warning.
 */
export const blastRadius = (
  c: Connector,
  action: 'withdraw' | 'disable',
  ctx: { projects: Project[]; departmentId?: string; departmentName?: string }
): string => {
  if (action === 'withdraw') {
    const bound = Object.values(c.activations).filter((a) => a.status !== 'not-set-up');
    const depts = c.enabledDepartments.length;
    if (depts === 0 && bound.length === 0) return 'Nothing is bound to it yet.';
    return (
      `This clears ${depts} ${plural(depts, 'department')} and disconnects ` +
      `${bound.length} ${plural(bound.length, 'project')}. ` +
      `${c.usedByModules.join(', ')} lose ${c.name} on every project.`
    );
  }

  const cov = coverageOf(c, ctx.departmentId, ctx.projects);
  if (cov.connected === 0) return 'No project in this department has connected it.';
  return (
    `This disconnects ${cov.connected} ${plural(cov.connected, 'project')} in ` +
    `${ctx.departmentName ?? 'this department'}. Credentials are cleared and will need re-entering.`
  );
};

export const STATUS_COPY: Record<ActivationStatus, string> = {
  connected: 'Connected',
  'sync-failed': 'Sync failed',
  'not-set-up': 'Not set up',
};
