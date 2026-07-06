/**
 * roles.ts
 * -----------------------------------------------------------------------------
 * Canonical role identifiers for the SRMSS platform. Keeping these centralised
 * (rather than sprinkling string literals across the codebase) means a future
 * Django REST + JWT backend can simply return one of these values in the
 * `role` claim/field and nothing else needs to change.
 * -----------------------------------------------------------------------------
 */

export const ROLES = {
  ADMINISTRATOR: 'Administrator',
  DEPOT_MANAGER: 'Depot Manager',
  OPERATOR: 'Operator',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: RoleName[] = [
  ROLES.ADMINISTRATOR,
  ROLES.DEPOT_MANAGER,
  ROLES.OPERATOR,
];

/** Human-friendly copy shown in the UI (badges, headers, role pickers). */
export const ROLE_LABELS: Record<RoleName, string> = {
  [ROLES.ADMINISTRATOR]: 'Administrator',
  [ROLES.DEPOT_MANAGER]: 'Depot Manager',
  [ROLES.OPERATOR]: 'Operator',
};

/** Short description shown under the role name on the login screen / profile. */
export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  [ROLES.ADMINISTRATOR]: 'Full system access across all modules and settings.',
  [ROLES.DEPOT_MANAGER]: 'Operational control over fleet, routes, drivers & schedules.',
  [ROLES.OPERATOR]: 'Field-level access to assigned schedules, fuel & maintenance logs.',
};
