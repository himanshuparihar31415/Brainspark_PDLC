import { NavView, Role, ScopeContext, UserAccount } from '../types';

export const GOVERNANCE_ROLES: Role[] = ['Super Admin', 'Tenant Admin', 'Project Admin'];

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
 * Roles that own tenant-level governed assets — prompt versions, golden
 * evaluations, session/API policy. A Project Admin runs a project; it does not
 * set the baselines the project inherits.
 */
export const TENANT_ROLES: Role[] = ['Super Admin', 'Tenant Admin'];

/**
 * Single source of truth for subtractive navigation. The sidebar renders from
 * this map and the role-switch / sign-in logic validates against it, so a role
 * can never land on a view it cannot see.
 */
export const NAV_VISIBILITY: Record<NavView, Role[]> = {
  Dashboard: GOVERNANCE_ROLES,
  Tenants: ['Super Admin'],
  Projects: ['Super Admin', 'Tenant Admin'],
  Team: GOVERNANCE_ROLES,
  Connectors: GOVERNANCE_ROLES,
  // Visible to a Project Admin, but read-only — see canDeprecateAgent.
  'Agent Registry': GOVERNANCE_ROLES,
  Evaluation: TENANT_ROLES,
  /*
   * All three governance tiers see it; scope decides what the numbers cover, so a
   * Tenant Admin's "enterprise" view is their own tenant. Reading payload content
   * at L5 is a separate right — see canViewPayloads in data/observability.
   */
  Observability: GOVERNANCE_ROLES,
  'Prompt Controls': TENANT_ROLES,
  Security: TENANT_ROLES,
  'My Services': PDLC_ROLES,
  'Command Centre': ['Project Admin', ...PDLC_ROLES],
  'My Tasks': ['Project Admin', ...PDLC_ROLES],
  // Module workspace: reached from the Command Centre doors, not the sidebar.
  // PM and Architect own it; everyone else opens it read-only.
  'Spec AI': ['Project Admin', ...PDLC_ROLES],
};

/**
 * Full-screen module workspaces. They are reached from the Command Centre doors
 * rather than the sidebar, and collapse the platform nav on entry so the module
 * gets the whole viewport.
 */
export const MODULE_WORKSPACES: NavView[] = ['Spec AI'];

export const isModuleWorkspace = (nav: NavView) => MODULE_WORKSPACES.includes(nav);

export const isGovernanceRole = (role: Role) => GOVERNANCE_ROLES.includes(role);

/**
 * A Project Admin can see held agents but cannot retire a version — deprecation
 * affects every project on the tenant baseline.
 */
export const canDeprecateAgent = (role: Role) => TENANT_ROLES.includes(role);

/**
 * Connector authority, as a strict ladder. Each tier holds everything below it:
 *
 *   platform-availability — decide which connectors exist for tenants at all.
 *                           Super Admin only; revoking it cascades downward.
 *   tenant-baseline       — enable an available connector for one tenant.
 *                           Projects can activate only what is enabled here.
 *   project-activation    — bind an enabled connector to a project with
 *                           project credentials.
 */
export type ConnectorCapability =
  | 'platform-availability'
  | 'tenant-baseline'
  | 'project-activation';

const CONNECTOR_LADDER: Record<Role, ConnectorCapability[]> = {
  'Super Admin': ['platform-availability', 'tenant-baseline', 'project-activation'],
  'Tenant Admin': ['tenant-baseline', 'project-activation'],
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
    case 'platform-availability':
      return 'Platform availability is set by a Super Admin.';
    case 'tenant-baseline':
      return 'Tenant enablement is set by a Tenant Admin.';
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
 * bound to. Super Admin sees the whole platform; everyone else inherits their
 * account's tenant / project.
 */
export const scopeForRole = (role: Role, user: UserAccount | null): ScopeContext => {
  if (role === 'Super Admin') {
    return { type: 'platform', tenantName: 'All Tenants' };
  }

  const bound = user?.scope;
  const tenantId = bound?.tenantId ?? 't-incedo';
  const tenantName = bound?.tenantName ?? 'Incedo Labs';

  if (role === 'Tenant Admin') {
    return { type: 'tenant', tenantId, tenantName };
  }

  return {
    type: 'project',
    tenantId,
    tenantName,
    projectId: bound?.projectId ?? 'p-mobile-v2',
    projectName: bound?.projectName ?? 'Mobile Banking V2',
  };
};
