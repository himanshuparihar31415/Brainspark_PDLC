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
  'Prompt Controls': TENANT_ROLES,
  Security: TENANT_ROLES,
  'My Services': PDLC_ROLES,
  'Command Centre': ['Project Admin', ...PDLC_ROLES],
  'My Tasks': ['Project Admin', ...PDLC_ROLES],
};

export const isGovernanceRole = (role: Role) => GOVERNANCE_ROLES.includes(role);

/**
 * A Project Admin can see held agents but cannot retire a version — deprecation
 * affects every project on the tenant baseline.
 */
export const canDeprecateAgent = (role: Role) => TENANT_ROLES.includes(role);

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
