import { GPSLocation } from '../types';

/**
 * Haversine formula — returns the great-circle distance in kilometres
 * between two GPS coordinates.
 */
export function calculateDistance(a: GPSLocation, b: GPSLocation): number {
  const R = 6371; // Earth radius in km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const aa =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLng *
      sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

/**
 * Sum total distance of an ordered array of GPS waypoints in km.
 */
export function totalPathDistance(waypoints: GPSLocation[]): number {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += calculateDistance(waypoints[i - 1], waypoints[i]);
  }
  return total;
}

/**
 * Returns the distance along a polyline (array of [lat,lng] tuples) in km.
 */
export function polylineDistance(coords: [number, number][]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += calculateDistance(
      { lat: coords[i - 1][0], lng: coords[i - 1][1] },
      { lat: coords[i][0], lng: coords[i][1] }
    );
  }
  return total;
}
