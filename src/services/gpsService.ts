import { GPSLocation } from '../types';
import { interpolateOnPath } from '../utils/geoHelpers';

/**
 * Interpolates a GPS position along an OSRM polyline at the given progress (0–1).
 * Returns both the interpolated GPSLocation and the compass heading.
 */
export function interpolatePositionAlongPath(
  coordinates: [number, number][],
  progress: number
): { position: GPSLocation; heading: number } {
  const { position, heading } = interpolateOnPath(coordinates, progress);
  return {
    position: {
      lat: position[0],
      lng: position[1],
      heading,
      speed: 0, // populated by busTrackingService
    },
    heading,
  };
}

/**
 * Computes a tight bounding box around a set of [lat, lng] coordinates.
 * Returns Sri Lanka's full extent as a safe default when coords are empty.
 */
export function getBoundsFromCoords(coords: [number, number][]): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  if (coords.length === 0) {
    return { north: 9.9, south: 5.9, east: 81.9, west: 79.5 };
  }
  return {
    north: Math.max(...coords.map(c => c[0])),
    south: Math.min(...coords.map(c => c[0])),
    east: Math.max(...coords.map(c => c[1])),
    west: Math.min(...coords.map(c => c[1])),
  };
}

/**
 * Given a progress value (0–1) and the total number of stops on a route,
 * returns the index of the current stop the bus has most recently passed.
 */
export function getCurrentStopIndex(progress: number, totalStops: number): number {
  return Math.min(Math.floor(progress * (totalStops - 1)), totalStops - 2);
}
