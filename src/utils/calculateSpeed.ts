/**
 * Calculates average speed in km/h.
 *
 * @param distanceKm  Distance travelled in kilometres
 * @param timeMs      Elapsed time in milliseconds
 */
export function calculateSpeed(distanceKm: number, timeMs: number): number {
  if (timeMs <= 0 || distanceKm < 0) return 0;
  const hours = timeMs / 3_600_000;
  return distanceKm / hours;
}

/**
 * Clamps a speed value within a realistic bus operating range.
 */
export function clampBusSpeed(speedKmh: number): number {
  return Math.max(0, Math.min(120, speedKmh));
}

/**
 * Smoothly evolves a bus speed towards a target using an
 * exponential moving average — simulates natural acceleration/deceleration.
 */
export function smoothSpeed(
  current: number,
  target: number,
  alpha = 0.15
): number {
  return clampBusSpeed(current + alpha * (target - current) + (Math.random() - 0.5) * 4);
}
