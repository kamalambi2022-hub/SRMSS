import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Bus as BusIcon, Info, Layers, Eye, EyeOff } from 'lucide-react';
import { Route, Bus, Schedule } from '../types';
import { CITIES_GEOGRAPHY } from '../data/geography';

// SVG canvas dimensions
const WIDTH = 340;
const HEIGHT = 500;

// Conversion function: Lat/Lng to SVG X/Y coordinates
export function getCoordinates(lat: number, lng: number) {
  // Sri Lanka bounds
  const minLng = 79.5;
  const maxLng = 81.9;
  const minLat = 5.9;
  const maxLat = 9.9;

  const x = ((lng - minLng) / (maxLng - minLng)) * WIDTH;
  // Lat is inverted since Y-axis starts from top in SVG
  const y = (1 - ((lat - minLat) / (maxLat - minLat))) * HEIGHT;

  return { x, y };
}

interface RouteMapProps {
  routes: Route[];
  buses: Bus[];
  schedules: Schedule[];
  selectedRouteId?: string | null;
  onSelectRoute?: (routeId: string | null) => void;
}

export default function RouteMap({
  routes,
  buses,
  schedules,
  selectedRouteId = null,
  onSelectRoute
}: RouteMapProps) {
  const [showStops, setShowStops] = useState(true);
  const [showAllRoutes, setShowAllRoutes] = useState(true);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [hoveredBus, setHoveredBus] = useState<string | null>(null);
  
  // Simulated animation factor (0 to 1) for bus positions
  const [animationTicks, setAnimationTicks] = useState<Record<string, number>>({});

  useEffect(() => {
    // Generate separate offsets/ticks for active schedules to make them move independently
    const activeSchedules = schedules.filter(s => s.status === 'Active');
    const initialTicks: Record<string, number> = {};
    activeSchedules.forEach(s => {
      // Seed with random progress between 0.1 and 0.9 to look realistic on mount
      initialTicks[s.id] = Math.random() * 0.8 + 0.1;
    });
    setAnimationTicks(initialTicks);

    const interval = setInterval(() => {
      setAnimationTicks(prev => {
        const next = { ...prev };
        activeSchedules.forEach(s => {
          // Slowly move bus forward, wrapping around when it reaches destination
          const speed = 0.015 + (Math.random() * 0.01); // randomized speed per bus tick
          const current = prev[s.id] || 0.1;
          const updated = current + speed;
          next[s.id] = updated > 0.95 ? 0.05 : updated;
        });
        return next;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [schedules]);

  // Determine path coordinates for a route
  const getRoutePathPoints = (route: Route) => {
    return route.stops.map(stopName => {
      const geo = CITIES_GEOGRAPHY[stopName] || { lat: 6.9, lng: 79.9 };
      return getCoordinates(geo.lat, geo.lng);
    });
  };

  const getSVGPathD = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  };

  // Interpolate coordinate along polyline points for animated bus position
  const interpolatePosition = (points: { x: number; y: number }[], progress: number) => {
    if (points.length < 2) return { x: 0, y: 0, angle: 0 };
    
    // total number of segments
    const numSegments = points.length - 1;
    const segmentWeight = 1 / numSegments;
    
    const segmentIndex = Math.min(Math.floor(progress / segmentWeight), numSegments - 1);
    const segmentProgress = (progress - segmentIndex * segmentWeight) / segmentWeight;
    
    const start = points[segmentIndex];
    const end = points[segmentIndex + 1];
    
    const x = start.x + (end.x - start.x) * segmentProgress;
    const y = start.y + (end.y - start.y) * segmentProgress;
    
    // angle for bus icon heading
    const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
    
    return { x, y, angle };
  };

  const serviceTypeColors: Record<Route['serviceType'], { line: string; bg: string; text: string }> = {
    'Normal': { line: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-500' }, // Emerald
    'Semi-Luxury': { line: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-500' }, // Blue
    'Luxury': { line: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-500' }, // Amber
    'Super-Luxury': { line: '#8b5cf6', bg: 'bg-violet-500', text: 'text-violet-500' } // Violet
  };

  const activeSchedulesList = schedules.filter(s => s.status === 'Active');

  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-hidden shadow-2xl h-full flex flex-col min-h-[500px]" id="srmss-map-container">
      {/* Map Control Overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-slate-950/90 backdrop-blur border border-slate-800 rounded-xl p-3 flex flex-col gap-2 shadow-lg max-w-[200px]">
          <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-sans">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Map Overlays
          </h4>
          <div className="h-[1px] bg-slate-800 my-1"></div>
          
          <button
            onClick={() => setShowAllRoutes(prev => !prev)}
            className={`flex items-center justify-between text-left text-xs px-2 py-1 rounded transition-colors ${showAllRoutes ? 'text-emerald-400 bg-emerald-950/20' : 'text-slate-400 hover:text-slate-300'}`}
          >
            <span className="flex items-center gap-1.5">
              {showAllRoutes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              Route Corridors
            </span>
          </button>

          <button
            onClick={() => setShowStops(prev => !prev)}
            className={`flex items-center justify-between text-left text-xs px-2 py-1 rounded transition-colors ${showStops ? 'text-emerald-400 bg-emerald-950/20' : 'text-slate-400 hover:text-slate-300'}`}
          >
            <span className="flex items-center gap-1.5">
              {showStops ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              Transit Hubs
            </span>
          </button>
        </div>

        {/* Legend */}
        <div className="bg-slate-950/90 backdrop-blur border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5 shadow-lg text-[10px] text-slate-400 max-w-[200px]">
          <span className="font-semibold text-slate-300 text-xs mb-1">Service Levels</span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-0.5 bg-emerald-500 rounded-full"></span>
            <span>Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-0.5 bg-blue-500 rounded-full"></span>
            <span>Semi-Luxury</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-0.5 bg-amber-500 rounded-full"></span>
            <span>Express / Luxury</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-0.5 bg-violet-500 rounded-full"></span>
            <span>Super-Luxury</span>
          </div>
          <div className="flex items-center gap-2 mt-1 pt-1 border-t border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full border border-emerald-400 bg-emerald-500/20 animate-pulse"></span>
            <span className="text-slate-300">Live Depot Bus</span>
          </div>
        </div>
      </div>

      {/* Main Map Presentation */}
      <div className="flex-1 flex items-center justify-center relative min-h-[380px]">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full max-w-[340px] h-auto max-h-[460px] select-none"
        >
          {/* Background Sri Lanka Geoid */}
          <g className="text-slate-800/40">
            <path
              d="M 120 20 C 130 15, 140 18, 145 28 C 146 32, 144 38, 148 45 C 153 52, 160 58, 165 70 C 172 88, 185 110, 195 130 C 210 160, 230 185, 245 210 C 265 240, 285 270, 298 290 C 310 305, 315 315, 312 322 C 308 330, 290 350, 275 375 C 255 405, 230 435, 205 455 C 185 470, 165 482, 148 488 C 138 493, 130 491, 122 485 C 105 472, 98 452, 98 432 C 98 412, 85 395, 70 380 C 58 368, 52 350, 55 330 C 58 310, 62 290, 68 260 C 74 220, 75 190, 80 160 C 85 130, 80 100, 75 80 C 70 60, 72 45, 88 35 C 98 28, 110 25, 120 20 Z"
              fill="#1e293b"
              fillOpacity="0.3"
              stroke="#334155"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              className="transition-all duration-700 hover:fill-slate-800/40"
            />
          </g>

          {/* Route Paths */}
          {showAllRoutes && routes.map(route => {
            const isSelected = selectedRouteId === route.id;
            const points = getRoutePathPoints(route);
            if (points.length < 2) return null;
            const pathD = getSVGPathD(points);
            const colors = serviceTypeColors[route.serviceType];
            
            return (
              <g key={route.id} className="cursor-pointer" onClick={() => onSelectRoute && onSelectRoute(isSelected ? null : route.id)}>
                {/* Backing hover path for hit area */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="12"
                />
                {/* Active Highlight Glow */}
                {isSelected && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={colors.line}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.3"
                    className="animate-pulse"
                  />
                )}
                {/* Solid Route Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={isSelected ? colors.line : `${colors.line}aa`}
                  strokeWidth={isSelected ? '2.5' : '1.5'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              </g>
            );
          })}

          {/* Individual Highlighted Selected Route Nodes */}
          {selectedRouteId && (() => {
            const selectedRoute = routes.find(r => r.id === selectedRouteId);
            if (!selectedRoute) return null;
            const points = getRoutePathPoints(selectedRoute);
            const colors = serviceTypeColors[selectedRoute.serviceType];
            return points.map((p, idx) => (
              <circle
                key={`sel-node-${idx}`}
                cx={p.x}
                cy={p.y}
                r="4"
                fill={colors.line}
                stroke="#0f172a"
                strokeWidth="1.5"
                className="animate-ping"
              />
            ));
          })()}

          {/* Interactive Hub Cities / Stops */}
          {showStops && Object.entries(CITIES_GEOGRAPHY).map(([name, geo]) => {
            const p = getCoordinates(geo.lat, geo.lng);
            const isHovered = hoveredCity === name;
            
            // Filter to see if this city is a start or end for any route
            const isMajorHub = routes.some(r => r.startLocation === name || r.endLocation === name);

            return (
              <g
                key={name}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredCity(name)}
                onMouseLeave={() => setHoveredCity(null)}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isMajorHub ? (isHovered ? "7" : "5") : (isHovered ? "5" : "3.5")}
                  fill={isMajorHub ? "#f59e0b" : "#334155"}
                  stroke={isHovered ? "#ffffff" : "#1e293b"}
                  strokeWidth="1.2"
                  className="transition-all duration-200"
                />
                {isHovered && (
                  <text
                    x={p.x + 8}
                    y={p.y + 4}
                    fill="#f8fafc"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    className="drop-shadow bg-slate-900 px-1 py-0.5 rounded"
                  >
                    {name}
                  </text>
                )}
              </g>
            );
          })}

          {/* Animated Moving Buses */}
          {activeSchedulesList.map(schedule => {
            const route = routes.find(r => r.id === schedule.routeId);
            const bus = buses.find(b => b.id === schedule.busId);
            if (!route || !bus) return null;

            const points = getRoutePathPoints(route);
            if (points.length < 2) return null;

            const progress = animationTicks[schedule.id] || 0.4;
            const { x, y, angle } = interpolatePosition(points, progress);
            const colors = serviceTypeColors[route.serviceType];
            const isHovered = hoveredBus === schedule.id;

            return (
              <g
                key={schedule.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredBus(schedule.id)}
                onMouseLeave={() => setHoveredBus(null)}
              >
                {/* Pulsing ring */}
                <circle
                  cx={x}
                  cy={y}
                  r="10"
                  fill="none"
                  stroke={colors.line}
                  strokeWidth="1"
                  className="animate-ping"
                  opacity="0.5"
                />
                
                {/* Vehicle Marker */}
                <circle
                  cx={x}
                  cy={y}
                  r="7.5"
                  fill={colors.line}
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />

                {/* Arrow indicator of movement heading */}
                <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
                  <polygon
                    points="4,0 -2,-3.5 -2,3.5"
                    fill="#0f172a"
                  />
                </g>

                {/* Mini Reg Tag popup */}
                {(isHovered || selectedRouteId === route.id) && (
                  <g transform={`translate(${x}, ${y - 12})`}>
                    <rect
                      x="-38"
                      y="-12"
                      width="76"
                      height="17"
                      rx="3"
                      fill="#0b1329"
                      stroke={colors.line}
                      strokeWidth="1"
                      className="drop-shadow"
                    />
                    <text
                      x="0"
                      y="0"
                      fill="#f8fafc"
                      fontSize="7"
                      fontWeight="600"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {bus.registrationNo}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Real-time Ticker / Operational Status Info Box */}
      <div className="mt-2 bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-sans">
          <Info className="w-4 h-4 text-emerald-400" />
          Active Depot Dispatch Tracker
        </h4>
        <div className="max-h-[90px] overflow-y-auto text-xs text-slate-400 divide-y divide-slate-800 pr-1">
          {activeSchedulesList.length === 0 ? (
            <div className="py-2 text-center text-slate-500 font-sans italic">No active bus services running right now.</div>
          ) : (
            activeSchedulesList.map(s => {
              const r = routes.find(rt => rt.id === s.routeId);
              const b = buses.find(bu => bu.id === s.busId);
              return (
                <div
                  key={s.id}
                  className="py-1.5 flex justify-between items-center cursor-pointer hover:bg-slate-900/50 px-1 rounded transition-colors"
                  onClick={() => onSelectRoute && onSelectRoute(r?.id || null)}
                >
                  <span className="font-semibold text-slate-200">
                    Route {r?.routeNumber} ({r?.startLocation} ➔ {r?.endLocation})
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/30">
                      {b?.registrationNo}
                    </span>
                    <span className="text-[10px] text-slate-500">{s.departureTime} departure</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
