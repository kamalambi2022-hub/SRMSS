import { GPSLocation } from '../types';

/** Module-level cache to avoid repeated OSRM API calls for the same route. */
const routeCache = new Map<string, [number, number][]>();

/**
 * Fetches a road-following route from OSRM's public API.
 * Returns an array of [lat, lng] tuples representing the route geometry.
 *
 * Falls back to straight-line segments between stops on any network error,
 * so the application remains functional even offline.
 *
 * 🔄 Future: Replace the OSRM_BASE_URL with your own OSRM instance or
 * Valhalla endpoint without any UI changes.
 */
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

export async function fetchOSRMRoute(
  stops: GPSLocation[]
): Promise<[number, number][]> {
  if (stops.length < 2) {
    return stops.map(s => [s.lat, s.lng]);
  }

  // Build a stable cache key from rounded coordinates
  const cacheKey = stops
    .map(s => `${s.lat.toFixed(4)},${s.lng.toFixed(4)}`)
    .join('|');

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // OSRM expects lng,lat order
  const coordString = stops.map(s => `${s.lng},${s.lat}`).join(';');
  const url = `${OSRM_BASE_URL}/${coordString}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('OSRM returned no routes');
    }

    // GeoJSON coordinates are [lng, lat] — convert to [lat, lng] for Leaflet
    const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );

    routeCache.set(cacheKey, coords);
    return coords;
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.warn(`[RoutingService] OSRM failed — using straight-line fallback:`, error.message);
    }
    // Graceful fallback: straight lines between stops
    const fallback: [number, number][] = stops.map(s => [s.lat, s.lng]);
    routeCache.set(cacheKey, fallback); // cache the fallback too
    return fallback;
  }
}

/** Clears the route geometry cache (useful for testing). */
export function clearRouteCache(): void {
  routeCache.clear();
}

/** Returns the current number of cached routes. */
export function getCacheSize(): number {
  return routeCache.size;
}
