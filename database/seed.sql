-- =============================================================================
-- SRMSS seed data — carried over from src/data/mockData.ts so you start with
-- the same demo dataset the UI used to ship with. Safe to skip in real
-- production (just run schema.sql alone) or edit freely before loading.
-- Load order matters because of foreign keys: depots -> buses -> drivers ->
-- routes -> (driver.assigned_route_id backfill) -> schedules -> logs.
-- =============================================================================

BEGIN;

-- ─── Users (demo accounts — same credentials the old mock authService used) ─
-- Passwords below are hashed with Node's built-in crypto.scrypt (see
-- server/utils/password.js) — format scrypt:<saltHex>:<hashHex>.
--   admin    / Admin@123
--   manager  / Manager@123
--   operator / Operator@123
INSERT INTO users (id, username, password_hash, display_name, role, depot) VALUES
('usr-001', 'admin',    'scrypt:9f51ac327ccfa8827d60420434fd8378:a2c2df901e919e4105ab1b49c328305eda0bb5248c935ff5fae27852dc6b110c795b479a065f55c367bbc2dc444b5d6ffb9a02224fea6df687e983fb9b675486', 'System Administrator', 'Administrator', 'Head Office'),
('usr-002', 'manager',  'scrypt:322b63963d09e21807eb34252f1717bc:8e959737edf6e66808072f9af0bfdff3c904741b3e4d19ef7245d83d12730d6f7f8bc0dc8e014076eeda1272d5e56afc95e72f5002ed4a1162ddd02a42669026', 'Depot Manager',        'Depot Manager', 'Colombo Central Depot'),
('usr-003', 'operator', 'scrypt:9725de30d99cde41fd6e529ee0fd2afb:8ae4a25df4e2bf8332445ada3c69ae7670f2e38c1145c2f702088306803e6d6e0b3310da2b861bbaa0440f2f99b1855553c7684e9f07d7024ef7c8e69676a20b', 'Field Operator',       'Operator',      'Colombo Central Depot');

-- ─── Depots ──────────────────────────────────────────────────────────────────
INSERT INTO depots (id, name, lat, lng, manager_name, bus_count, available_drivers, address) VALUES
('DEP-01', 'Colombo Central Depot',   6.9215, 79.8633, 'Sunil Rajapakse',        6, 4, 'Manning Place, Colombo 07'),
('DEP-02', 'Kandy Hill-Country Depot',7.2952, 80.6350, 'Pradeep Bandara',        3, 5, 'Peradeniya Road, Kandy'),
('DEP-03', 'Galle Southern Depot',    6.0510, 80.2160, 'Tharaka Wickramasinghe', 2, 3, 'Galle Harbour, Galle'),
('DEP-04', 'Jaffna Northern Depot',   9.6680, 80.0085, 'Arumugam Thangarajah',   2, 4, 'KKS Road, Jaffna');

-- ─── Buses ───────────────────────────────────────────────────────────────────
INSERT INTO buses (id, registration_no, model, manufacturer, capacity, fuel_type, current_mileage_km, status, fitness_certificate_expiry, insurance_expiry, assigned_depot) VALUES
('B-01', 'WP ND-4567', 'Viking 54S',        'Ashok Leyland', 54, 'Diesel',   342150, 'Available',         '2027-04-15', '2027-02-10', 'Colombo Central Depot'),
('B-02', 'WP ND-7890', 'Journey Midi',      'Isuzu',         42, 'Diesel',   184560, 'On Route',          '2026-12-15', '2027-01-20', 'Colombo Central Depot'),
('B-03', 'CP NA-1122', 'B11R 9700',         'Volvo',         45, 'Diesel',    95400, 'Available',         '2027-05-01', '2027-04-30', 'Colombo Central Depot'),
('B-04', 'SP NB-3344', 'Falcon Bus',        'Ashok Leyland', 48, 'Diesel',   310890, 'Under Maintenance', '2026-08-10', '2026-09-05', 'Colombo Central Depot'),
('B-05', 'WP NE-5566', 'Smart-Express EV',  'King Long',     40, 'Electric',  42100, 'Available',         '2027-09-18', '2027-08-22', 'Colombo Central Depot'),
('B-06', 'WP ND-8899', 'Viking Intercity',  'Ashok Leyland', 54, 'Diesel',   425120, 'On Route',          '2026-11-20', '2026-11-15', 'Colombo Central Depot');

-- ─── Drivers (assigned_route_id filled in after routes insert) ─────────────
INSERT INTO drivers (id, employee_id, name, contact, license_no, license_expiry, status, employment_status, total_hours_logged, performance_rating) VALUES
('D-01', 'EMP-101', 'Priyantha Perera',      '+94 77 123 4567', 'SL-DL-987123', '2027-09-12', 'Available', 'Permanent', 1420, 4.8),
('D-02', 'EMP-102', 'Ruwan Fernando',        '+94 71 456 7890', 'SL-DL-342111', '2026-10-05', 'On Duty',   'Permanent', 2150, 4.5),
('D-03', 'EMP-103', 'Sunil Silva',           '+94 72 789 1234', 'SL-DL-567843', '2027-05-18', 'On Duty',   'Permanent', 3410, 4.2),
('D-04', 'EMP-104', 'Kutila Jayawardene',    '+94 75 321 6549', 'SL-DL-889912', '2026-08-22', 'On Leave',  'Contract',   820, 4.9),
('D-05', 'EMP-105', 'Mohamed Naushad',       '+94 77 987 6543', 'SL-DL-110022', '2027-12-14', 'Available', 'Permanent', 1980, 4.6),
('D-06', 'EMP-106', 'Arumugam Thangarajah',  '+94 78 555 4321', 'SL-DL-445566', '2027-01-30', 'Available', 'Contract',  1100, 4.7);

-- ─── Routes ──────────────────────────────────────────────────────────────────
INSERT INTO routes (id, route_number, start_location, end_location, stops, distance_km, service_type, estimated_duration_minutes, assigned_bus_id, assigned_driver_id, is_active) VALUES
('R-01', '01',    'Colombo', 'Kandy',       ARRAY['Colombo','Kadawatha','Warakapola','Kegalle','Kandy'],                       115, 'Semi-Luxury',   180, 'B-02', 'D-02', true),
('R-02', 'EX-01', 'Colombo', 'Galle',       ARRAY['Colombo','Kottawa','Welipenna','Galle'],                                    125, 'Luxury',        120, 'B-03', 'D-03', true),
('R-03', '87',    'Colombo', 'Jaffna',      ARRAY['Colombo','Kurunegala','Anuradhapura','Vavuniya','Kilinochchi','Jaffna'],    390, 'Super-Luxury',  480, 'B-05', 'D-01', true),
('R-04', '138',   'Pettah',  'Maharagama',  ARRAY['Pettah','Town Hall','Borella','Nugegoda','Maharagama'],                     15,  'Normal',        45,  'B-01', 'D-05', true),
('R-05', '49',    'Colombo', 'Trincomalee', ARRAY['Colombo','Kurunegala','Dambulla','Habarana','Trincomalee'],                 260, 'Luxury',        330, 'B-06', 'D-06', true),
('R-06', '32',    'Colombo', 'Matara',      ARRAY['Colombo','Galle','Matara'],                                                 160, 'Normal',        240, 'B-04', 'D-04', false);

-- Backfill each driver's currently assigned route (mirrors the mock data intent)
UPDATE drivers SET assigned_route_id = 'R-03' WHERE id = 'D-01';
UPDATE drivers SET assigned_route_id = 'R-01' WHERE id = 'D-02';
UPDATE drivers SET assigned_route_id = 'R-02' WHERE id = 'D-03';
UPDATE drivers SET assigned_route_id = 'R-06' WHERE id = 'D-04';
UPDATE drivers SET assigned_route_id = 'R-04' WHERE id = 'D-05';
UPDATE drivers SET assigned_route_id = 'R-05' WHERE id = 'D-06';

-- ─── Schedules ───────────────────────────────────────────────────────────────
INSERT INTO schedules (id, route_id, bus_id, driver_id, date, departure_time, arrival_time, status, delay_minutes, notes) VALUES
('S-101', 'R-01', 'B-02', 'D-02', '2026-07-01', '06:30', '09:30', 'Active',    10, 'Traffic delays at Kegalle road construction'),
('S-102', 'R-02', 'B-03', 'D-03', '2026-07-01', '08:00', '10:00', 'Scheduled',  0, NULL),
('S-103', 'R-04', 'B-01', 'D-05', '2026-07-01', '08:15', '09:00', 'Active',     0, 'On schedule'),
('S-104', 'R-05', 'B-06', 'D-06', '2026-07-01', '05:00', '10:30', 'Active',    15, 'Delayed depart due to passenger boarding'),
('S-105', 'R-01', 'B-02', 'D-02', '2026-06-30', '14:30', '17:35', 'Completed',  5, NULL),
('S-106', 'R-02', 'B-03', 'D-03', '2026-06-30', '10:00', '12:00', 'Completed',  0, NULL),
('S-107', 'R-03', 'B-05', 'D-01', '2026-07-01', '13:00', '21:00', 'Scheduled',  0, 'Overnight long trip');

-- ─── Maintenance logs ────────────────────────────────────────────────────────
INSERT INTO maintenance_logs (id, bus_id, type, description, cost, date, mileage_at_service, next_service_date) VALUES
('M-301', 'B-01', 'Preventive', 'Engine oil, oil filter, air filter replacement & brake pad inspection',           24500, '2026-06-15', 341200, '2026-09-15'),
('M-302', 'B-02', 'Corrective', 'Alternator belt snap replacement and battery health checkup',                     18900, '2026-05-20', 181200, '2026-11-20'),
('M-303', 'B-04', 'Preventive', 'Major overhaul: Suspension spring leaf adjustment, transmission fluid flush & full lube service', 76000, '2026-06-25', 310890, '2026-12-25');

-- ─── Fuel logs ───────────────────────────────────────────────────────────────
INSERT INTO fuel_logs (id, bus_id, driver_id, liters, cost, mileage_at_fill, efficiency_kmpl, date) VALUES
('F-501', 'B-01', 'D-05', 85,  29155, 341850, 3.8, '2026-06-29'),
('F-502', 'B-02', 'D-02', 60,  20580, 184200, 5.2, '2026-06-30'),
('F-503', 'B-03', 'D-03', 110, 37730,  95000, 4.1, '2026-06-30'),
('F-504', 'B-06', 'D-06', 95,  32585, 424850, 3.5, '2026-06-28');

-- ─── Audit logs ──────────────────────────────────────────────────────────────
INSERT INTO audit_logs (id, action, category, timestamp, user_name, details) VALUES
('A-001', 'System Initialized', 'System', '2026-07-01 08:00:00', 'System Administrator',       'Loaded Sri Lanka Transport Depot default datasets (Colombo Central Depot)'),
('A-002', 'Route Activated',    'Route',  '2026-07-01 08:15:20', 'Sunil Rajapakse (Supervisor)','Activated Express Route EX-01 (Colombo - Galle)');

-- ─── Bus stops ───────────────────────────────────────────────────────────────
INSERT INTO bus_stops (id, name, lat, lng, arrival_time, departure_time, next_bus_eta, route_numbers) VALUES
('BS-01', 'Colombo Fort',           6.9271, 79.8612, '06:00', '06:05', '06:30',    ARRAY['01','EX-01','87','32','49']),
('BS-02', 'Kandy Clock Tower',      7.2906, 80.6337, '09:00', '09:10', '11:00',    ARRAY['01']),
('BS-03', 'Galle Bus Stand',        6.0535, 80.2111, '10:00', '10:15', '12:00',    ARRAY['EX-01','32']),
('BS-04', 'Jaffna Central',         9.6615, 80.0255, '21:00', '21:30', 'Next Day', ARRAY['87']),
('BS-05', 'Kurunegala Stand',       7.4863, 80.3647, '08:00', '08:15', '10:00',    ARRAY['87','49']),
('BS-06', 'Anuradhapura Rest House',8.3114, 80.4037, '11:00', '11:20', '14:00',    ARRAY['87']),
('BS-07', 'Matara Town',            5.9549, 80.5550, '14:00', '14:30', '16:00',    ARRAY['32']),
('BS-08', 'Trincomalee Bus Stand',  8.5873, 81.2152, '10:30', '11:00', '15:00',    ARRAY['49']),
('BS-09', 'Pettah Bus Hub',         6.9360, 79.8510, '08:00', '08:05', '08:30',    ARRAY['138']),
('BS-10', 'Maharagama Terminal',    6.8485, 79.9265, '09:00', '09:10', '09:30',    ARRAY['138']);

COMMIT;
