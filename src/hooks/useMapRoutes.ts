import { useState, useEffect, useCallback, useRef } from 'react';
import { Route } from '../types';
import { CITIES_GEOGRAPHY } from '../data/geography';
import { fetchOSRMRoute } from '../services/routingService';
import { LiveBusService } from '../services/busTrackingService';

export type RouteGeometries = Map<string, [number, number][]>;

export interface UseMapRoutesResult {
  routeGeometries: RouteGeometries;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Fetches OSRM road geometries for all active routes and caches them.
 * Once loaded, the geometries are forwarded to the LiveBusService so
 * bus markers follow real roads instead of straight lines.
 */
export function useMapRoutes(routes: Route[]): UseMapRoutesResult {
  const [routeGeometries, setRouteGeometries] = useState<RouteGeometries>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref so the loadRoutes callback doesn't capture stale `routes`
  const routesRef = useRef(routes);
  routesRef.current = routes;

  const loadRoutes = useCallback(async () => {
    const currentRoutes = routesRef.current;
    if (currentRoutes.length === 0) return;

    setLoading(true);
    setError(null);

    const results = new Map<string, [number, number][]>();
    let hasError = false;

    await Promise.allSettled(
      currentRoutes.map(async route => {
        // Map each stop name to a GPS waypoint
        const waypoints = route.stops
          .map(stop => CITIES_GEOGRAPHY[stop])
          .filter(Boolean)
          .map(geo => ({ lat: geo.lat, lng: geo.lng }));

        if (waypoints.length < 2) return;

        try {
          const coords = await fetchOSRMRoute(waypoints);
          results.set(route.id, coords);
        } catch {
          hasError = true;
          // Fall back to straight lines — already handled inside fetchOSRMRoute,
          // but add a straight-line explicitly if the function itself throws.
          const fallback: [number, number][] = waypoints.map(
            w => [w.lat, w.lng]
          );
          results.set(route.id, fallback);
        }
      })
    );

    setRouteGeometries(results);

    // Forward real road geometries to the tracking service
    // so animated buses follow actual roads from this point on
    LiveBusService.updateRouteGeometries(results);

    setLoading(false);
    if (hasError) setError('Some routes used straight-line fallback (OSRM unreachable).');
  }, []); // stable — reads routes via ref

  // Build a stable signature so we re-fetch only when active route IDs change
  const routeSignature = routes
    .filter(r => r.isActive)
    .map(r => r.id)
    .sort()
    .join(',');

  useEffect(() => {
    loadRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSignature]);

  return { routeGeometries, loading, error, reload: loadRoutes };
}
