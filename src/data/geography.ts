/**
 * Static geographic reference data used purely for map rendering (city
 * coordinate lookups, depot markers, bus-stop markers). This is NOT
 * application/business data — it never changes at runtime and isn't backed
 * by a CRUD screen, so it stays as a frontend constant rather than a
 * database table (unlike routes/buses/drivers/schedules/etc., which now
 * come from the PostgreSQL-backed API — see src/services/api.ts).
 *
 * If you later want depots/bus-stops to be admin-editable, the backend
 * already has /api/depots and /api/bus-stops endpoints ready to use
 * (see server/routes/depots.routes.js and busstops.routes.js) —
 * just swap these constants for a fetch via depotsApi/busStopsApi.
 */
import { Depot, BusStop } from '../types';

export const CITIES_GEOGRAPHY: Record<string, { lat: number; lng: number }> = {
  "Colombo": { lat: 6.9271, lng: 79.8612 },
  "Kandy": { lat: 7.2906, lng: 80.6337 },
  "Galle": { lat: 6.0535, lng: 80.2111 },
  "Matara": { lat: 5.9549, lng: 80.5550 },
  "Jaffna": { lat: 9.6615, lng: 80.0255 },
  "Anuradhapura": { lat: 8.3114, lng: 80.4037 },
  "Trincomalee": { lat: 8.5873, lng: 81.2152 },
  "Vavuniya": { lat: 8.7542, lng: 80.4982 },
  "Kilinochchi": { lat: 9.3803, lng: 80.3982 },
  "Kurunegala": { lat: 7.4863, lng: 80.3647 },
  "Batticaloa": { lat: 7.7170, lng: 81.7010 },
  "Tangalle": { lat: 6.0243, lng: 80.7937 },
  "Kegalle": { lat: 7.2513, lng: 80.3464 },
  "Dambulla": { lat: 7.8742, lng: 80.6511 },
  "Habarana": { lat: 8.0357, lng: 80.7512 },
  "Kadawatha": { lat: 7.0012, lng: 79.9545 },
  "Nittambuwa": { lat: 7.1420, lng: 80.1110 },
  "Warakapola": { lat: 7.2235, lng: 80.1970 },
  "Kottawa": { lat: 6.8415, lng: 79.9654 },
  "Welipenna": { lat: 6.4250, lng: 80.0512 },
  "Pettah": { lat: 6.9360, lng: 79.8510 },
  "Borella": { lat: 6.9142, lng: 79.8785 },
  "Nugegoda": { lat: 6.8745, lng: 79.8974 },
  "Maharagama": { lat: 6.8485, lng: 79.9265 },
  "Town Hall": { lat: 6.9182, lng: 79.8633 }
};

export const initialDepots: Depot[] = [
  {
    id: 'DEP-01',
    name: 'Colombo Central Depot',
    position: { lat: 6.9215, lng: 79.8633 },
    managerName: 'Sunil Rajapakse',
    busCount: 6,
    availableDrivers: 4,
    address: 'Manning Place, Colombo 07'
  },
  {
    id: 'DEP-02',
    name: 'Kandy Hill-Country Depot',
    position: { lat: 7.2952, lng: 80.6350 },
    managerName: 'Pradeep Bandara',
    busCount: 3,
    availableDrivers: 5,
    address: 'Peradeniya Road, Kandy'
  },
  {
    id: 'DEP-03',
    name: 'Galle Southern Depot',
    position: { lat: 6.0510, lng: 80.2160 },
    managerName: 'Tharaka Wickramasinghe',
    busCount: 2,
    availableDrivers: 3,
    address: 'Galle Harbour, Galle'
  },
  {
    id: 'DEP-04',
    name: 'Jaffna Northern Depot',
    position: { lat: 9.6680, lng: 80.0085 },
    managerName: 'Arumugam Thangarajah',
    busCount: 2,
    availableDrivers: 4,
    address: 'KKS Road, Jaffna'
  }
];

export const initialBusStops: BusStop[] = [
  {
    id: 'BS-01',
    name: 'Colombo Fort',
    position: { lat: 6.9271, lng: 79.8612 },
    arrivalTime: '06:00',
    departureTime: '06:05',
    nextBusEta: '06:30',
    routeNumbers: ['01', 'EX-01', '87', '32', '49']
  },
  {
    id: 'BS-02',
    name: 'Kandy Clock Tower',
    position: { lat: 7.2906, lng: 80.6337 },
    arrivalTime: '09:00',
    departureTime: '09:10',
    nextBusEta: '11:00',
    routeNumbers: ['01']
  },
  {
    id: 'BS-03',
    name: 'Galle Bus Stand',
    position: { lat: 6.0535, lng: 80.2111 },
    arrivalTime: '10:00',
    departureTime: '10:15',
    nextBusEta: '12:00',
    routeNumbers: ['EX-01', '32']
  },
  {
    id: 'BS-04',
    name: 'Jaffna Central',
    position: { lat: 9.6615, lng: 80.0255 },
    arrivalTime: '21:00',
    departureTime: '21:30',
    nextBusEta: 'Next Day',
    routeNumbers: ['87']
  },
  {
    id: 'BS-05',
    name: 'Kurunegala Stand',
    position: { lat: 7.4863, lng: 80.3647 },
    arrivalTime: '08:00',
    departureTime: '08:15',
    nextBusEta: '10:00',
    routeNumbers: ['87', '49']
  },
  {
    id: 'BS-06',
    name: 'Anuradhapura Rest House',
    position: { lat: 8.3114, lng: 80.4037 },
    arrivalTime: '11:00',
    departureTime: '11:20',
    nextBusEta: '14:00',
    routeNumbers: ['87']
  },
  {
    id: 'BS-07',
    name: 'Matara Town',
    position: { lat: 5.9549, lng: 80.5550 },
    arrivalTime: '14:00',
    departureTime: '14:30',
    nextBusEta: '16:00',
    routeNumbers: ['32']
  },
  {
    id: 'BS-08',
    name: 'Trincomalee Bus Stand',
    position: { lat: 8.5873, lng: 81.2152 },
    arrivalTime: '10:30',
    departureTime: '11:00',
    nextBusEta: '15:00',
    routeNumbers: ['49']
  },
  {
    id: 'BS-09',
    name: 'Pettah Bus Hub',
    position: { lat: 6.9360, lng: 79.8510 },
    arrivalTime: '08:00',
    departureTime: '08:05',
    nextBusEta: '08:30',
    routeNumbers: ['138']
  },
  {
    id: 'BS-10',
    name: 'Maharagama Terminal',
    position: { lat: 6.8485, lng: 79.9265 },
    arrivalTime: '09:00',
    departureTime: '09:10',
    nextBusEta: '09:30',
    routeNumbers: ['138']
  }
];
