-- =============================================================================
-- SRMSS (Smart Route Management & Scheduling System)
-- PostgreSQL production schema
--
-- Usage:
--   1) Create the database (run once, from psql connected to "postgres"):
--        CREATE DATABASE srmss;
--   2) Load this schema:
--        psql -U postgres -d srmss -f database/schema.sql
--   3) (Optional) Load starter data translated from the old mock dataset:
--        psql -U postgres -d srmss -f database/seed.sql
-- =============================================================================

-- Clean re-runs during development. Comment these out in real production use.
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS fuel_logs CASCADE;
DROP TABLE IF EXISTS maintenance_logs CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS bus_stops CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS buses CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS depots CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -----------------------------------------------------------------------------
-- users  (real authentication — replaces the old client-side DEMO_ACCOUNTS)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id             VARCHAR(20)  PRIMARY KEY,
  username       VARCHAR(50)  NOT NULL UNIQUE,
  password_hash  VARCHAR(200) NOT NULL, -- format: scrypt:<saltHex>:<hashHex>, see server/utils/password.js
  display_name   VARCHAR(150) NOT NULL,
  role           VARCHAR(30)  NOT NULL CHECK (role IN ('Administrator','Depot Manager','Operator')),
  depot          VARCHAR(150),
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- depots
-- -----------------------------------------------------------------------------
CREATE TABLE depots (
  id                 VARCHAR(20)  PRIMARY KEY,
  name               VARCHAR(150) NOT NULL UNIQUE,
  lat                DOUBLE PRECISION NOT NULL,
  lng                DOUBLE PRECISION NOT NULL,
  manager_name       VARCHAR(150),
  bus_count          INTEGER DEFAULT 0,
  available_drivers  INTEGER DEFAULT 0,
  address            VARCHAR(250),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- buses
-- -----------------------------------------------------------------------------
CREATE TABLE buses (
  id                          VARCHAR(20) PRIMARY KEY,
  registration_no             VARCHAR(30)  NOT NULL UNIQUE,
  model                       VARCHAR(100) NOT NULL,
  manufacturer                VARCHAR(100) NOT NULL,
  capacity                    INTEGER NOT NULL CHECK (capacity > 0),
  fuel_type                   VARCHAR(20) NOT NULL CHECK (fuel_type IN ('Diesel','Petrol','Electric','Hybrid')),
  current_mileage_km          NUMERIC(12,2) NOT NULL DEFAULT 0,
  status                      VARCHAR(30) NOT NULL CHECK (status IN ('Available','On Route','Under Maintenance','Inactive')),
  fitness_certificate_expiry  DATE NOT NULL,
  insurance_expiry            DATE NOT NULL,
  assigned_depot              VARCHAR(150) REFERENCES depots(name) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- drivers
-- -----------------------------------------------------------------------------
CREATE TABLE drivers (
  id                  VARCHAR(20) PRIMARY KEY,
  employee_id         VARCHAR(30)  NOT NULL UNIQUE,
  name                VARCHAR(150) NOT NULL,
  contact             VARCHAR(30),
  license_no          VARCHAR(40)  NOT NULL UNIQUE,
  license_expiry      DATE NOT NULL,
  status              VARCHAR(20) NOT NULL CHECK (status IN ('Available','On Duty','On Leave','Suspended')),
  employment_status   VARCHAR(20) NOT NULL CHECK (employment_status IN ('Permanent','Contract')),
  assigned_route_id   VARCHAR(20),  -- FK added after routes table exists (circular reference)
  total_hours_logged  NUMERIC(10,2) NOT NULL DEFAULT 0,
  performance_rating  NUMERIC(2,1) NOT NULL DEFAULT 0 CHECK (performance_rating BETWEEN 0 AND 5),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- routes  (references buses/drivers; drivers references routes -> circular FK)
-- -----------------------------------------------------------------------------
CREATE TABLE routes (
  id                            VARCHAR(20) PRIMARY KEY,
  route_number                  VARCHAR(20) NOT NULL,
  start_location                VARCHAR(100) NOT NULL,
  end_location                  VARCHAR(100) NOT NULL,
  stops                         TEXT[] NOT NULL DEFAULT '{}',
  distance_km                   NUMERIC(8,2) NOT NULL,
  service_type                  VARCHAR(20) NOT NULL CHECK (service_type IN ('Normal','Semi-Luxury','Luxury','Super-Luxury')),
  estimated_duration_minutes    INTEGER NOT NULL,
  assigned_bus_id                VARCHAR(20) REFERENCES buses(id) ON DELETE SET NULL,
  assigned_driver_id             VARCHAR(20) REFERENCES drivers(id) ON DELETE SET NULL,
  is_active                     BOOLEAN NOT NULL DEFAULT true,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE drivers
  ADD CONSTRAINT fk_drivers_assigned_route
  FOREIGN KEY (assigned_route_id) REFERENCES routes(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- schedules
-- -----------------------------------------------------------------------------
CREATE TABLE schedules (
  id               VARCHAR(20) PRIMARY KEY,
  route_id         VARCHAR(20) NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  bus_id           VARCHAR(20) NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  driver_id        VARCHAR(20) NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  departure_time   VARCHAR(5) NOT NULL, -- HH:MM
  arrival_time     VARCHAR(5) NOT NULL, -- HH:MM
  status           VARCHAR(20) NOT NULL CHECK (status IN ('Scheduled','Active','Delayed','Completed','Cancelled')),
  delay_minutes    INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- maintenance_logs
-- -----------------------------------------------------------------------------
CREATE TABLE maintenance_logs (
  id                   VARCHAR(20) PRIMARY KEY,
  bus_id               VARCHAR(20) NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  type                 VARCHAR(20) NOT NULL CHECK (type IN ('Preventive','Corrective')),
  description          TEXT NOT NULL,
  cost                 NUMERIC(12,2) NOT NULL,
  date                 DATE NOT NULL,
  mileage_at_service   NUMERIC(12,2) NOT NULL,
  next_service_date    DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- fuel_logs
-- -----------------------------------------------------------------------------
CREATE TABLE fuel_logs (
  id                 VARCHAR(20) PRIMARY KEY,
  bus_id             VARCHAR(20) NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  driver_id          VARCHAR(20) NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  liters             NUMERIC(8,2) NOT NULL,
  cost               NUMERIC(12,2) NOT NULL,
  mileage_at_fill    NUMERIC(12,2) NOT NULL,
  efficiency_kmpl    NUMERIC(6,2) NOT NULL,
  date               DATE NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- audit_logs
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id          VARCHAR(20) PRIMARY KEY,
  action      VARCHAR(150) NOT NULL,
  category    VARCHAR(20) NOT NULL CHECK (category IN ('Route','Schedule','Fleet','Driver','Maintenance','Fuel','System')),
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_name   VARCHAR(150) NOT NULL,
  details     TEXT
);

-- -----------------------------------------------------------------------------
-- bus_stops
-- -----------------------------------------------------------------------------
CREATE TABLE bus_stops (
  id              VARCHAR(20) PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  arrival_time    VARCHAR(10),
  departure_time  VARCHAR(10),
  next_bus_eta    VARCHAR(20),
  route_numbers   TEXT[] NOT NULL DEFAULT '{}'
);

-- -----------------------------------------------------------------------------
-- Helpful indexes
-- -----------------------------------------------------------------------------
CREATE INDEX idx_schedules_route_id  ON schedules(route_id);
CREATE INDEX idx_schedules_bus_id    ON schedules(bus_id);
CREATE INDEX idx_schedules_driver_id ON schedules(driver_id);
CREATE INDEX idx_schedules_date      ON schedules(date);
CREATE INDEX idx_maintenance_bus_id  ON maintenance_logs(bus_id);
CREATE INDEX idx_fuel_bus_id         ON fuel_logs(bus_id);
CREATE INDEX idx_audit_category      ON audit_logs(category);
CREATE INDEX idx_routes_bus_id       ON routes(assigned_bus_id);
CREATE INDEX idx_routes_driver_id    ON routes(assigned_driver_id);

-- -----------------------------------------------------------------------------
-- Generic "touch updated_at" trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_depots_updated_at      BEFORE UPDATE ON depots      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_buses_updated_at       BEFORE UPDATE ON buses       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_drivers_updated_at     BEFORE UPDATE ON drivers     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_routes_updated_at      BEFORE UPDATE ON routes      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_schedules_updated_at   BEFORE UPDATE ON schedules   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at       BEFORE UPDATE ON users       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
