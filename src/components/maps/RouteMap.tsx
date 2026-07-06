/**
 * RouteMap.tsx — Professional GIS Map Component
 *
 * Replaces the legacy SVG simulation with a full OpenStreetMap implementation
 * using React Leaflet + OSRM road routing.
 *
 * Layers: Route polylines · Bus stop markers · Depot markers · Live bus markers
 * Controls: Layer toggles · Dark/light mode · Search · Service filter
 * Panel: Live fleet stats (active buses, speed, delay, utilization)
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  ZoomControl,
  ScaleControl,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Eye,
  EyeOff,
  Layers,
  Search,
  Bus as BusIcon,
  MapPin,
  Navigation,
  Activity,
  Gauge,
  Clock,
  Fuel,
  AlertTriangle,
  CheckCircle,
  Building2,
  RotateCcw,
  Signal,
  Info,
  X,
} from 'lucide-react';

import { Route, Bus, Driver, Schedule, BusLocation } from '../../types';
import { useLiveBusTracking } from '../../hooks/useLiveBusTracking';
import { useMapRoutes } from '../../hooks/useMapRoutes';
import {
  SERVICE_COLORS,
  getServiceColor,
  createPulsingBusIcon,
  createStopIcon,
  createDepotIcon,
} from '../../services/mapService';
import { initialDepots, initialBusStops, CITIES_GEOGRAPHY } from '../../data/geography';

// ─── Fix Leaflet default icon paths broken by Vite's asset hashing ───────────
// We only use DivIcons so this just prevents console warnings.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)['_getIconUrl'];
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Sri Lanka map bounds ─────────────────────────────────────────────────────
const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];
const SRI_LANKA_ZOOM = 8;

// ─── Tile configurations ─────────────────────────────────────────────────────
const TILES = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface RouteMapProps {
  routes: Route[];
  buses: Bus[];
  drivers: Driver[];
  schedules: Schedule[];
  selectedRouteId?: string | null;
  onSelectRoute?: (routeId: string | null) => void;
}

// ─── MapController — zooms/pans map programmatically ─────────────────────────
interface MapControllerProps {
  selectedRouteId: string | null;
  routeGeometries: Map<string, [number, number][]>;
}

function MapController({ selectedRouteId, routeGeometries }: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!selectedRouteId) return;
    const coords = routeGeometries.get(selectedRouteId);
    if (!coords || coords.length < 2) return;
    try {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    } catch {
      // bounds may be invalid if only one point
    }
  }, [selectedRouteId, routeGeometries, map]);

  return null;
}

// ─── LayerToggle — reusable toggle button ────────────────────────────────────
interface LayerToggleProps {
  label: string;
  value: boolean;
  onChange: () => void;
  dot?: string;
}

function LayerToggle({ label, value, onChange, dot }: LayerToggleProps) {
  return (
    <button
      onClick={onChange}
      className={`w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg transition-all mb-1 ${
        value
          ? 'text-emerald-300 bg-emerald-950/40 border border-emerald-800/40'
          : 'text-slate-400 hover:bg-slate-800/60 border border-transparent'
      }`}
    >
      <span className="flex items-center gap-2">
        {value ? (
          <Eye className="w-3 h-3 shrink-0" />
        ) : (
          <EyeOff className="w-3 h-3 shrink-0" />
        )}
        {label}
      </span>
      {dot && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: value ? dot : '#475569' }}
        />
      )}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RouteMap({
  routes,
  buses,
  drivers,
  schedules,
  selectedRouteId = null,
  onSelectRoute,
}: RouteMapProps) {
  // Layer visibility
  const [showRoutes, setShowRoutes] = useState(true);
  const [showStops, setShowStops] = useState(true);
  const [showDepots, setShowDepots] = useState(true);
  const [showBuses, setShowBuses] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  // UI
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('All');
  const [infoPanelExpanded, setInfoPanelExpanded] = useState(true);

  // Data hooks
  const { busLocations, activeBusCount, avgSpeed, avgDelayMinutes, fleetUtilization, totalRoutedDistanceKm } =
    useLiveBusTracking(routes, buses, drivers, schedules);

  const { routeGeometries, loading, error, reload } = useMapRoutes(routes);

  // ── Filtered routes ─────────────────────────────────────────────────────────
  const filteredRoutes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return routes.filter(r => {
      const matchSearch =
        !q ||
        r.routeNumber.toLowerCase().includes(q) ||
        r.startLocation.toLowerCase().includes(q) ||
        r.endLocation.toLowerCase().includes(q);
      const matchService =
        serviceFilter === 'All' || r.serviceType === serviceFilter;
      return matchSearch && matchService && r.isActive;
    });
  }, [routes, searchQuery, serviceFilter]);

  // ── Unique stops across filtered routes ─────────────────────────────────────
  const stopMarkers = useMemo(() => {
    const seen = new Set<string>();
    const stops: Array<{
      id: string;
      name: string;
      lat: number;
      lng: number;
      routeNumbers: string[];
      arrival?: string;
      departure?: string;
      nextBus?: string;
    }> = [];

    filteredRoutes.forEach(route => {
      route.stops.forEach(stopName => {
        const geo = CITIES_GEOGRAPHY[stopName];
        if (!geo || seen.has(stopName)) return;
        seen.add(stopName);

        // Check if there's detailed stop data
        const detail = initialBusStops.find(bs => bs.name === stopName);
        const routeNumbers = routes
          .filter(r => r.stops.includes(stopName))
          .map(r => r.routeNumber);

        stops.push({
          id: stopName,
          name: stopName,
          lat: geo.lat,
          lng: geo.lng,
          routeNumbers,
          arrival: detail?.arrivalTime,
          departure: detail?.departureTime,
          nextBus: detail?.nextBusEta,
        });
      });
    });

    return stops;
  }, [filteredRoutes, routes]);

  // ── Bus locations filtered by search ────────────────────────────────────────
  const filteredBusLocations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return busLocations.filter(loc => {
      const bus = buses.find(b => b.id === loc.busId);
      const route = routes.find(r => r.id === loc.routeId);
      if (!bus || !route) return false;

      // Apply service type filter
      if (serviceFilter !== 'All' && route.serviceType !== serviceFilter) {
        return false;
      }

      // Apply route filter from filteredRoutes
      if (!filteredRoutes.some(r => r.id === loc.routeId)) return false;

      if (q) {
        return (
          bus.registrationNo.toLowerCase().includes(q) ||
          route.routeNumber.toLowerCase().includes(q) ||
          loc.nextStop.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [busLocations, buses, routes, filteredRoutes, searchQuery, serviceFilter]);

  const tile = darkMode ? TILES.dark : TILES.light;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950"
      id="srmss-leaflet-map"
      style={{ minHeight: '560px' }}
    >
      {/* ── Map Container ──────────────────────────────────────────────────── */}
      <div className="flex-1 relative" style={{ minHeight: '420px' }}>
        <MapContainer
          center={SRI_LANKA_CENTER}
          zoom={SRI_LANKA_ZOOM}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          {/* Tile Layer */}
          <TileLayer url={tile.url} attribution={tile.attribution} maxZoom={18} />

          {/* Zoom & Scale */}
          <ZoomControl position="bottomright" />
          <ScaleControl position="bottomleft" imperial={false} />

          {/* Pan/Zoom to selected route */}
          <MapController
            selectedRouteId={selectedRouteId}
            routeGeometries={routeGeometries}
          />

          {/* ── Route Polylines ─────────────────────────────────────────── */}
          {showRoutes &&
            filteredRoutes.map(route => {
              const coords = routeGeometries.get(route.id);
              if (!coords || coords.length < 2) return null;

              const isSelected = selectedRouteId === route.id;
              const color = getServiceColor(route.serviceType);

              return (
                <React.Fragment key={route.id}>
                  {/* Glow halo for selected route */}
                  {isSelected && (
                    <Polyline
                      positions={coords}
                      color={color}
                      weight={14}
                      opacity={0.15}
                    />
                  )}
                  {/* Route line */}
                  <Polyline
                    positions={coords}
                    color={color}
                    weight={isSelected ? 4.5 : 2.5}
                    opacity={isSelected ? 1 : 0.75}
                    dashArray={route.isActive ? undefined : '10, 8'}
                    eventHandlers={{
                      click: () =>
                        onSelectRoute?.(isSelected ? null : route.id),
                    }}
                  />
                </React.Fragment>
              );
            })}

          {/* ── Bus Stop Markers ─────────────────────────────────────────── */}
          {showStops &&
            stopMarkers.map(stop => {
              const isHighlighted = !!selectedRouteId && filteredRoutes
                .find(r => r.id === selectedRouteId)
                ?.stops.includes(stop.name);

              return (
                <Marker
                  key={stop.id}
                  position={[stop.lat, stop.lng]}
                  icon={createStopIcon(isHighlighted)}
                >
                  <Popup minWidth={180}>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 inline-block shrink-0" />
                        <span className="font-bold text-slate-900">{stop.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Transit Hub
                      </span>
                      {stop.arrival && (
                        <div className="pt-1 space-y-1 text-xs text-slate-600">
                          <div className="flex justify-between">
                            <span>Arrival:</span>
                            <span className="font-semibold text-slate-800">{stop.arrival}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Departure:</span>
                            <span className="font-semibold text-slate-800">{stop.departure}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Next Bus:</span>
                            <span className="font-semibold text-emerald-700">{stop.nextBus}</span>
                          </div>
                        </div>
                      )}
                      <div className="pt-1 border-t border-slate-100">
                        <div className="text-[10px] text-slate-500 mb-1">Routes:</div>
                        <div className="flex flex-wrap gap-1">
                          {stop.routeNumbers.map(rn => (
                            <span
                              key={rn}
                              className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
                            >
                              {rn}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

          {/* ── Depot Markers ────────────────────────────────────────────── */}
          {showDepots &&
            initialDepots.map(depot => (
              <Marker
                key={depot.id}
                position={[depot.position.lat, depot.position.lng]}
                icon={createDepotIcon()}
              >
                <Popup minWidth={200}>
                  <div className="space-y-1.5">
                    <div className="font-bold text-slate-900">{depot.name}</div>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                      Bus Depot
                    </span>
                    <div className="pt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                      <div className="col-span-2">
                        Manager:{' '}
                        <span className="font-semibold text-slate-800">{depot.managerName}</span>
                      </div>
                      <div>
                        Fleet:{' '}
                        <span className="font-semibold text-slate-800">{depot.busCount}</span>
                      </div>
                      <div>
                        Drivers:{' '}
                        <span className="font-semibold text-emerald-700">{depot.availableDrivers} avail.</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 pt-0.5 border-t border-slate-100">
                      {depot.address}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* ── Live Bus Markers ─────────────────────────────────────────── */}
          {showBuses &&
            filteredBusLocations.map(location => {
              const bus = buses.find(b => b.id === location.busId);
              const driver = drivers.find(d => d.id === location.driverId);
              const route = routes.find(r => r.id === location.routeId);
              if (!bus || !route) return null;

              const color = getServiceColor(route.serviceType);
              const icon = createPulsingBusIcon(color, bus.registrationNo);
              const fuelColor =
                location.fuelLevel > 50
                  ? '#10b981'
                  : location.fuelLevel > 25
                  ? '#f59e0b'
                  : '#ef4444';

              return (
                <Marker
                  key={location.id}
                  position={[location.position.lat, location.position.lng]}
                  icon={icon}
                  zIndexOffset={1000}
                >
                  <Popup minWidth={230} maxWidth={280}>
                    <div className="space-y-2">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {bus.registrationNo}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {bus.model} · {bus.manufacturer}
                          </div>
                        </div>
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                          style={{ background: color }}
                        >
                          {location.status}
                        </span>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600 border-t border-b border-slate-100 py-1.5">
                        <div>
                          Driver:{' '}
                          <span className="font-semibold text-slate-800">
                            {driver?.name ?? 'N/A'}
                          </span>
                        </div>
                        <div>
                          Phone:{' '}
                          <span className="font-semibold text-slate-800">
                            {driver?.contact ?? 'N/A'}
                          </span>
                        </div>
                        <div>
                          Speed:{' '}
                          <span className="font-semibold text-emerald-700">
                            {location.speed} km/h
                          </span>
                        </div>
                        <div>
                          ETA:{' '}
                          <span className="font-semibold text-slate-800">
                            {location.eta}
                          </span>
                        </div>
                        <div>
                          Current:{' '}
                          <span className="font-semibold text-slate-800">
                            {location.currentStop}
                          </span>
                        </div>
                        <div>
                          Next Stop:{' '}
                          <span className="font-semibold text-slate-800">
                            {location.nextStop}
                          </span>
                        </div>
                        <div>
                          Remaining:{' '}
                          <span className="font-semibold text-slate-800">
                            {location.remainingDistanceKm} km
                          </span>
                        </div>
                        <div>
                          Route:{' '}
                          <span className="font-bold font-mono text-slate-900">
                            {route.routeNumber}
                          </span>
                        </div>
                      </div>

                      {/* Fuel bar */}
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span className="flex items-center gap-1">
                            <Fuel className="w-3 h-3" /> Fuel Level
                          </span>
                          <span className="font-bold" style={{ color: fuelColor }}>
                            {Math.round(location.fuelLevel)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${location.fuelLevel}%`,
                              background: fuelColor,
                            }}
                          />
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="text-[9px] text-slate-400 flex items-center gap-1">
                        <Signal className="w-2.5 h-2.5" />
                        Last ping:{' '}
                        {new Date(location.lastUpdated).toLocaleTimeString()}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
        </MapContainer>

        {/* ── OSRM loading indicator ────────────────────────────────────── */}
        {loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100] bg-slate-900/95 backdrop-blur-sm text-white text-xs px-4 py-2 rounded-xl flex items-center gap-2 border border-slate-700 shadow-xl">
            <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />
            Fetching road geometries from OSRM…
          </div>
        )}

        {/* ── OSRM error banner ────────────────────────────────────────── */}
        {error && !loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1100] bg-amber-900/90 backdrop-blur-sm text-amber-200 text-xs px-4 py-2 rounded-xl flex items-center gap-2 border border-amber-700 shadow-xl max-w-sm text-center">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error}
            <button
              onClick={reload}
              className="ml-1 underline hover:text-white transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Floating Sidebar ─────────────────────────────────────────── */}
        <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2 max-h-[calc(100%-1.5rem)] overflow-y-auto pr-1">

          {/* Search */}
          <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-2 shadow-xl">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <input
                type="text"
                placeholder="Search route, bus, city…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded-lg placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                style={{ minWidth: '185px' }}
              />
            </div>
          </div>

          {/* Layer toggles */}
          <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-3 shadow-xl">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <Layers className="w-3 h-3 text-emerald-400" />
              Map Layers
            </h4>
            <LayerToggle
              label="Route Corridors"
              value={showRoutes}
              onChange={() => setShowRoutes(p => !p)}
              dot="#10b981"
            />
            <LayerToggle
              label="Transit Stops"
              value={showStops}
              onChange={() => setShowStops(p => !p)}
              dot="#f59e0b"
            />
            <LayerToggle
              label="Bus Depots"
              value={showDepots}
              onChange={() => setShowDepots(p => !p)}
              dot="#10b981"
            />
            <LayerToggle
              label="Live Fleet"
              value={showBuses}
              onChange={() => setShowBuses(p => !p)}
              dot="#8b5cf6"
            />

            <div className="h-px bg-slate-700/60 my-2" />

            {/* Dark / Light map toggle */}
            <button
              onClick={() => setDarkMode(p => !p)}
              className="w-full flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:bg-slate-800/60 transition-all"
            >
              <span>{darkMode ? '🌙 Dark Map' : '☀️ Light Map'}</span>
              <span
                className={`w-8 h-4 rounded-full relative transition-colors ${
                  darkMode ? 'bg-emerald-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${
                    darkMode ? 'left-4' : 'left-0.5'
                  }`}
                />
              </span>
            </button>

            {/* Reload OSRM */}
            <button
              onClick={reload}
              disabled={loading}
              className="w-full flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:bg-slate-800/60 disabled:opacity-40 transition-all mt-1"
            >
              <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Reload Routes
            </button>
          </div>

          {/* Service filter */}
          <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-3 shadow-xl">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Service Filter
            </h4>
            <div className="flex flex-col gap-0.5">
              {(['All', 'Normal', 'Semi-Luxury', 'Luxury', 'Super-Luxury'] as const).map(
                type => {
                  const color =
                    type === 'All'
                      ? '#94a3b8'
                      : SERVICE_COLORS[type as Route['serviceType']];
                  const isActive = serviceFilter === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setServiceFilter(type)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg text-left transition-all flex items-center gap-2 ${
                        isActive
                          ? 'text-white font-semibold'
                          : 'text-slate-400 hover:bg-slate-800/60'
                      }`}
                      style={isActive ? { background: color + '30', borderLeft: `3px solid ${color}` } : {}}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: color }}
                      />
                      {type === 'All' ? 'All Services' : type}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-3 shadow-xl">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Legend
            </h4>
            <div className="space-y-1.5 text-[10px] text-slate-400">
              {(Object.entries(SERVICE_COLORS) as [Route['serviceType'], string][]).map(
                ([type, color]) => (
                  <div key={type} className="flex items-center gap-2">
                    <span
                      className="w-5 h-1.5 rounded-full block shrink-0"
                      style={{ background: color }}
                    />
                    <span>{type}</span>
                  </div>
                )
              )}
              <div className="h-px bg-slate-700/60 my-1" />
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 block shrink-0" />
                <span>Bus Stop</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-md bg-slate-900 border border-emerald-500 flex items-center justify-center shrink-0">
                  <BusIcon className="w-2 h-2 text-emerald-500" />
                </span>
                <span>Depot</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Live Info Panel ────────────────────────────────────────── */}
      <div className="shrink-0 bg-slate-900 border-t border-slate-800">
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              Live Fleet Dashboard
            </span>
          </div>
          <button
            onClick={() => setInfoPanelExpanded(p => !p)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            {infoPanelExpanded ? (
              <X className="w-3.5 h-3.5" />
            ) : (
              <Info className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {infoPanelExpanded && (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-5 gap-0 border-b border-slate-800">
              {[
                {
                  label: 'Active Buses',
                  value: activeBusCount,
                  icon: BusIcon,
                  color: '#10b981',
                },
                {
                  label: 'Avg Speed',
                  value: `${avgSpeed} km/h`,
                  icon: Gauge,
                  color: '#3b82f6',
                },
                {
                  label: 'Avg Delay',
                  value: `${avgDelayMinutes} min`,
                  icon: Clock,
                  color: avgDelayMinutes > 5 ? '#f59e0b' : '#10b981',
                },
                {
                  label: 'Fleet Util.',
                  value: `${fleetUtilization}%`,
                  icon: Activity,
                  color: '#8b5cf6',
                },
                {
                  label: 'Total Dist.',
                  value: `${totalRoutedDistanceKm} km`,
                  icon: Navigation,
                  color: '#f59e0b',
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="flex flex-col items-center justify-center py-3 px-2 border-r border-slate-800 last:border-r-0"
                >
                  <Icon className="w-4 h-4 mb-1" style={{ color }} />
                  <div
                    className="text-sm font-bold"
                    style={{ color }}
                  >
                    {value}
                  </div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-wider mt-0.5 text-center">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Live dispatch ticker */}
            <div className="max-h-[80px] overflow-y-auto">
              {filteredBusLocations.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-xs italic">
                  No active buses on selected routes.
                </div>
              ) : (
                filteredBusLocations.map(loc => {
                  const bus = buses.find(b => b.id === loc.busId);
                  const route = routes.find(r => r.id === loc.routeId);
                  if (!bus || !route) return null;
                  const color = getServiceColor(route.serviceType);

                  return (
                    <button
                      key={loc.id}
                      onClick={() => onSelectRoute?.(loc.routeId)}
                      className="w-full px-4 py-2 flex justify-between items-center text-xs hover:bg-slate-800/60 transition-colors border-b border-slate-800/60 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                          style={{ background: color }}
                        />
                        <span className="font-semibold text-slate-200">
                          Route {route.routeNumber}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {bus.registrationNo}
                        </span>
                        <span className="text-slate-500">
                          {loc.currentStop} → {loc.nextStop}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-slate-400 font-mono text-[10px] shrink-0">
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3 h-3" />
                          {loc.speed} km/h
                        </span>
                        <span className={`flex items-center gap-1 ${loc.status === 'Delayed' ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {loc.status === 'Delayed' ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          ETA {loc.eta}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
