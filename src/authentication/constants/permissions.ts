import { ROLES, RoleName } from './roles';

/**
 * permissions.ts
 * -----------------------------------------------------------------------------
 * Fine-grained, action-level permissions plus the route/module map used by
 * `ProtectedRoute`. Centralising this table means adding a new module or
 * tightening a permission is a one-line change instead of a hunt through
 * component files.
 * -----------------------------------------------------------------------------
 */

export const PERMISSIONS = {
  MANAGE_USERS: 'manage_users',
  MANAGE_BUSES: 'manage_buses',
  MANAGE_ROUTES: 'manage_routes',
  MANAGE_DRIVERS: 'manage_drivers',
  MANAGE_SCHEDULES: 'manage_schedules',
  MANAGE_MAINTENANCE: 'manage_maintenance',
  APPROVE_MAINTENANCE: 'approve_maintenance',
  MANAGE_FUEL_LOGS: 'manage_fuel_logs',
  RECORD_FUEL_LOGS: 'record_fuel_logs',
  RECORD_MAINTENANCE_REQUESTS: 'record_maintenance_requests',
  VIEW_REPORTS: 'view_reports',
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  CONFIGURE_SETTINGS: 'configure_settings',
  VIEW_ASSIGNED_SCHEDULES: 'view_assigned_schedules',
  UPDATE_TRIP_STATUS: 'update_trip_status',
  VIEW_ASSIGNED_BUSES: 'view_assigned_buses',
  DELETE_RECORDS: 'delete_records',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Role -> permission set. */
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [ROLES.ADMINISTRATOR]: Object.values(PERMISSIONS),
  [ROLES.DEPOT_MANAGER]: [
    PERMISSIONS.MANAGE_BUSES,
    PERMISSIONS.MANAGE_ROUTES,
    PERMISSIONS.MANAGE_SCHEDULES,
    PERMISSIONS.MANAGE_DRIVERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.APPROVE_MAINTENANCE,
    PERMISSIONS.MANAGE_MAINTENANCE,
    PERMISSIONS.RECORD_FUEL_LOGS,
    PERMISSIONS.RECORD_MAINTENANCE_REQUESTS,
  ],
  [ROLES.OPERATOR]: [
    PERMISSIONS.VIEW_ASSIGNED_SCHEDULES,
    PERMISSIONS.UPDATE_TRIP_STATUS,
    PERMISSIONS.RECORD_FUEL_LOGS,
    PERMISSIONS.RECORD_MAINTENANCE_REQUESTS,
    PERMISSIONS.VIEW_ASSIGNED_BUSES,
  ],
};

/** Application routes/modules, keyed the same as the sidebar tab ids in App.tsx. */
export const MODULE_ROUTES = {
  DASHBOARD: 'dashboard',
  ROUTES: 'routes',
  FLEET: 'fleet',
  DRIVERS: 'drivers',
  SCHEDULES: 'schedules',
  MAINTENANCE: 'maintenance',
  REPORTS: 'reports',
  ANALYTICS: 'analytics',
  AUDIT_LOGS: 'audit-logs',
  SETTINGS: 'settings',
} as const;

export type ModuleRoute = (typeof MODULE_ROUTES)[keyof typeof MODULE_ROUTES];

/** Role -> the set of modules/pages that role is allowed to open. */
export const ROLE_MODULE_ACCESS: Record<RoleName, ModuleRoute[]> = {
  [ROLES.ADMINISTRATOR]: [
    MODULE_ROUTES.DASHBOARD,
    MODULE_ROUTES.ROUTES,
    MODULE_ROUTES.FLEET,
    MODULE_ROUTES.DRIVERS,
    MODULE_ROUTES.SCHEDULES,
    MODULE_ROUTES.MAINTENANCE,
    MODULE_ROUTES.REPORTS,
    MODULE_ROUTES.ANALYTICS,
    MODULE_ROUTES.AUDIT_LOGS,
    MODULE_ROUTES.SETTINGS,
  ],
  [ROLES.DEPOT_MANAGER]: [
    MODULE_ROUTES.DASHBOARD,
    MODULE_ROUTES.FLEET,
    MODULE_ROUTES.ROUTES,
    MODULE_ROUTES.DRIVERS,
    MODULE_ROUTES.SCHEDULES,
    MODULE_ROUTES.MAINTENANCE,
    MODULE_ROUTES.REPORTS,
  ],
  [ROLES.OPERATOR]: [
    MODULE_ROUTES.DASHBOARD,
    MODULE_ROUTES.SCHEDULES,
    MODULE_ROUTES.MAINTENANCE,
  ],
};

export function roleHasPermission(role: RoleName | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function roleHasModuleAccess(role: RoleName | undefined | null, moduleRoute: ModuleRoute): boolean {
  if (!role) return false;
  return ROLE_MODULE_ACCESS[role]?.includes(moduleRoute) ?? false;
}
