import L from 'leaflet';
import { Route } from '../types';

// ─── Service-type colour palette (matches existing app theme) ─────────────────

export const SERVICE_COLORS: Record<Route['serviceType'], string> = {
  Normal: '#10b981',       // emerald-500
  'Semi-Luxury': '#3b82f6', // blue-500
  Luxury: '#f59e0b',       // amber-500
  'Super-Luxury': '#8b5cf6', // violet-500
};

export const STATUS_COLORS: Record<string, string> = {
  Moving: '#10b981',
  Stopped: '#64748b',
  Delayed: '#f59e0b',
  'Off Duty': '#ef4444',
};

export function getServiceColor(serviceType: Route['serviceType']): string {
  return SERVICE_COLORS[serviceType] ?? '#10b981';
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#64748b';
}

// ─── Custom Leaflet DivIcons ──────────────────────────────────────────────────

/**
 * Animated, pulsing bus marker with registration number label.
 * Uses pure HTML/CSS — no image assets required.
 */
export function createPulsingBusIcon(color: string, regNo: string): L.DivIcon {
  const label = regNo
    .replace(/^[A-Z]{2}\s/, '')   // strip province prefix
    .substring(0, 7);              // max 7 chars

  return L.divIcon({
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -28],
    html: `
      <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
        <!-- Animated ping ring -->
        <div style="
          position:absolute;inset:0;border-radius:50%;
          background:${color}25;
          animation:lbsPing 1.8s cubic-bezier(0,0,0.2,1) infinite;
        "></div>
        <!-- Outer glow ring -->
        <div style="
          position:absolute;width:40px;height:40px;border-radius:50%;
          background:${color}15;border:1.5px solid ${color}60;
        "></div>
        <!-- Main circle -->
        <div style="
          position:relative;z-index:1;
          width:32px;height:32px;border-radius:50%;
          background:${color};border:2.5px solid #0f172a;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 3px 10px ${color}60,0 0 0 1.5px ${color}40;
        ">
          <span style="
            font-size:7px;font-weight:800;color:#fff;
            font-family:ui-monospace,monospace;
            text-align:center;max-width:26px;
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
            letter-spacing:-0.5px;
          ">${label}</span>
        </div>
      </div>
      <style>
        @keyframes lbsPing {
          0%{transform:scale(0.8);opacity:0.8}
          70%{transform:scale(1.4);opacity:0}
          100%{transform:scale(1.4);opacity:0}
        }
      </style>
    `,
  });
}

/**
 * Small amber circle for bus stops / transit hubs.
 */
export function createStopIcon(isHighlighted = false): L.DivIcon {
  const size = isHighlighted ? 16 : 12;
  const border = isHighlighted ? '#fff' : '#0f172a';
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 2],
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:#f59e0b;border:2px solid ${border};
        box-shadow:0 2px 8px rgba(0,0,0,0.35);
      "></div>
    `,
  });
}

/**
 * Dark square with a bus SVG icon for depot markers.
 */
export function createDepotIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
    html: `
      <div style="
        width:32px;height:32px;border-radius:8px;
        background:#0f172a;border:2px solid #10b981;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 12px rgba(16,185,129,0.25),0 2px 6px rgba(0,0,0,0.4);
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="2"/>
          <path d="M16 8h4l3 4v4h-7V8z"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      </div>
    `,
  });
}
