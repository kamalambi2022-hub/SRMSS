import { BusLocation, Route, Bus, Driver, Schedule } from '../types';
import { CITIES_GEOGRAPHY } from '../data/geography';
import { interpolatePositionAlongPath } from './gpsService';
import { smoothSpeed } from '../utils/calculateSpeed';
import { calculateETA } from '../utils/calculateETA';

// ─── Internal State ──────────────────────────────────────────────────────────

interface TrackingState {
  scheduleId: string;
  busId: string;
  routeId: string;
  driverId: string;
  progress: number;   // 0–1 along route
  speed: number;      // km/h current
  coordinates: [number, number][]; // OSRM road geometry (or straight-line fallback)
}

type Subscriber = (locations: BusLocation[]) => void;

// ─── LiveBusService (Singleton) ───────────────────────────────────────────────
//
// Architecture note: This singleton is intentionally decoupled from the React
// component tree. Swap the `tick()` method's data source with a Firebase
// listener, Supabase real-time subscription, or MQTT topic without touching
// any UI component.

class LiveBusServiceClass {
  private states = new Map<string, TrackingState>();
  private routeGeometries = new Map<string, [number, number][]>();
  private subscribers: Set<Subscriber> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // Cached references to domain data
  private routes: Route[] = [];
  private buses: Bus[] = [];
  private drivers: Driver[] = [];
  private schedules: Schedule[] = [];

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Initialise (or re-initialise) the service with current domain data.
   * Only rebuilds tracking states when the set of active schedules changes.
   */
  initialize(
    routes: Route[],
    buses: Bus[],
    drivers: Driver[],
    schedules: Schedule[]
  ): void {
    this.routes = routes;
    this.buses = buses;
    this.drivers = drivers;
    this.schedules = schedules;
    this.buildStates();
  }

  /**
   * Provide OSRM road geometry for a route so buses follow real roads.
   * Falls back to straight-line city coordinates if not provided.
   */
  updateRouteGeometries(geometries: Map<string, [number, number][]>): void {
    this.routeGeometries = geometries;
    // Upgrade existing tracking states to use real road geometries
    this.states.forEach((state, key) => {
      const coords = this.routeGeometries.get(state.routeId);
      if (coords && coords.length >= 2) {
        this.states.set(key, { ...state, coordinates: coords });
      }
    });
  }

  /** Start the simulation loop. Safe to call multiple times. */
  start(): void {
    if (this.intervalId !== null) return;
    this.intervalId = setInterval(() => this.tick(), 800);
  }

  /** Stop the simulation loop. */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Subscribe to location updates.
   * Returns an unsubscribe function — call it in your useEffect cleanup.
   *
   * 🔄 Future: Replace the setInterval tick with a Firebase onSnapshot /
   * Supabase subscribe / MQTT message handler that calls `this.notify()`.
   */
  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    // Immediately deliver current snapshot so the UI doesn't wait for first tick
    callback(this.buildLocations());
    return () => this.subscribers.delete(callback);
  }

  /** Returns a one-time snapshot of all current bus locations. */
  getSnapshot(): BusLocation[] {
    return this.buildLocations();
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private buildStates(): void {
    const activeSchedules = this.schedules.filter(s => s.status === 'Active');
    this.states.clear();

    activeSchedules.forEach(schedule => {
      const route = this.routes.find(r => r.id === schedule.routeId);
      if (!route) return;

      // Use OSRM geometry if already available, else straight-line city coords
      const existingCoords = this.routeGeometries.get(route.id);
      const fallbackCoords: [number, number][] = route.stops
        .map(stop => CITIES_GEOGRAPHY[stop])
        .filter(Boolean)
        .map(geo => [geo.lat, geo.lng] as [number, number]);

      const coordinates =
        existingCoords && existingCoords.length >= 2
          ? existingCoords
          : fallbackCoords;

      if (coordinates.length < 2) return;

      this.states.set(schedule.id, {
        scheduleId: schedule.id,
        busId: schedule.busId,
        routeId: schedule.routeId,
        driverId: schedule.driverId,
        // Seed progress randomly between 10-70% so buses don't all cluster
        progress: 0.1 + Math.random() * 0.6,
        speed: 40 + Math.random() * 35,
        coordinates,
      });
    });
  }

  /** Advance all buses one simulation tick. */
  private tick(): void {
    this.states.forEach((state, key) => {
      const targetSpeed = 35 + Math.random() * 55;
      const newSpeed = smoothSpeed(state.speed, targetSpeed);
      // Progress increment ∝ speed (faster buses advance more per tick)
      const progressDelta = (newSpeed / 3600) * (0.8 / 50); // ~800ms tick scaled
      const newProgress = state.progress + progressDelta;

      this.states.set(key, {
        ...state,
        progress: newProgress >= 0.97 ? 0.04 : newProgress, // loop back to start
        speed: newSpeed,
      });
    });

    this.notify();
  }

  private buildLocations(): BusLocation[] {
    const locations: BusLocation[] = [];

    this.states.forEach(state => {
      const bus = this.buses.find(b => b.id === state.busId);
      const route = this.routes.find(r => r.id === state.routeId);
      const schedule = this.schedules.find(s => s.id === state.scheduleId);

      if (!bus || !route || !schedule) return;

      const { position, heading } = interpolatePositionAlongPath(
        state.coordinates,
        state.progress
      );

      // Determine current/next stop from progress
      const stopCount = route.stops.length;
      const stopIndex = Math.min(
        Math.floor(state.progress * (stopCount - 1)),
        stopCount - 2
      );
      const currentStop = route.stops[stopIndex] ?? route.startLocation;
      const nextStop = route.stops[stopIndex + 1] ?? route.endLocation;

      const remainingKm = Math.max(0, route.distanceKm * (1 - state.progress));
      const eta = calculateETA(remainingKm, state.speed);
      const fuelLevel = Math.max(15, 100 - state.progress * 65);

      locations.push({
        id: state.scheduleId,
        busId: state.busId,
        routeId: state.routeId,
        driverId: state.driverId,
        position: { ...position, heading, speed: Math.round(state.speed) },
        speed: Math.round(state.speed),
        heading,
        currentStop,
        nextStop,
        destination: route.endLocation,
        eta,
        remainingDistanceKm: Math.round(remainingKm * 10) / 10,
        fuelLevel: Math.round(fuelLevel),
        status: schedule.delayMinutes > 0 ? 'Delayed' : 'Moving',
        lastUpdated: new Date().toISOString(),
        routeProgress: state.progress,
      });
    });

    return locations;
  }

  private notify(): void {
    const locations = this.buildLocations();
    this.subscribers.forEach(sub => sub(locations));
  }
}

// Export singleton instance
export const LiveBusService = new LiveBusServiceClass();
