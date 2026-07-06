import { GPSLocation } from '../types';
import { CITIES_GEOGRAPHY } from '../data/geography';

/**
 * Converts a city name to a GPSLocation using the CITIES_GEOGRAPHY lookup.
 * Returns null if the city is unknown.
 */
export function cityToGPSLocation(cityName: string): GPSLocation | null {
  const geo = CITIES_GEOGRAPHY[cityName];
  if (!geo) return null;
  return { lat: geo.lat, lng: geo.lng };
}

/** Converts a GPSLocation to a Leaflet-compatible [lat, lng] tuple. */
export function toLatLngArray(loc: GPSLocation): [number, number] {
  return [loc.lat, loc.lng];
}

/**
 * Interpolates a position along a polyline (array of [lat, lng] tuples).
 * Progress is a value from 0 (start) to 1 (end).
 * Returns the interpolated [lat, lng] and the compass heading in degrees.
 */
export function interpolateOnPath(
  path: [number, number][],
  progress: number
): { position: [number, number]; heading: number } {
  if (path.length === 0) return { position: [7.8731, 80.7718], heading: 0 };
  if (path.length === 1) return { position: path[0], heading: 0 };

  const clamped = Math.max(0, Math.min(0.9999, progress));
  const totalSegments = path.length - 1;
  const raw = clamped * totalSegments;
  const segIdx = Math.min(Math.floor(raw), totalSegments - 1);
  const t = raw - segIdx;

  const [startLat, startLng] = path[segIdx];
  const [endLat, endLng] = path[segIdx + 1];

  const lat = startLat + (endLat - startLat) * t;
  const lng = startLng + (endLng - startLng) * t;

  // Heading: bearing from start to end of current segment
  const dLng = endLng - startLng;
  const dLat = endLat - startLat;
  const heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;

  return { position: [lat, lng], heading };
}

/**
 * Converts an array of city-name stops to a [lat, lng][] fallback path.
 * Cities not found in CITIES_GEOGRAPHY are skipped.
 */
export function stopsToFallbackPath(stops: string[]): [number, number][] {
  return stops
    .map(stop => CITIES_GEOGRAPHY[stop])
    .filter(Boolean)
    .map(geo => [geo.lat, geo.lng] as [number, number]);
}

/**
 * Computes the compass bearing (degrees) from point A to point B.
 */
export function bearingBetween(a: GPSLocation, b: GPSLocation): number {
  const dLng = b.lng - a.lng;
  const dLat = b.lat - a.lat;
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}
