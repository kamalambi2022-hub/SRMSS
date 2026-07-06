import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp,
  Bus as BusIcon,
  Users,
  Route as RouteIcon,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity,
  Gauge,
  MapPin,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';
import { Route, Bus, Driver, Schedule, FuelLog, MaintenanceLog } from '../types';

interface DashboardOverviewProps {
  routes: Route[];
  buses: Bus[];
  drivers: Driver[];
  schedules: Schedule[];
  fuelLogs: FuelLog[];
  maintenanceLogs: MaintenanceLog[];
  onNavigate: (tab: string) => void;
}

export default function DashboardOverview({
  routes,
  buses,
  drivers,
  schedules,
  fuelLogs,
  maintenanceLogs,
  onNavigate
}: DashboardOverviewProps) {
  
  // Real-time operations stats calculation
  const stats = useMemo(() => {
    const totalRoutes = routes.length;
    const activeRoutes = routes.filter(r => r.isActive).length;

    const totalBuses = buses.length;
    const availableBuses = buses.filter(b => b.status === 'Available').length;
    const maintenanceBuses = buses.filter(b => b.status === 'Under Maintenance').length;
    const onRouteBuses = buses.filter(b => b.status === 'On Route').length;

    const totalDrivers = drivers.length;
    const availableDrivers = drivers.filter(d => d.status === 'Available').length;
    const onDutyDrivers = drivers.filter(d => d.status === 'On Duty').length;

    const activeTrips = schedules.filter(s => s.status === 'Active').length;
    const completedTrips = schedules.filter(s => s.status === 'Completed').length;
    const delayedTrips = schedules.filter(s => s.status === 'Delayed' || (s.status === 'Active' && s.delayMinutes > 0)).length;
    const scheduledTrips = schedules.filter(s => s.status === 'Scheduled').length;

    // Fleet utilization: percentage of non-inactive buses currently in service or available
    const activeAssets = buses.filter(b => b.status === 'Available' || b.status === 'On Route').length;
    const vehicleUtilization = totalBuses > 0 ? Math.round((activeAssets / totalBuses) * 100) : 0;

    return {
      totalRoutes,
      activeRoutes,
      totalBuses,
      availableBuses,
      maintenanceBuses,
      onRouteBuses,
      totalDrivers,
      availableDrivers,
      onDutyDrivers,
      activeTrips,
      completedTrips,
      delayedTrips,
      scheduledTrips,
      vehicleUtilization
    };
  }, [routes, buses, drivers, schedules]);

  // Chart 1 Data: Fleet Distribution
  const fleetChartData = useMemo(() => {
    const counts = {
      'Available': 0,
      'On Route': 0,
      'Maintenance': 0,
      'Inactive': 0
    };
    buses.forEach(b => {
      if (b.status === 'Available') counts['Available']++;
      else if (b.status === 'On Route') counts['On Route']++;
      else if (b.status === 'Under Maintenance') counts['Maintenance']++;
      else counts['Inactive']++;
    });

    return [
      { name: 'Available', value: counts['Available'], color: '#10b981' }, // Emerald
      { name: 'In Transit', value: counts['On Route'], color: '#3b82f6' }, // Blue
      { name: 'Service Bay', value: counts['Maintenance'], color: '#f59e0b' }, // Amber
      { name: 'Decommissioned', value: counts['Inactive'], color: '#64748b' } // Slate
    ].filter(item => item.value > 0);
  }, [buses]);

  // Chart 2 Data: Route Performance (Trips completed or running vs Distance)
  const routePerformanceData = useMemo(() => {
    return routes.map(r => {
      const associatedSchedules = schedules.filter(s => s.routeId === r.id);
      const totalCount = associatedSchedules.length;
      const delayedCount = associatedSchedules.filter(s => s.status === 'Delayed' || s.delayMinutes > 0).length;
      return {
        name: `${r.routeNumber} (${r.startLocation.substring(0,3)}-${r.endLocation.substring(0,3)})`,
        Trips: totalCount,
        Delayed: delayedCount,
        DistanceKm: r.distanceKm
      };
    });
  }, [routes, schedules]);

  // Chart 3 Data: Fuel Efficiency km/l per bus (Liters vs Mileage filled)
  const fuelEfficiencyData = useMemo(() => {
    const busEffMap: Record<string, { totalMileage: number; totalLiters: number; count: number; reg: string }> = {};
    
    // Initialize with buses
    buses.forEach(b => {
      busEffMap[b.id] = { totalMileage: 0, totalLiters: 0, count: 0, reg: b.registrationNo };
    });

    // Populate with fuel logs
    fuelLogs.forEach(log => {
      if (busEffMap[log.busId]) {
        busEffMap[log.busId].totalLiters += log.liters;
        busEffMap[log.busId].count++;
      }
    });

    return Object.entries(busEffMap)
      .map(([id, val]) => {
        const associatedLogs = fuelLogs.filter(f => f.busId === id);
        // Find average efficiency listed or calculated
        const avgEff = associatedLogs.length > 0 
          ? Number((associatedLogs.reduce((acc, curr) => acc + curr.efficiencyKmpl, 0) / associatedLogs.length).toFixed(1))
          : 0;
        return {
          bus: val.reg,
          'Efficiency (km/L)': avgEff || 3.8 // standard Leyland value if zero
        };
      })
      .filter(item => item['Efficiency (km/L)'] > 0);
  }, [fuelLogs, buses]);

  // Expiry alerts for drivers & fitness certificates
  const operationalAlerts = useMemo(() => {
    const alerts: { type: 'Warning' | 'Urgent'; title: string; desc: string; category: string }[] = [];
    
    // Check bus fitness expiry
    const today = new Date('2026-07-01');
    buses.forEach(b => {
      const fitnessDate = new Date(b.fitnessCertificateExpiry);
      const diffTime = fitnessDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        alerts.push({
          type: 'Urgent',
          title: `Fitness Expired: ${b.registrationNo}`,
          desc: `Vehicle fitness certificate expired ${Math.abs(diffDays)} days ago! Immediate inspection mandatory.`,
          category: 'Fleet'
        });
      } else if (diffDays <= 60) {
        alerts.push({
          type: 'Warning',
          title: `Fitness Expiry: ${b.registrationNo}`,
          desc: `Fitness certificate expires in ${diffDays} days (${b.fitnessCertificateExpiry}). Schedule standard test soon.`,
          category: 'Fleet'
        });
      }
    });

    // Check driver license expiry
    drivers.forEach(d => {
      const licenseDate = new Date(d.licenseExpiry);
      const diffTime = licenseDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        alerts.push({
          type: 'Urgent',
          title: `License Expired: ${d.name}`,
          desc: `Driving credentials expired on ${d.licenseExpiry}. Suspend scheduling immediately.`,
          category: 'Driver'
        });
      } else if (diffDays <= 90) {
        alerts.push({
          type: 'Warning',
          title: `License Expiry: ${d.name}`,
          desc: `License expires in ${diffDays} days (${d.licenseExpiry}). Send reminder notification.`,
          category: 'Driver'
        });
      }
    });

    return alerts;
  }, [buses, drivers]);

  return (
    <div className="space-y-6" id="srmss-dashboard-view">
      {/* Central Metrics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Fleet Dispatch</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-950">{stats.activeTrips}</span>
              <span className="text-xs text-slate-400">/ {stats.scheduledTrips + stats.activeTrips} today</span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Buses currently in service
            </p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
            <BusIcon className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fleet Utilization</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-950">{stats.vehicleUtilization}%</span>
              <span className="text-xs text-emerald-600 font-medium flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +2.4%
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-slate-400" />
              Active or route-ready status
            </p>
          </div>
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Roster Readiness</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-950">{stats.availableDrivers}</span>
              <span className="text-xs text-slate-400">/ {stats.totalDrivers} Drivers</span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              Standby and rest-period OK
            </p>
          </div>
          <div className="bg-violet-50 p-3 rounded-xl border border-violet-100">
            <Users className="w-6 h-6 text-violet-600" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delayed services</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-950">{stats.delayedTrips}</span>
              {stats.delayedTrips > 0 ? (
                <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                  Needs review
                </span>
              ) : (
                <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                  Normal
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Timetable variance tracker
            </p>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Main Charts Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Schedule & Route Map Overview */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Service Performance & Utilization</h3>
              <p className="text-xs text-slate-500">Trip allocation metrics compared with distance thresholds</p>
            </div>
            <button onClick={() => onNavigate('routes')} className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
              Route Planner ➔
            </button>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={routePerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <ChartTooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#f8fafc', border: 'none', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Trips" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Allocated Trips" />
                <Bar dataKey="Delayed" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Delayed Trips" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Fleet Breakdown (Pie Chart) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Vehicle Allocation Status</h3>
            <p className="text-xs text-slate-500">Operational distribution of passenger coaches</p>
          </div>
          
          <div className="h-[200px] flex items-center justify-center relative my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fleetChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {fleetChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#f8fafc', border: 'none', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Absolute Centered Stat */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-950">{stats.totalBuses}</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Fleet</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
            {fleetChartData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 px-1 py-0.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-600 font-medium">{item.name}:</span>
                <span className="font-bold text-slate-950 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fuel Efficiency Analytics */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Fuel Consumption Benchmark (km/L)</h3>
              <p className="text-xs text-slate-500">Asset efficiency indices. Lower values indicate vehicle service needs.</p>
            </div>
            <button onClick={() => onNavigate('maintenance')} className="text-xs text-emerald-600 font-semibold hover:underline">
              Fuel Logbook ➔
            </button>
          </div>
          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={fuelEfficiencyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bus" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} unit=" km/L" />
                <ChartTooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#f8fafc', border: 'none', fontSize: '11px' }}
                />
                <Line
                  type="monotone"
                  dataKey="Efficiency (km/L)"
                  stroke="#10b981"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Panel: Operations Alerts & Maintenance Reminders */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Critical Alerts & Expiries</h3>
            <p className="text-xs text-slate-500">System warnings regarding driver licensing & vehicle certificates</p>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[190px] mt-3 space-y-2.5 pr-1">
            {operationalAlerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs italic py-10">
                <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                All certifications are up to date!
              </div>
            ) : (
              operationalAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex gap-2.5 items-start ${
                    alert.type === 'Urgent'
                      ? 'bg-rose-50 border-rose-100 text-rose-950'
                      : 'bg-amber-50/50 border-amber-100 text-amber-950'
                  }`}
                >
                  <AlertTriangle
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      alert.type === 'Urgent' ? 'text-rose-600' : 'text-amber-600'
                    }`}
                  />
                  <div className="space-y-0.5 text-xs">
                    <div className="font-bold flex items-center gap-1.5">
                      {alert.title}
                      <span className={`text-[9px] px-1 py-0.5 rounded-full uppercase font-mono font-bold ${
                        alert.type === 'Urgent' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {alert.category}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600">{alert.desc}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 mt-2 text-center">
            <span className="text-[10px] text-slate-400 font-sans">
              Depot Time: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
