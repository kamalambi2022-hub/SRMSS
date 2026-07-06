import React, { useState, useEffect } from 'react';
import {
  routesApi,
  busesApi,
  driversApi,
  schedulesApi,
  maintenanceApi,
  fuelApi,
  auditApi,
  loadAllData,
} from './services/api';
import { Route, Bus, Driver, Schedule, MaintenanceLog, FuelLog, AuditLog } from './types';
import { useAuth } from './authentication/hooks/useAuth';
import { ROLE_LABELS, ROLES } from './authentication/constants/roles';
import { ModuleRoute } from './authentication/constants/permissions';
import DashboardOverview from './components/DashboardOverview';
import RouteManagement from './components/RouteManagement';
import ScheduleManagement from './components/ScheduleManagement';
import FleetManagement from './components/FleetManagement';
import DriverManagement from './components/DriverManagement';
import MaintenanceFuel from './components/MaintenanceFuel';
import ReportingAnalytics from './components/ReportingAnalytics';
import {
  LayoutDashboard,
  Route as RouteIcon,
  CalendarDays,
  Bus as BusIcon,
  Users,
  Wrench,
  FileSpreadsheet,
  Shield,
  Clock,
  History,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X,
  Lock,
  LogOut,
  ChevronDown
} from 'lucide-react';

export default function App() {
  const { user, logout, hasModuleAccess } = useAuth();
  const currentUserRole = user?.role ?? ROLES.OPERATOR;
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Global Datasets
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Audit and System Alerts loggers
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [systemTime, setSystemTime] = useState<string>('08:40:00');
  const [showNotification, setShowNotification] = useState<{ type: 'success' | 'warn'; message: string } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load everything from the Postgres-backed Express API on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setIsLoadingData(true);
        setLoadError(null);
        const data = await loadAllData();
        if (cancelled) return;
        setRoutes(data.routes);
        setBuses(data.buses);
        setDrivers(data.drivers);
        setSchedules(data.schedules);
        setMaintenanceLogs(data.maintenanceLogs);
        setFuelLogs(data.fuelLogs);
        setAuditLogs(data.auditLogs);
      } catch (e: any) {
        if (cancelled) return;
        console.error('Failed to load data from API', e);
        setLoadError(e?.message || 'Failed to reach the SRMSS API. Is the backend server running?');
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Helper to append a security audit log (persisted via the API)
  const pushAuditLog = (action: string, category: AuditLog['category'], details: string) => {
    const newLog: Partial<AuditLog> = {
      action,
      category,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: `${user?.displayName ?? 'Unknown User'} (${ROLE_LABELS[currentUserRole]})`,
      details
    };

    auditApi
      .create(newLog)
      .then(created => setAuditLogs(prev => [created, ...prev]))
      .catch(e => console.error('Failed to write audit log', e));
  };

  // Trigger temporary floating toaster banner
  const triggerToast = (message: string, type: 'success' | 'warn' = 'success') => {
    setShowNotification({ message, type });
    setTimeout(() => setShowNotification(null), 4000);
  };

  // Role Protection check helper
  const isAuthorized = (actionName: string) => {
    if (currentUserRole === ROLES.OPERATOR) {
      triggerToast(`Access Denied: Operators do not hold write privileges to ${actionName}.`, 'warn');
      return false;
    }
    return true;
  };

  // --- CRUD DISPATCH METHODS ---

  // Generic API-error toaster so every handler below stays short.
  const onApiError = (action: string) => (e: any) => {
    console.error(`${action} failed`, e);
    triggerToast(`${action} failed: ${e?.message || 'server error'}`, 'warn');
  };

  // Route handlers
  const handleAddRoute = (newRoute: Route) => {
    if (!isAuthorized('Design Route Corridor')) return;
    routesApi.create(newRoute)
      .then(created => {
        setRoutes(prev => [created, ...prev]);
        pushAuditLog('Route Added', 'Route', `Created route ${created.routeNumber} (${created.startLocation} to ${created.endLocation})`);
        triggerToast(`Route Corridor ${created.routeNumber} deployed successfully.`);
      })
      .catch(onApiError('Adding route'));
  };

  const handleUpdateRoute = (updatedRoute: Route) => {
    if (!isAuthorized('Modify Route Corridor')) return;
    routesApi.update(updatedRoute.id, updatedRoute)
      .then(saved => {
        setRoutes(prev => prev.map(r => r.id === saved.id ? saved : r));
        pushAuditLog('Route Updated', 'Route', `Modified specifications for Route ${saved.routeNumber}`);
        triggerToast(`Route ${saved.routeNumber} updated successfully.`);
      })
      .catch(onApiError('Updating route'));
  };

  const handleDeleteRoute = (routeId: string) => {
    if (!isAuthorized('Retire Route Corridor')) return;
    const target = routes.find(r => r.id === routeId);
    routesApi.remove(routeId)
      .then(() => {
        setRoutes(prev => prev.filter(r => r.id !== routeId));
        pushAuditLog('Route Retired', 'Route', `Retired route corridor ID: ${routeId}`);
        triggerToast(`Route ${target?.routeNumber} retired from depot logs.`);
      })
      .catch(onApiError('Deleting route'));
  };

  // Schedule handlers
  const handleAddSchedule = (newSchedule: Schedule) => {
    if (!isAuthorized('Roster Schedule')) return;
    schedulesApi.create(newSchedule)
      .then(created => {
        setSchedules(prev => [created, ...prev]);
        const route = routes.find(r => r.id === created.routeId);
        pushAuditLog('Trip Scheduled', 'Schedule', `Schedules dispatch run on Route ${route?.routeNumber || 'N/A'} at ${created.departureTime}`);
        triggerToast(`Trip rostered successfully on ${created.date}.`);
      })
      .catch(onApiError('Adding schedule'));
  };

  const handleUpdateSchedule = (updatedSchedule: Schedule) => {
    if (!isAuthorized('Modify Schedule')) return;
    schedulesApi.update(updatedSchedule.id, updatedSchedule)
      .then(saved => {
        setSchedules(prev => prev.map(s => s.id === saved.id ? saved : s));
        pushAuditLog('Schedule Modified', 'Schedule', `Modified status/time for schedule ID: ${saved.id} to '${saved.status}'`);
        triggerToast(`Timetable run updated successfully.`);
      })
      .catch(onApiError('Updating schedule'));
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    if (!isAuthorized('Remove Timetable Run')) return;
    schedulesApi.remove(scheduleId)
      .then(() => {
        setSchedules(prev => prev.filter(s => s.id !== scheduleId));
        pushAuditLog('Schedule Removed', 'Schedule', `Deleted schedule roster ID: ${scheduleId}`);
        triggerToast('Timetable run removed.');
      })
      .catch(onApiError('Deleting schedule'));
  };

  // Fleet handlers
  const handleAddBus = (newBus: Bus) => {
    if (!isAuthorized('Register Vehicle')) return;
    busesApi.create(newBus)
      .then(created => {
        setBuses(prev => [created, ...prev]);
        pushAuditLog('Vehicle Registered', 'Fleet', `Registered new commercial coach ${created.registrationNo}`);
        triggerToast(`Vehicle ${created.registrationNo} added to fleet roster.`);
      })
      .catch(onApiError('Adding vehicle'));
  };

  const handleUpdateBus = (updatedBus: Bus) => {
    if (!isAuthorized('Modify Vehicle Profile')) return;
    busesApi.update(updatedBus.id, updatedBus)
      .then(saved => {
        setBuses(prev => prev.map(b => b.id === saved.id ? saved : b));
        pushAuditLog('Vehicle Profile Modified', 'Fleet', `Updated profile credentials for coach: ${saved.registrationNo}`);
        triggerToast(`Vehicle ${saved.registrationNo} details saved.`);
      })
      .catch(onApiError('Updating vehicle'));
  };

  const handleDeleteBus = (busId: string) => {
    if (!isAuthorized('Decommission Vehicle')) return;
    const target = buses.find(b => b.id === busId);
    busesApi.remove(busId)
      .then(() => {
        setBuses(prev => prev.filter(b => b.id !== busId));
        pushAuditLog('Vehicle Decommissioned', 'Fleet', `Decommissioned asset registration: ${target?.registrationNo}`);
        triggerToast(`Vehicle ${target?.registrationNo} retired from active operations.`);
      })
      .catch(onApiError('Deleting vehicle'));
  };

  // Driver handlers
  const handleAddDriver = (newDriver: Driver) => {
    if (!isAuthorized('Enlist Driver')) return;
    driversApi.create(newDriver)
      .then(created => {
        setDrivers(prev => [created, ...prev]);
        pushAuditLog('Operator Enlisted', 'Driver', `Enlisted professional operator ${created.name} (${created.employeeId})`);
        triggerToast(`Operator ${created.name} registered.`);
      })
      .catch(onApiError('Adding driver'));
  };

  const handleUpdateDriver = (updatedDriver: Driver) => {
    if (!isAuthorized('Modify Driver Credentials')) return;
    driversApi.update(updatedDriver.id, updatedDriver)
      .then(saved => {
        setDrivers(prev => prev.map(d => d.id === saved.id ? saved : d));
        pushAuditLog('Driver Profile Updated', 'Driver', `Modified credentials for operator employee: ${saved.employeeId}`);
        triggerToast(`Driver ${saved.name} credentials updated.`);
      })
      .catch(onApiError('Updating driver'));
  };

  const handleDeleteDriver = (driverId: string) => {
    if (!isAuthorized('Discharge Driver')) return;
    const target = drivers.find(d => d.id === driverId);
    driversApi.remove(driverId)
      .then(() => {
        setDrivers(prev => prev.filter(d => d.id !== driverId));
        pushAuditLog('Driver Discharged', 'Driver', `Discharged employee ID: ${target?.employeeId}`);
        triggerToast(`Operator ${target?.name} removed from registry.`);
      })
      .catch(onApiError('Deleting driver'));
  };

  // Maintenance & Fuel handlers
  const handleAddMaintenance = (newLog: MaintenanceLog) => {
    if (!isAuthorized('Log Maintenance')) return;
    maintenanceApi.create(newLog)
      .then(created => {
        setMaintenanceLogs(prev => [created, ...prev]);

        // Reflect the bus going into the workshop, both in the DB and in local state.
        return busesApi.update(created.busId, { status: 'Under Maintenance' }).then(savedBus => {
          setBuses(prev => prev.map(b => b.id === savedBus.id ? savedBus : b));
        });
      })
      .then(() => {
        pushAuditLog('Maintenance Logged', 'Maintenance', `Committed repair service for vehicle ID ${newLog.busId}. Total: LKR ${newLog.cost}`);
        triggerToast(`Maintenance record logged. Coach dispatched to Service Bay.`);
      })
      .catch(onApiError('Logging maintenance'));
  };

  const handleDeleteMaintenance = (logId: string) => {
    if (!isAuthorized('Remove Maintenance Record')) return;
    maintenanceApi.remove(logId)
      .then(() => {
        setMaintenanceLogs(prev => prev.filter(m => m.id !== logId));
        pushAuditLog('Maintenance Removed', 'Maintenance', `Deleted historical workshop service ID ${logId}`);
        triggerToast('Workshop record deleted.');
      })
      .catch(onApiError('Deleting maintenance record'));
  };

  const handleAddFuel = (newLog: FuelLog) => {
    if (!isAuthorized('Log Fuel Consumption')) return;
    fuelApi.create(newLog)
      .then(created => {
        setFuelLogs(prev => [created, ...prev]);

        // Bump the bus's current mileage if this fill-up is more recent.
        const bus = buses.find(b => b.id === created.busId);
        if (bus && bus.currentMileageKm < created.mileageAtFill) {
          return busesApi.update(created.busId, { currentMileageKm: created.mileageAtFill }).then(savedBus => {
            setBuses(prev => prev.map(b => b.id === savedBus.id ? savedBus : b));
          });
        }
      })
      .then(() => {
        pushAuditLog('Fuel Logged', 'Fuel', `Logged LKR ${newLog.cost} refuel transaction for bus ID ${newLog.busId}`);
        triggerToast(`Fuel filling transaction committed: ${newLog.liters}L.`);
      })
      .catch(onApiError('Logging fuel'));
  };

  const handleDeleteFuel = (logId: string) => {
    if (!isAuthorized('Remove Refueling Record')) return;
    fuelApi.remove(logId)
      .then(() => {
        setFuelLogs(prev => prev.filter(f => f.id !== logId));
        pushAuditLog('Fuel Removed', 'Fuel', `Deleted refuel log transaction ID ${logId}`);
        triggerToast('Refueling record deleted.');
      })
      .catch(onApiError('Deleting fuel record'));
  };

  // --- RENDERING SIDEBAR & TABS ---

  const allTabs: { id: ModuleRoute; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Operations Cockpit', icon: LayoutDashboard },
    { id: 'routes', label: 'Routes & Corridors', icon: RouteIcon },
    { id: 'schedules', label: 'Timetable Scheduling', icon: CalendarDays },
    { id: 'fleet', label: 'Vehicle Fleet Assets', icon: BusIcon },
    { id: 'drivers', label: 'Driver rosters', icon: Users },
    { id: 'maintenance', label: 'Fuel & Maintenance', icon: Wrench },
    { id: 'reports', label: 'Compiled reporting', icon: FileSpreadsheet }
  ];

  // Only render tabs this authenticated role is actually permitted to open (RBAC).
  const tabsList = allTabs.filter(tab => hasModuleAccess(tab.id));

  // If the active tab becomes inaccessible (e.g. role changes), fall back to the first allowed tab.
  useEffect(() => {
    if (!tabsList.some(tab => tab.id === activeTab) && tabsList.length > 0) {
      setActiveTab(tabsList[0].id);
    }
  }, [currentUserRole]);

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-600">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-semibold">Loading SRMSS data from the database…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-800 px-6">
        <div className="max-w-md text-center bg-white border border-red-200 rounded-xl p-8 shadow-sm">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="font-bold text-lg mb-2">Couldn't reach the SRMSS API</h2>
          <p className="text-sm text-slate-600 mb-4">{loadError}</p>
          <p className="text-xs text-slate-400">
            Make sure PostgreSQL is running, the database is migrated (see <code>database/schema.sql</code>),
            and the Express backend (<code>npm run server</code>) is up before reloading.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased" id="srmss-root-viewport">
      
      {/* HEADER BAR */}
      <header className="bg-slate-900 text-white shrink-0 shadow-md border-b border-slate-800 z-30">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="lg:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500 text-slate-950 font-bold px-2 py-1 rounded text-xs tracking-wider">SRMSS</span>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold tracking-tight">Sri Lanka Transport Board</h1>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Colombo Central Depot Cockpit</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            
            {/* System clock */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>UTC {new Date().toISOString().substring(11,19)}</span>
            </div>

            {/* Authenticated user / RBAC profile menu */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(prev => !prev)}
                className="flex items-center bg-slate-800 border border-slate-700 rounded-xl pl-2.5 pr-1.5 py-1 gap-2 hover:bg-slate-700 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-[11px] font-bold text-white">{user?.displayName ?? 'User'}</span>
                  <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wide">{ROLE_LABELS[currentUserRole]}</span>
                </div>
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                  {user?.avatarInitials ?? '--'}
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {profileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-2 animate-fadeIn">
                    <div className="px-3 py-2.5 border-b border-slate-800 mb-1">
                      <p className="text-xs font-bold text-white">{user?.displayName}</p>
                      <p className="text-[10px] text-slate-400">{user?.depot ?? 'Sri Lanka Transport Board'}</p>
                      <span className="inline-block mt-1.5 text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        {ROLE_LABELS[currentUserRole]}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        pushAuditLog('User Logout', 'System', `${user?.displayName ?? 'User'} signed out.`);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Audit Logs button */}
            <button
              onClick={() => setShowAuditModal(true)}
              className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 border border-slate-800 transition-all flex items-center gap-1"
              title="System Security Audits"
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold hidden md:inline">Audit Trail</span>
            </button>
          </div>
        </div>
      </header>

      {/* CORE VIEWPORT */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col lg:flex-row relative">
        
        {/* SIDEBAR NAVIGATION - Desktop */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-200 py-6 px-4 space-y-6 bg-white">
          <div className="space-y-1">
            {tabsList.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="h-[1px] bg-slate-200"></div>

          {/* Quick info widgets */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-2 text-xs">
            <span className="font-bold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <Bell className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
              Depot Broadcaster
            </span>
            <p className="text-slate-600 leading-relaxed font-sans">
              Vehicular certification expiries and heavy license limits are monitored. Ensure rosters are locked before 12:00.
            </p>
          </div>
        </aside>

        {/* MOBILE OVERLAY NAVIGATION */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-950/50 z-40 lg:hidden backdrop-blur-sm animate-fadeIn" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-64 bg-white h-full p-5 space-y-6 flex flex-col justify-between" onClick={e => e.stopPropagation()}>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-800 text-sm">Depot Control</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-1">
                  {tabsList.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 pt-3">
                Sri Lanka Transport Board • SRMSS v1.0
              </div>
            </div>
          </div>
        )}

        {/* MAIN BODY WRAPPER */}
        <main className="flex-1 p-4 lg:p-6 overflow-hidden min-w-0">
          
          {/* Active Tab rendering */}
          {activeTab === 'dashboard' && (
            <DashboardOverview
              routes={routes}
              buses={buses}
              drivers={drivers}
              schedules={schedules}
              fuelLogs={fuelLogs}
              maintenanceLogs={maintenanceLogs}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'routes' && (
            <RouteManagement
              routes={routes}
              buses={buses}
              drivers={drivers}
              schedules={schedules}
              onAddRoute={handleAddRoute}
              onUpdateRoute={handleUpdateRoute}
              onDeleteRoute={handleDeleteRoute}
            />
          )}

          {activeTab === 'schedules' && (
            <ScheduleManagement
              schedules={schedules}
              routes={routes}
              buses={buses}
              drivers={drivers}
              onAddSchedule={handleAddSchedule}
              onUpdateSchedule={handleUpdateSchedule}
              onDeleteSchedule={handleDeleteSchedule}
            />
          )}

          {activeTab === 'fleet' && (
            <FleetManagement
              buses={buses}
              maintenanceLogs={maintenanceLogs}
              onAddBus={handleAddBus}
              onUpdateBus={handleUpdateBus}
              onDeleteBus={handleDeleteBus}
            />
          )}

          {activeTab === 'drivers' && (
            <DriverManagement
              drivers={drivers}
              routes={routes}
              schedules={schedules}
              onAddDriver={handleAddDriver}
              onUpdateDriver={handleUpdateDriver}
              onDeleteDriver={handleDeleteDriver}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceFuel
              buses={buses}
              drivers={drivers}
              maintenanceLogs={maintenanceLogs}
              fuelLogs={fuelLogs}
              onAddMaintenance={handleAddMaintenance}
              onAddFuel={handleAddFuel}
              onDeleteMaintenance={handleDeleteMaintenance}
              onDeleteFuel={handleDeleteFuel}
            />
          )}

          {activeTab === 'reports' && (
            <ReportingAnalytics
              routes={routes}
              buses={buses}
              drivers={drivers}
              schedules={schedules}
              maintenanceLogs={maintenanceLogs}
              fuelLogs={fuelLogs}
            />
          )}
        </main>
      </div>

      {/* SECURE SYSTEM AUDIT TRAIL MODAL (Security requirements compliance) */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl p-6 shadow-2xl flex flex-col justify-between max-h-[85vh] animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-950">Secure Operations Audit Trail</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Real-time ledger logging supervisor transactions</p>
                </div>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Audit Logs Table */}
            <div className="flex-1 overflow-y-auto my-4 pr-1 text-xs space-y-2.5">
              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 italic">No operations recorded.</div>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{log.action}</span>
                        <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                          {log.category}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] leading-relaxed">{log.details}</p>
                      <span className="text-[10px] text-slate-400 font-medium font-mono">{log.timestamp}</span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                        {log.user}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">
                Tamper-Proof Ledger Active
              </span>
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOASTER BANNERS */}
      {showNotification && (
        <div className="fixed bottom-6 right-6 z-50 animate-slideIn">
          <div className={`p-4 border rounded-2xl shadow-xl flex gap-3 items-start max-w-sm ${
            showNotification.type === 'warn'
              ? 'bg-rose-50 border-rose-100 text-rose-950'
              : 'bg-emerald-50 border-emerald-100 text-emerald-950'
          }`}>
            {showNotification.type === 'warn' ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <div className="space-y-0.5 text-xs font-sans">
              <span className="font-bold">
                {showNotification.type === 'warn' ? 'Privilege Protection' : 'Action Confirmed'}
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">{showNotification.message}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
