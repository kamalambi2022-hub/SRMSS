import { AuditLog, Bus, Depot, BusStop, Driver, FuelLog, MaintenanceLog, Route, Schedule } from '../types';
import { readPersistedSession } from '../authentication/utils/authHelpers';

// In dev, Vite proxies "/api" straight to the Express server (see vite.config.ts).
// In production, set VITE_API_BASE_URL to your deployed API's base URL.
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

/** Fired when any API call comes back 401 so AuthContext can log the user out. */
export const SESSION_EXPIRED_EVENT = 'srmss:session-expired';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = readPersistedSession();
  const accessToken = session?.tokens?.accessToken;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...options,
  });

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    throw new Error('Your session has expired. Please sign in again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status} ${res.statusText}`);
  }

  // DELETE endpoints return { success, id } — everything else returns the record(s).
  return res.json() as Promise<T>;
}

function crud<T extends { id: string }>(resource: string) {
  return {
    list: () => request<T[]>(`/${resource}`),
    get: (id: string) => request<T>(`/${resource}/${id}`),
    create: (data: Partial<T>) => request<T>(`/${resource}`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<T>) =>
      request<T>(`/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ success: boolean; id: string }>(`/${resource}/${id}`, { method: 'DELETE' }),
  };
}

export const routesApi = crud<Route>('routes');
export const busesApi = crud<Bus>('buses');
export const driversApi = crud<Driver>('drivers');
export const schedulesApi = crud<Schedule>('schedules');
export const maintenanceApi = crud<MaintenanceLog>('maintenance-logs');
export const fuelApi = crud<FuelLog>('fuel-logs');
export const auditApi = crud<AuditLog>('audit-logs');
export const depotsApi = crud<Depot>('depots');
export const busStopsApi = crud<BusStop>('bus-stops');

/** Loads every module's data in parallel — used once on app start. */
export async function loadAllData() {
  const [routes, buses, drivers, schedules, maintenanceLogs, fuelLogs, auditLogs] = await Promise.all([
    routesApi.list(),
    busesApi.list(),
    driversApi.list(),
    schedulesApi.list(),
    maintenanceApi.list(),
    fuelApi.list(),
    auditApi.list(),
  ]);
  return { routes, buses, drivers, schedules, maintenanceLogs, fuelLogs, auditLogs };
}
