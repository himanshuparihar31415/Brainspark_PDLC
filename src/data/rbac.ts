import { NavView, Role, ScopeContext, UserAccount } from '../types';

export const GOVERNANCE_ROLES: Role[] = ['Tenant Admin', 'Department Admin', 'Project Admin'];

export const PDLC_ROLES: Role[] = [
  'Product Manager',
  'Architect',
  'Designer',
  'Tech Lead',
  'Developer',
  'QA Manager',
  'QA Engineer',
  'Release Manager',
];

export const ALL_ROLES: Role[] = [...GOVERNANCE_ROLES, ...PDLC_ROLES];

/**
 * Roles that own department-level governed assets — prompt versions, golden
 * evaluations, session/API policy. A Project Admin runs a project; it does not
 * set the baselines the project inherits.
 */
export const BASELINE_ROLES: Role[] = ['Tenant Admin', 'Department Admin'];

/**
 * Single source of truth for subtractive navigation. The sidebar renders from
 * this map and the role-switch / sign-in logic validates against it, so a role
 * can never land on a view it cannot see.
 */
export const NAV_VISIBILITY: Record<NavView, Role[]> = {
  Dashboard: GOVERNANCE_ROLES,
  Departments: ['Tenant Admin'],
  Projects: ['Tenant Admin', 'Department Admin'],
  Team: GOVERNANCE_ROLES,
  Connectors: GOVERNANCE_ROLES,
  // Visible to a Project Admin, but read-only — see canManageAgents.
  'Agent Registry': GOVERNANCE_ROLES,
  Evaluation: BASELINE_ROLES,
  /*
   * All three governance tiers see it; scope decides what the numbers cover, so a
   * Department Admin's "enterprise" view is their own department. Reading payload content
   * at L5 is a separate right — see canViewPayloads in data/observability.
   */
  Observability: GOVERNANCE_ROLES,
  'Prompt Controls': BASELINE_ROLES,
  Security: BASELINE_ROLES,
  'My Services': PDLC_ROLES,
  'Command Centre': ['Project Admin', ...PDLC_ROLES],
  'My Tasks': ['Project Admin', ...PDLC_ROLES],
  // Module workspace: reached from the Command Centre doors, not the sidebar.
  // PM and Architect own it; everyone else opens it read-only.
  'Spec AI': ['Project Admin', ...PDLC_ROLES],
  // The redesigned conversational surface, on its own path beside the original.
  'Spec AI v2': ['Project Admin', ...PDLC_ROLES],
  /*
   * Intent-to-code adjudication. Everyone downstream of the spec reads it — the
   * developer at their own PR, the lead at review, the EM on the rollup — so it
   * carries no narrower visibility than the pipeline it reports on.
   */
  CodeIQ: ['Project Admin', ...PDLC_ROLES],
};

/**
 * What a nav view is *called*, as distinct from what it is keyed by. The keys
 * are load-bearing — routing, RBAC and mock data all reference them — so the
 * two views that wanted friendlier names get them here instead of a rename.
 *
 * 'My Services' and 'Dashboard' both read as "Dashboard" now. They never appear
 * together: Dashboard is governance-only, My Services is PDLC-only, so no role
 * sees the same word twice.
 */
const NAV_LABELS: Partial<Record<NavView, string>> = {
  'My Services': 'Dashboard',
  'My Tasks': 'Project Tasks',
};

export const navLabel = (nav: NavView): string => NAV_LABELS[nav] ?? nav;

/**
 * Full-screen module workspaces. They are reached from the Command Centre doors
 * rather than the sidebar, and collapse the platform nav on entry so the module
 * gets the whole viewport.
 */
export const MODULE_WORKSPACES: NavView[] = ['Spec AI', 'Spec AI v2', 'CodeIQ'];

export const isModuleWorkspace = (nav: NavView) => MODULE_WORKSPACES.includes(nav);

export const isGovernanceRole = (role: Role) => GOVERNANCE_ROLES.includes(role);

/**
 * A Project Admin can browse the agent catalogue but cannot change it —
 * registering, editing routing or deactivating an agent affects every project on
 * the department baseline.
 */
export const canManageAgents = (role: Role) => BASELINE_ROLES.includes(role);

/**
 * Connector authority, as a strict ladder. Each tier holds everything below it:
 *
 *   tenant-availability   — decide which connectors exist for departments at all.
 *                           Tenant Admin only; revoking it cascades downward.
 *   department-baseline       — enable an available connector for one department.
 *                           Projects can activate only what is enabled here.
 *   project-activation    — bind an enabled connector to a project with
 *                           project credentials.
 */
export type ConnectorCapability =
  | 'tenant-availability'
  | 'department-baseline'
  | 'project-activation';

const CONNECTOR_LADDER: Record<Role, ConnectorCapability[]> = {
  'Tenant Admin': ['tenant-availability', 'department-baseline', 'project-activation'],
  'Department Admin': ['department-baseline', 'project-activation'],
  'Project Admin': ['project-activation'],
  'Product Manager': [],
  Architect: [],
  Designer: [],
  'Tech Lead': [],
  Developer: [],
  'QA Manager': [],
  'QA Engineer': [],
  'Release Manager': [],
};

export const connectorCapabilities = (role: Role): ConnectorCapability[] =>
  CONNECTOR_LADDER[role] ?? [];

export const canManageConnector = (role: Role, capability: ConnectorCapability): boolean =>
  connectorCapabilities(role).includes(capability);

/** Human-readable reason a control is unavailable, used in disabled tooltips. */
export const connectorDeniedReason = (capability: ConnectorCapability): string => {
  switch (capability) {
    case 'tenant-availability':
      return 'Tenant-wide availability is set by a Tenant Admin.';
    case 'department-baseline':
      return 'Department enablement is set by a Department Admin.';
    default:
      return 'You do not have permission to change this.';
  }
};

export const isPdlcRole = (role: Role) => PDLC_ROLES.includes(role);

export const canAccessNav = (role: Role, nav: NavView) => NAV_VISIBILITY[nav].includes(role);

/** Where a role lands on sign-in, or after a role switch invalidates the current view. */
export const landingNavForRole = (role: Role): NavView =>
  isGovernanceRole(role) ? 'Dashboard' : 'Command Centre';

/**
 * Scope a role operates at, narrowed to whatever the signed-in identity is
 * bound to. Tenant Admin sees every department; everyone else inherits their
 * account's department / project.
 */
export const scopeForRole = (role: Role, user: UserAccount | null): ScopeContext => {
  if (role === 'Tenant Admin') {
    return { type: 'tenant', departmentName: 'All Departments' };
  }

  const bound = user?.scope;
  const departmentId = bound?.departmentId ?? 'd-engineering';
  const departmentName = bound?.departmentName ?? 'Engineering';

  if (role === 'Department Admin') {
    return { type: 'department', departmentId, departmentName };
  }

  return {
    type: 'project',
    departmentId,
    departmentName,
    projectId: bound?.projectId ?? 'p-mobile-v2',
    projectName: bound?.projectName ?? 'Mobile Banking V2',
  };
};
