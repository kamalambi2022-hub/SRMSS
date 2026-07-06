/**
 * Given a remaining distance (km) and current speed (km/h),
 * returns a formatted HH:MM clock time representing the ETA.
 */
export function calculateETA(distanceKm: number, speedKmh: number): string {
  if (speedKmh <= 0 || distanceKm <= 0) return '--:--';
  const hoursRemaining = distanceKm / speedKmh;
  const eta = new Date(Date.now() + hoursRemaining * 3_600_000);
  const hh = eta.getHours().toString().padStart(2, '0');
  const mm = eta.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Returns a human-readable duration string like "2h 15m" or "45m".
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Calculates estimated delay in minutes between scheduled and live ETA.
 */
export function calculateDelay(
  scheduledArrival: string, // HH:MM
  etaString: string          // HH:MM
): number {
  const [sh, sm] = scheduledArrival.split(':').map(Number);
  const [eh, em] = etaString.split(':').map(Number);
  const scheduledMins = sh * 60 + sm;
  const etaMins = eh * 60 + em;
  return Math.max(0, etaMins - scheduledMins);
}
