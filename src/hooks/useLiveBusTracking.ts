import { useState, useEffect, useMemo } from 'react';
import { BusLocation, Route, Bus, Driver, Schedule } from '../types';
import { LiveBusService } from '../services/busTrackingService';

export interface LiveTrackingStats {
  busLocations: BusLocation[];
  activeBusCount: number;
  avgSpeed: number;
  avgDelayMinutes: number;
  fleetUtilization: number;
  totalRoutedDistanceKm: number;
}

/**
 * Subscribes to the LiveBusService and provides live bus locations plus
 * computed fleet statistics.
 *
 * Call this hook once (in RouteMap). For Dashboard stats without the full
 * location array, use only the numeric fields returned.
 */
export function useLiveBusTracking(
  routes: Route[],
  buses: Bus[],
  drivers: Driver[],
  schedules: Schedule[]
): LiveTrackingStats {
  const [busLocations, setBusLocations] = useState<BusLocation[]>([]);

  // Build a lightweight signature to avoid re-initialising on every React render.
  // The service only needs to rebuild when active schedules or fleet changes.
  const dataSignature = useMemo(() => {
    const activeIds = schedules
      .filter(s => s.status === 'Active')
      .map(s => `${s.id}:${s.busId}:${s.routeId}`)
      .sort()
      .join(',');
    return `${activeIds}|buses:${buses.map(b => b.id).join(',')}`;
  }, [schedules, buses]);

  useEffect(() => {
    LiveBusService.initialize(routes, buses, drivers, schedules);
    const unsubscribe = LiveBusService.subscribe(setBusLocations);
    LiveBusService.start();

    return () => {
      unsubscribe();
      LiveBusService.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSignature]);

  // Derived stats — recomputed only when locations or fleet data changes
  const stats = useMemo<Omit<LiveTrackingStats, 'busLocations'>>(() => {
    const moving = busLocations.filter(b => b.status !== 'Off Duty');
    const activeBusCount = moving.length;

    const avgSpeed =
      activeBusCount > 0
        ? Math.round(moving.reduce((s, b) => s + b.speed, 0) / activeBusCount)
        : 0;

    const delayed = schedules.filter(
      s => s.status === 'Active' && s.delayMinutes > 0
    );
    const avgDelayMinutes =
      delayed.length > 0
        ? Math.round(
            delayed.reduce((s, sc) => s + sc.delayMinutes, 0) / delayed.length
          )
        : 0;

    const operationalBuses = buses.filter(
      b => b.status === 'On Route' || b.status === 'Available'
    ).length;
    const fleetUtilization =
      buses.length > 0
        ? Math.round((operationalBuses / buses.length) * 100)
        : 0;

    const totalRoutedDistanceKm = routes
      .filter(r => r.isActive)
      .reduce((sum, r) => sum + r.distanceKm, 0);

    return {
      activeBusCount,
      avgSpeed,
      avgDelayMinutes,
      fleetUtilization,
      totalRoutedDistanceKm,
    };
  }, [busLocations, buses, routes, schedules]);

  return { busLocations, ...stats };
}
