import React, { useState, useMemo, useEffect } from 'react';
import { Route, Bus, Driver, Schedule } from '../types';
import {
  Calendar,
  Clock,
  User,
  Bus as BusIcon,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  X,
  RotateCcw,
  Sliders,
  Filter,
  Check,
  Zap,
  Info
} from 'lucide-react';

interface ScheduleManagementProps {
  schedules: Schedule[];
  routes: Route[];
  buses: Bus[];
  drivers: Driver[];
  onAddSchedule: (schedule: Schedule) => void;
  onUpdateSchedule: (schedule: Schedule) => void;
  onDeleteSchedule: (scheduleId: string) => void;
}

export default function ScheduleManagement({
  schedules,
  routes,
  buses,
  drivers,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule
}: ScheduleManagementProps) {
  const [selectedDate, setSelectedDate] = useState('2026-07-01');
  const [isAdding, setIsAdding] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  // Filter criteria
  const [routeFilter, setRouteFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form states
  const [routeId, setRouteId] = useState('');
  const [busId, setBusId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [departureTime, setDepartureTime] = useState('08:00');
  const [arrivalTime, setArrivalTime] = useState('11:00');
  const [tripStatus, setTripStatus] = useState<Schedule['status']>('Scheduled');
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [notes, setNotes] = useState('');

  // Special events schedule helper
  const [specialEventMode, setSpecialEventMode] = useState(false);
  const [specialEventTitle, setSpecialEventTitle] = useState('');

  // Conflict state
  const [conflictError, setConflictError] = useState<{
    type: 'Bus' | 'Driver' | 'Both';
    message: string;
    conflictingSchedule: Schedule;
  } | null>(null);

  // Auto-calculate arrival time based on route estimate when route changes
  useEffect(() => {
    if (!editingScheduleId) {
      const selectedRoute = routes.find(r => r.id === routeId);
      if (selectedRoute && departureTime) {
        const [hours, minutes] = departureTime.split(':').map(Number);
        const duration = selectedRoute.estimatedDurationMinutes;
        
        const totalMinutes = hours * 60 + minutes + duration;
        const newHours = Math.floor(totalMinutes / 60) % 24;
        const newMinutes = totalMinutes % 60;
        
        const pad = (n: number) => String(n).padStart(2, '0');
        setArrivalTime(`${pad(newHours)}:${pad(newMinutes)}`);
      }
    }
  }, [routeId, departureTime, routes, editingScheduleId]);

  // Real-time conflict scanner
  const detectConflicts = (
    propBusId: string,
    propDriverId: string,
    propDate: string,
    propDep: string,
    propArr: string,
    excludeId?: string
  ) => {
    if (!propBusId || !propDriverId || !propDate || !propDep || !propArr) return null;

    // Helper to convert time string to minutes since midnight
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const newStart = toMin(propDep);
    const newEnd = toMin(propArr);

    // Filter schedules on same date
    const sameDaySchedules = schedules.filter(
      s => s.date === propDate && s.id !== excludeId && s.status !== 'Cancelled'
    );

    for (const sched of sameDaySchedules) {
      const existStart = toMin(sched.departureTime);
      const existEnd = toMin(sched.arrivalTime);

      // Check overlap: (ProposedStart < ExistingEnd) && (ProposedEnd > ExistingStart)
      const isOverlapping = newStart < existEnd && newEnd > existStart;

      if (isOverlapping) {
        if (sched.busId === propBusId) {
          const b = buses.find(x => x.id === propBusId);
          const r = routes.find(x => x.id === sched.routeId);
          return {
            type: 'Bus' as const,
            message: `Conflict: Vehicle ${b?.registrationNo || 'Selected'} is already assigned to Route ${r?.routeNumber || ''} (${sched.departureTime} - ${sched.arrivalTime}) on this day.`,
            conflictingSchedule: sched
          };
        }

        if (sched.driverId === propDriverId) {
          const d = drivers.find(x => x.id === propDriverId);
          const r = routes.find(x => x.id === sched.routeId);
          return {
            type: 'Driver' as const,
            message: `Conflict: Driver ${d?.name || 'Selected'} is scheduled on Route ${r?.routeNumber || ''} (${sched.departureTime} - ${sched.arrivalTime}) during these hours.`,
            conflictingSchedule: sched
          };
        }
      }
    }

    return null;
  };

  // Run conflict detection on field updates
  useEffect(() => {
    const conflict = detectConflicts(
      busId,
      driverId,
      selectedDate,
      departureTime,
      arrivalTime,
      editingScheduleId || undefined
    );
    setConflictError(conflict);
  }, [busId, driverId, selectedDate, departureTime, arrivalTime, editingScheduleId, schedules]);

  const handleCreateNewScheduleClick = () => {
    setEditingScheduleId(null);
    setIsAdding(true);
    setRouteId(routes[0]?.id || '');
    setBusId(buses.find(b => b.status === 'Available')?.id || '');
    setDriverId(drivers.find(d => d.status === 'Available')?.id || '');
    setDepartureTime('08:00');
    setTripStatus('Scheduled');
    setDelayMinutes(0);
    setNotes('');
  };

  const handleEditClick = (sched: Schedule) => {
    setEditingScheduleId(sched.id);
    setIsAdding(true);
    setRouteId(sched.routeId);
    setBusId(sched.busId);
    setDriverId(sched.driverId);
    setDepartureTime(sched.departureTime);
    setArrivalTime(sched.arrivalTime);
    setTripStatus(sched.status);
    setDelayMinutes(sched.delayMinutes);
    setNotes(sched.notes || '');
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingScheduleId(null);
    setRouteId('');
    setBusId('');
    setDriverId('');
    setDepartureTime('08:00');
    setTripStatus('Scheduled');
    setDelayMinutes(0);
    setNotes('');
    setSpecialEventMode(false);
    setSpecialEventTitle('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (conflictError) {
      alert(`Cannot schedule: ${conflictError.message}`);
      return;
    }

    const schedData: Schedule = {
      id: editingScheduleId || `S-${Date.now()}`,
      routeId,
      busId,
      driverId,
      date: selectedDate,
      departureTime,
      arrivalTime,
      status: tripStatus,
      delayMinutes: Number(delayMinutes),
      notes: specialEventMode && specialEventTitle ? `[Holiday Timetable: ${specialEventTitle}] ${notes}` : notes
    };

    if (editingScheduleId) {
      onUpdateSchedule(schedData);
    } else {
      onAddSchedule(schedData);
    }

    resetForm();
  };

  const activeSchedulesOnDate = useMemo(() => {
    return schedules.filter(s => {
      const matchesDate = s.date === selectedDate;
      const matchesRoute = routeFilter === 'All' || s.routeId === routeFilter;
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
      return matchesDate && matchesRoute && matchesStatus;
    }).sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  }, [schedules, selectedDate, routeFilter, statusFilter]);

  return (
    <div className="space-y-6" id="srmss-schedules-panel">
      {/* Date & Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Calendar className="w-5 h-5 text-emerald-500 shrink-0" />
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Target Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="font-bold text-slate-800 focus:outline-none border-b border-slate-200 pb-0.5 focus:border-emerald-500 cursor-pointer text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto justify-end">
          {/* Route filter */}
          <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs text-slate-600 font-medium py-1.5">
            <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" />
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-800"
            >
              <option value="All">All Routes</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>Route {r.routeNumber}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs text-slate-600 font-medium py-1.5">
            <Sliders className="w-3.5 h-3.5 mr-1 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-800"
            >
              <option value="All">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Active">Active</option>
              <option value="Delayed">Delayed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <button
            onClick={handleCreateNewScheduleClick}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Dispatch Trip
          </button>
        </div>
      </div>

      {/* Roster & Planner Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form (when adding/editing) or informative reminders */}
        {isAdding ? (
          <form onSubmit={handleSubmit} className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 h-fit animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-500" />
                {editingScheduleId ? 'Modify Roster Details' : 'Design Dynamic Dispatch'}
              </h3>
              <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Special event tagger */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                  Holiday / Poya Day Special Scheduling
                </span>
                <input
                  type="checkbox"
                  checked={specialEventMode}
                  onChange={(e) => setSpecialEventMode(e.target.checked)}
                  className="w-3.5 h-3.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
              </div>
              {specialEventMode && (
                <input
                  type="text"
                  placeholder="e.g. Vesak Festival, Esala Perahera"
                  value={specialEventTitle}
                  onChange={(e) => setSpecialEventTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-emerald-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Select Route Corridor *</label>
              <select
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">-- Choose Corridor --</option>
                {routes.filter(r => r.isActive).map(r => (
                  <option key={r.id} value={r.id}>
                    Route {r.routeNumber} ({r.startLocation} ➔ {r.endLocation} - {r.serviceType})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Assigned Coach *</label>
                <select
                  value={busId}
                  onChange={(e) => setBusId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Choose Coach --</option>
                  {buses.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.registrationNo} ({b.model} - {b.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Licensed Driver *</label>
                <select
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Choose Driver --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.employeeId} - {d.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Departure Time *</label>
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Arrival Time *</label>
                <input
                  type="time"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            {/* Roster state options */}
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Roster Status</label>
                <select
                  value={tripStatus}
                  onChange={(e) => setTripStatus(e.target.value as Schedule['status'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Active">Active / On Road</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Delay Duration (Mins)</label>
                <input
                  type="number"
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  min="0"
                  disabled={tripStatus !== 'Delayed' && tripStatus !== 'Active'}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Operational Dispatch Notes</label>
              <textarea
                placeholder="Log platform departures, passenger loads, or delays..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs h-16 resize-none"
              />
            </div>

            {/* REAL-TIME CONFLICT ERROR DRAWER */}
            {conflictError && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5 text-amber-900 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <span className="font-bold flex items-center gap-1">
                    Conflict Block Active: {conflictError.type} overlap
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{conflictError.message}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={resetForm}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl transition-colors ${
                  conflictError 
                    ? 'bg-slate-300 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
                disabled={!!conflictError}
              >
                {editingScheduleId ? 'Save Schedule' : 'Dispatch Schedule'}
              </button>
            </div>
          </form>
        ) : (
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3.5">
              <h3 className="text-sm font-bold flex items-center gap-1.5 text-emerald-400 font-sans">
                <Info className="w-4 h-4" />
                Intelligent Roster Diagnostics
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                The SRMSS timetable system runs dynamic background scans comparing:
              </p>
              <ul className="text-[11px] text-slate-400 space-y-2 list-disc pl-4 font-sans">
                <li><strong className="text-slate-200">Driver Shift Rest-Limits:</strong> Highlights overlapping trip assignments.</li>
                <li><strong className="text-slate-200">Coach Availability Double-Bookings:</strong> Warns instantly if a registration code is assigned twice at once.</li>
                <li><strong className="text-slate-200">Special Timetables:</strong> Integrates custom public events and holidays seamlessly.</li>
              </ul>
              <div className="h-[1px] bg-slate-800"></div>
              <p className="text-[10px] text-slate-400 font-sans italic">
                Active Depot selection is persistent and synced with live operations statistics.
              </p>
            </div>
            
            {/* Legend card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2 text-xs">
              <span className="font-bold text-slate-800">Roster Status Legend</span>
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-300"></span>Scheduled</span>
                  <span className="text-[10px] text-slate-400">Roster Locked</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>Active / Running</span>
                  <span className="text-[10px] text-slate-400">Live Track</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Delayed</span>
                  <span className="text-[10px] text-slate-400">Time Adjusting</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Completed</span>
                  <span className="text-[10px] text-slate-400">Logged</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Cancelled</span>
                  <span className="text-[10px] text-slate-400">Emergency Void</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Column: Daily Timetable Roster List */}
        <div className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 ${isAdding ? 'lg:col-span-7' : 'lg:col-span-8'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900">
              Roster Logs for <span className="text-emerald-600 font-mono text-xs">{selectedDate}</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">
              {activeSchedulesOnDate.length} Active Trips
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {activeSchedulesOnDate.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs italic space-y-2">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No dispatch schedules allocated on this date.</p>
                <button onClick={handleCreateNewScheduleClick} className="text-emerald-600 font-bold hover:underline">
                  Design one now
                </button>
              </div>
            ) : (
              activeSchedulesOnDate.map(sched => {
                const route = routes.find(r => r.id === sched.routeId);
                const bus = buses.find(b => b.id === sched.busId);
                const driver = drivers.find(d => d.id === sched.driverId);

                return (
                  <div
                    key={sched.id}
                    className={`p-4 border rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-3 transition-colors ${
                      sched.status === 'Completed' ? 'bg-slate-50 border-slate-200 text-slate-500' :
                      sched.status === 'Cancelled' ? 'bg-rose-50/50 border-rose-100 text-slate-400' :
                      sched.status === 'Active' ? 'bg-blue-50/10 border-blue-200' :
                      sched.status === 'Delayed' ? 'bg-amber-50/40 border-amber-200' :
                      'bg-white border-slate-200'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status badge */}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                          sched.status === 'Completed' ? 'bg-slate-200 text-slate-700' :
                          sched.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' :
                          sched.status === 'Active' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                          sched.status === 'Delayed' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {sched.status}
                        </span>

                        <span className="text-xs font-bold text-slate-900">
                          Route {route?.routeNumber || 'N/A'}: {route?.startLocation} ➔ {route?.endLocation}
                        </span>

                        {sched.notes?.includes('[Holiday') && (
                          <span className="bg-violet-100 text-violet-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                            Special Holiday
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-medium text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sched.departureTime} - {sched.arrivalTime}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BusIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono">{bus?.registrationNo || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{driver?.name || 'N/A'}</span>
                        </div>
                        {sched.delayMinutes > 0 && (
                          <div className="text-amber-600 font-bold">
                            Delayed: +{sched.delayMinutes} mins
                          </div>
                        )}
                      </div>

                      {sched.notes && (
                        <p className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded border border-slate-100/50 mt-1">
                          Notes: {sched.notes}
                        </p>
                      )}
                    </div>

                    {/* Quick status actions / editing */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => handleEditClick(sched)}
                        className="text-slate-600 hover:text-emerald-600 p-1.5 bg-slate-100 hover:bg-slate-200/50 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this scheduled run?')) {
                            onDeleteSchedule(sched.id);
                          }
                        }}
                        className="text-rose-600 hover:bg-rose-100/50 p-1.5 bg-rose-50 rounded-lg transition-colors"
                        title="Delete Run"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
