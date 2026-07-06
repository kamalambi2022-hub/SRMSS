export interface Route {
  id: string;
  routeNumber: string;
  startLocation: string;
  endLocation: string;
  stops: string[];
  distanceKm: number;
  serviceType: 'Normal' | 'Semi-Luxury' | 'Luxury' | 'Super-Luxury';
  estimatedDurationMinutes: number;
  assignedBusId?: string;
  assignedDriverId?: string;
  isActive: boolean;
}

export interface Bus {
  id: string;
  registrationNo: string;
  model: string;
  manufacturer: string;
  capacity: number;
  fuelType: 'Diesel' | 'Petrol' | 'Electric' | 'Hybrid';
  currentMileageKm: number;
  status: 'Available' | 'On Route' | 'Under Maintenance' | 'Inactive';
  fitnessCertificateExpiry: string; // YYYY-MM-DD
  insuranceExpiry: string; // YYYY-MM-DD
  assignedDepot: string;
}

export interface Driver {
  id: string;
  employeeId: string;
  name: string;
  contact: string;
  licenseNo: string;
  licenseExpiry: string; // YYYY-MM-DD
  status: 'Available' | 'On Duty' | 'On Leave' | 'Suspended';
  employmentStatus: 'Permanent' | 'Contract';
  assignedRouteId?: string;
  totalHoursLogged: number;
  performanceRating: number; // 1-5
}

export interface Schedule {
  id: string;
  routeId: string;
  busId: string;
  driverId: string;
  date: string; // YYYY-MM-DD
  departureTime: string; // HH:MM
  arrivalTime: string; // HH:MM
  status: 'Scheduled' | 'Active' | 'Delayed' | 'Completed' | 'Cancelled';
  delayMinutes: number;
  notes?: string;
}

export interface MaintenanceLog {
  id: string;
  busId: string;
  type: 'Preventive' | 'Corrective';
  description: string;
  cost: number;
  date: string; // YYYY-MM-DD
  mileageAtService: number;
  nextServiceDate: string; // YYYY-MM-DD;
}

export interface FuelLog {
  id: string;
  busId: string;
  driverId: string;
  liters: number;
  cost: number;
  mileageAtFill: number;
  efficiencyKmpl: number;
  date: string; // YYYY-MM-DD
}

export interface AuditLog {
  id: string;
  action: string;
  category: 'Route' | 'Schedule' | 'Fleet' | 'Driver' | 'Maintenance' | 'Fuel' | 'System';
  timestamp: string;
  user: string;
  details: string;
}

export type UserRole = 'Admin' | 'Depot Supervisor' | 'Logistics Officer' | 'Operator';

// ─── GIS & Live Tracking Interfaces ─────────────────────────────────────────

export interface GPSLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

export interface BusLocation {
  /** Keyed by schedule ID */
  id: string;
  busId: string;
  routeId: string;
  driverId: string;
  position: GPSLocation;
  speed: number; // km/h
  heading: number; // degrees
  nextStop: string;
  currentStop: string;
  destination: string;
  eta: string; // HH:MM
  remainingDistanceKm: number;
  fuelLevel: number; // 0–100
  status: 'Moving' | 'Stopped' | 'Delayed' | 'Off Duty';
  lastUpdated: string; // ISO timestamp
  routeProgress: number; // 0–1
}

export interface Depot {
  id: string;
  name: string;
  position: GPSLocation;
  managerName: string;
  busCount: number;
  availableDrivers: number;
  address: string;
}

export interface BusStop {
  id: string;
  name: string;
  position: GPSLocation;
  arrivalTime?: string;
  departureTime?: string;
  nextBusEta?: string;
  routeNumbers: string[];
}

export interface RouteSegment {
  routeId: string;
  /** Array of [lat, lng] tuples from OSRM */
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

export interface TrackingHistory {
  busId: string;
  positions: Array<{
    position: GPSLocation;
    timestamp: string;
    speed: number;
  }>;
}

export interface DriverLocation {
  driverId: string;
  busId: string;
  position: GPSLocation;
  lastUpdated: string;
}

