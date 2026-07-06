import React, { useState, useMemo } from 'react';
import { Route, Bus, Driver, Schedule, MaintenanceLog, FuelLog } from '../types';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Layers,
  FileText,
  Clock,
  TrendingUp,
  User,
  Wrench,
  Fuel,
  TrendingDown,
  ChevronRight,
  Download,
  Award
} from 'lucide-react';

interface ReportingAnalyticsProps {
  routes: Route[];
  buses: Bus[];
  drivers: Driver[];
  schedules: Schedule[];
  maintenanceLogs: MaintenanceLog[];
  fuelLogs: FuelLog[];
}

type ReportType = 'routes' | 'fleet' | 'drivers' | 'fuel' | 'maintenance' | 'schedules';

export default function ReportingAnalytics({
  routes,
  buses,
  drivers,
  schedules,
  maintenanceLogs,
  fuelLogs
}: ReportingAnalyticsProps) {
  const [reportType, setReportType] = useState<ReportType>('routes');
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-07-31');

  // Generate Report Datasets based on filters
  const reportData = useMemo(() => {
    const isWithinRange = (dateStr: string) => {
      return dateStr >= startDate && dateStr <= endDate;
    };

    switch (reportType) {
      case 'routes':
        return routes.map(r => {
          const associatedSchedules = schedules.filter(s => s.routeId === r.id && isWithinRange(s.date));
          const completed = associatedSchedules.filter(s => s.status === 'Completed').length;
          const delayed = associatedSchedules.filter(s => s.status === 'Delayed' || s.delayMinutes > 0).length;
          const activeSchedulesOnRoute = schedules.filter(s => s.routeId === r.id && s.status === 'Active');
          
          return {
            'Route Number': r.routeNumber,
            'Corridor': `${r.startLocation} to ${r.endLocation}`,
            'Service Level': r.serviceType,
            'Total Distance': `${r.distanceKm} km`,
            'Trips Logged': associatedSchedules.length,
            'Completions': completed,
            'Delays Flagged': delayed,
            'Utilization Ratio': associatedSchedules.length > 0 
              ? `${Math.round((completed / associatedSchedules.length) * 100)}%` 
              : '0%'
          };
        });

      case 'fleet':
        return buses.map(b => {
          const associatedMaint = maintenanceLogs.filter(m => m.busId === b.id && isWithinRange(m.date));
          const totalCost = associatedMaint.reduce((acc, curr) => acc + curr.cost, 0);
          const associatedFuel = fuelLogs.filter(f => f.busId === b.id && isWithinRange(f.date));
          const totalFuelLiters = associatedFuel.reduce((acc, curr) => acc + curr.liters, 0);

          return {
            'Registration No': b.registrationNo,
            'Manufacturer': b.manufacturer,
            'Model Spec': b.model,
            'Assigned Depot': b.assignedDepot,
            'Odometer Log': `${b.currentMileageKm.toLocaleString()} km`,
            'Status': b.status,
            'Maintenance Cycles': associatedMaint.length,
            'Expenses (LKR)': totalCost.toLocaleString(),
            'Fuel Fills': associatedFuel.length,
            'Fuel Consumed': `${totalFuelLiters} L`
          };
        });

      case 'drivers':
        return drivers.map(d => {
          const activeSchedules = schedules.filter(s => s.driverId === d.id && isWithinRange(s.date));
          const completedTrips = activeSchedules.filter(s => s.status === 'Completed').length;
          const delays = activeSchedules.filter(s => s.status === 'Delayed' || s.delayMinutes > 0).length;

          return {
            'Employee ID': d.employeeId,
            'Operator Name': d.name,
            'License No': d.licenseNo,
            'Status': d.status,
            'Rating': `${d.performanceRating} / 5`,
            'Allocated Runs': activeSchedules.length,
            'Runs Completed': completedTrips,
            'Delays Caused': delays,
            'Attendance Score': activeSchedules.length > 0 
              ? `${Math.round(((activeSchedules.length - delays) / activeSchedules.length) * 100)}%`
              : '100%'
          };
        });

      case 'fuel':
        return fuelLogs.filter(f => isWithinRange(f.date)).map(f => {
          const bus = buses.find(b => b.id === f.busId);
          const driver = drivers.find(d => d.id === f.driverId);
          return {
            'Fuel Date': f.date,
            'Vehicle Reg': bus?.registrationNo || 'N/A',
            'Odometer': `${f.mileageAtFill.toLocaleString()} km`,
            'Volume Dispensed': `${f.liters} L`,
            'Log Cost (LKR)': f.cost.toLocaleString(),
            'Efficiency': `${f.efficiencyKmpl} km/L`,
            'Authorized Operator': driver?.name || 'N/A'
          };
        });

      case 'maintenance':
        return maintenanceLogs.filter(m => isWithinRange(m.date)).map(m => {
          const bus = buses.find(b => b.id === m.busId);
          return {
            'Service Date': m.date,
            'Vehicle Reg': bus?.registrationNo || 'N/A',
            'Service Type': m.type,
            'Task Description': m.description,
            'Service Cost (LKR)': m.cost.toLocaleString(),
            'Next Scheduled': m.nextServiceDate
          };
        });

      case 'schedules':
        return schedules.filter(s => isWithinRange(s.date)).map(s => {
          const r = routes.find(rt => rt.id === s.routeId);
          const b = buses.find(bu => bu.id === s.busId);
          const d = drivers.find(dr => dr.id === s.driverId);
          return {
            'Date': s.date,
            'Route': r?.routeNumber || 'N/A',
            'Corridor': r ? `${r.startLocation} - ${r.endLocation}` : 'N/A',
            'Departure': s.departureTime,
            'Arrival': s.arrivalTime,
            'Vehicle': b?.registrationNo || 'N/A',
            'Driver': d?.name || 'N/A',
            'Trip Status': s.status,
            'Delay (mins)': s.delayMinutes
          };
        });
    }
  }, [reportType, startDate, endDate, routes, buses, drivers, schedules, maintenanceLogs, fuelLogs]);

  // Export CSV function
  const triggerCsvExport = () => {
    if (reportData.length === 0) {
      alert('No data available to export with the current filters.');
      return;
    }

    const headers = Object.keys(reportData[0]);
    const csvRows = [headers.join(',')];

    for (const row of reportData) {
      const values = headers.map(header => {
        // Escape quotes
        const val = String((row as any)[header]).replace(/"/g, '""');
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create hidden download trigger
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportType}_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintTrigger = () => {
    alert('Iframe sandbox constraints prevent invoking native printer dialogue. For printing/PDF, please copy or export records in CSV format, or open this application in a new browser tab.');
  };

  return (
    <div className="space-y-6" id="srmss-reports-view">
      {/* Report Selector Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Custom Report Generator</h3>
        <p className="text-xs text-slate-500 -mt-2">Filter and compile historical transport logs instantly.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          {/* Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Dataset Core</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white"
            >
              <option value="routes">Route performance & Utilization</option>
              <option value="fleet">Fleet Asset Utilization</option>
              <option value="drivers">Driver Logs & Attendance</option>
              <option value="fuel">Fuel Refills & Consumption</option>
              <option value="maintenance">Workshop Service History</option>
              <option value="schedules">Roster Timetables</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {/* Exports Buttons */}
          <div className="flex items-end gap-2 shrink-0">
            <button
              onClick={triggerCsvExport}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              title="Export as CSV/Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              CSV Export
            </button>
            <button
              onClick={handlePrintTrigger}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              title="Print View"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* KPI Scores Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" /> Delay variance index
          </div>
          <div className="text-xl font-bold text-slate-950">
            {schedules.filter(s => s.status === 'Completed' && s.delayMinutes > 0).length} Delayed Runs
          </div>
          <p className="text-[10px] text-slate-400">Total delayed completions in filtered logs</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Depot Trip completion rate
          </div>
          <div className="text-xl font-bold text-slate-950">
            {schedules.length > 0 
              ? `${Math.round((schedules.filter(s => s.status === 'Completed').length / schedules.length) * 100)}%`
              : '100%'}
          </div>
          <p className="text-[10px] text-slate-400">Trips completed vs canceled/delayed runs</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-violet-500" /> Top Performing Driver
          </div>
          <div className="text-xl font-bold text-slate-950">
            {drivers.sort((a,b) => b.performanceRating - a.performanceRating)[0]?.name || 'N/A'}
          </div>
          <p className="text-[10px] text-slate-400">Determined by performance safety quotient</p>
        </div>
      </div>

      {/* Report Table preview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-500" />
            Compiled Dataset Preview
          </h3>
          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded font-mono uppercase">
            {reportData.length} Records found
          </span>
        </div>

        <div className="overflow-x-auto">
          {reportData.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs italic">
              No matching records compiled for the selected date range.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
                  {Object.keys(reportData[0]).map(header => (
                    <th key={header} className="p-3 font-semibold">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    {Object.values(row).map((val: any, cellIdx) => (
                      <td key={cellIdx} className="p-3 font-medium text-slate-700">
                        {val === 'Available' || val === 'Completed' || val === 'Normal' ? (
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full font-bold">
                            {val}
                          </span>
                        ) : val === 'On Route' || val === 'Active' || val === 'Luxury' ? (
                          <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full font-bold">
                            {val}
                          </span>
                        ) : val === 'Under Maintenance' || val === 'Delayed' ? (
                          <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                            {val}
                          </span>
                        ) : val === 'Cancelled' || val === 'Suspended' ? (
                          <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-full font-bold">
                            {val}
                          </span>
                        ) : (
                          val
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
