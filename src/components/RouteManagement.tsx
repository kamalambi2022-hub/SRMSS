import React, { useState } from 'react';
import { Route, Bus, Driver, Schedule } from '../types';
import {
  Plus,
  Trash2,
  Edit2,
  MapPin,
  Map as MapIcon,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Check,
  X,
  PlusCircle,
  HelpCircle
} from 'lucide-react';
import RouteMap from './maps/RouteMap';


interface RouteManagementProps {
  routes: Route[];
  buses: Bus[];
  drivers: Driver[];
  schedules: Schedule[];
  onAddRoute: (route: Route) => void;
  onUpdateRoute: (route: Route) => void;
  onDeleteRoute: (routeId: string) => void;
}

const SERVICE_TYPES: Route['serviceType'][] = ['Normal', 'Semi-Luxury', 'Luxury', 'Super-Luxury'];

export default function RouteManagement({
  routes,
  buses,
  drivers,
  schedules,
  onAddRoute,
  onUpdateRoute,
  onDeleteRoute
}: RouteManagementProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('All');

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  
  const [routeNumber, setRouteNumber] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [stopsString, setStopsString] = useState('');
  const [distanceKm, setDistanceKm] = useState<number>(50);
  const [serviceType, setServiceType] = useState<Route['serviceType']>('Normal');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(90);
  const [assignedBusId, setAssignedBusId] = useState('');
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Filter routes
  const filteredRoutes = routes.filter(r => {
    const matchesSearch = 
      r.routeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.startLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.endLocation.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesService = serviceFilter === 'All' || r.serviceType === serviceFilter;
    
    return matchesSearch && matchesService;
  });

  const handleEditClick = (route: Route) => {
    setEditingRouteId(route.id);
    setIsAdding(false);
    
    setRouteNumber(route.routeNumber);
    setStartLocation(route.startLocation);
    setEndLocation(route.endLocation);
    setStopsString(route.stops.join(', '));
    setDistanceKm(route.distanceKm);
    setServiceType(route.serviceType);
    setEstimatedDuration(route.estimatedDurationMinutes);
    setAssignedBusId(route.assignedBusId || '');
    setAssignedDriverId(route.assignedDriverId || '');
    setIsActive(route.isActive);
  };

  const resetForm = () => {
    setRouteNumber('');
    setStartLocation('');
    setEndLocation('');
    setStopsString('');
    setDistanceKm(50);
    setServiceType('Normal');
    setEstimatedDuration(90);
    setAssignedBusId('');
    setAssignedDriverId('');
    setIsActive(true);
    setIsAdding(false);
    setEditingRouteId(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeNumber || !startLocation || !endLocation) {
      alert('Please fill out all mandatory fields.');
      return;
    }

    const parsedStops = stopsString
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Auto-include start and end terminals if not listed
    if (!parsedStops.includes(startLocation)) parsedStops.unshift(startLocation);
    if (!parsedStops.includes(endLocation)) parsedStops.push(endLocation);

    const routeData: Route = {
      id: editingRouteId || `R-${Date.now()}`,
      routeNumber,
      startLocation,
      endLocation,
      stops: parsedStops,
      distanceKm: Number(distanceKm),
      serviceType,
      estimatedDurationMinutes: Number(estimatedDuration),
      assignedBusId: assignedBusId || undefined,
      assignedDriverId: assignedDriverId || undefined,
      isActive
    };

    if (editingRouteId) {
      onUpdateRoute(routeData);
    } else {
      onAddRoute(routeData);
    }

    resetForm();
  };

  const handleToggleActive = (route: Route) => {
    onUpdateRoute({
      ...route,
      isActive: !route.isActive
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="srmss-routes-panel">
      {/* Left panel: Form and Route Index */}
      <div className="xl:col-span-7 space-y-6">
        
        {/* Actions bar & search */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search route code or terminals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-sans"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
            <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2">
              <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="text-xs text-slate-700 bg-transparent py-2 pr-1 focus:outline-none font-medium"
              >
                <option value="All">All Services</option>
                {SERVICE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                if (isAdding) resetForm();
                else {
                  resetForm();
                  setIsAdding(true);
                }
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors font-sans"
            >
              {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isAdding ? 'Close Form' : 'New Route'}
            </button>
          </div>
        </div>

        {/* Add/Edit Route Form */}
        {(isAdding || editingRouteId) && (
          <form onSubmit={handleFormSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              {editingRouteId ? `Edit Route Corridor (${routeNumber})` : 'Design New Transit Corridor'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Route Designation Code *</label>
                <input
                  type="text"
                  placeholder="e.g. 01, 138, EX-02"
                  value={routeNumber}
                  onChange={(e) => setRouteNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Service Category</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as Route['serviceType'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {SERVICE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Starting Terminal *</label>
                <input
                  type="text"
                  placeholder="e.g. Colombo, Galle"
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Ending Destination Terminal *</label>
                <input
                  type="text"
                  placeholder="e.g. Kandy, Jaffna"
                  value={endLocation}
                  onChange={(e) => setEndLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex justify-between">
                <span>Intermediate Stops (Transit Hubs)</span>
                <span className="text-slate-400 font-normal normal-case">Separated by comma</span>
              </label>
              <textarea
                placeholder="e.g. Kadawatha, Warakapola, Kegalle"
                value={stopsString}
                onChange={(e) => setStopsString(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 h-16 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Total Distance (Kilometers)</label>
                <input
                  type="number"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  min="1"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Estimated Travel Duration (Mins)</label>
                <input
                  type="number"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  min="5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Default Assigned Coach</label>
                <select
                  value={assignedBusId}
                  onChange={(e) => setAssignedBusId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Select Coach --</option>
                  {buses.map(b => (
                    <option key={b.id} value={b.id}>{b.registrationNo} ({b.model} - {b.capacity}S)</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Default Assigned Driver</label>
                <select
                  value={assignedDriverId}
                  onChange={(e) => setAssignedDriverId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Select Driver --</option>
                  {drivers.filter(d => d.status === 'Available').map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.employeeId})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isRouteActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
              />
              <label htmlFor="isRouteActive" className="text-xs font-semibold text-slate-700 select-none">
                Active Operational Status (Available for scheduling dispatch)
              </label>
            </div>

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
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
              >
                {editingRouteId ? 'Save Edits' : 'Deploy Route'}
              </button>
            </div>
          </form>
        )}

        {/* Route Database List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Configured Transit Corridors</h3>
          
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
            {filteredRoutes.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic">
                No route listings match the criteria.
              </div>
            ) : (
              filteredRoutes.map(route => {
                const isSelected = selectedRouteId === route.id;
                const bus = buses.find(b => b.id === route.assignedBusId);
                const driver = drivers.find(d => d.id === route.assignedDriverId);
                const activeTripsCount = schedules.filter(s => s.routeId === route.id && s.status === 'Active').length;

                return (
                  <div
                    key={route.id}
                    className={`py-4 flex flex-col md:flex-row justify-between md:items-center gap-3 transition-colors rounded-xl px-3 -mx-2 cursor-pointer ${
                      isSelected ? 'bg-slate-50 border-l-4 border-emerald-500 pl-2' : 'hover:bg-slate-50/50'
                    }`}
                    onClick={() => setSelectedRouteId(isSelected ? null : route.id)}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 text-white font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                          Route {route.routeNumber}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          {route.startLocation} ➔ {route.endLocation}
                        </h4>
                        
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                          route.serviceType === 'Normal' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          route.serviceType === 'Semi-Luxury' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          route.serviceType === 'Luxury' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-violet-50 text-violet-700 border border-violet-100'
                        }`}>
                          {route.serviceType}
                        </span>
                      </div>

                      {/* Stops timeline preview */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {route.stops.map((stop, i) => (
                          <span key={i} className="flex items-center">
                            <span className="font-medium text-slate-600 hover:text-slate-900">{stop}</span>
                            {i < route.stops.length - 1 && <span className="mx-1 text-slate-300">➔</span>}
                          </span>
                        ))}
                      </div>

                      {/* Fleet summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1.5 text-[10px] text-slate-500 font-medium">
                        <div>
                          Distance: <span className="font-bold text-slate-700 font-mono">{route.distanceKm} km</span>
                        </div>
                        <div>
                          Est. Duration: <span className="font-bold text-slate-700 font-mono">{route.estimatedDurationMinutes} mins</span>
                        </div>
                        <div>
                          Status:{' '}
                          <span className={`font-bold ${route.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {route.isActive ? 'Operational' : 'Suspended'}
                          </span>
                        </div>
                      </div>

                      {/* Default assigned team */}
                      <div className="flex gap-4 pt-1.5 text-[10px]">
                        <span className="text-slate-400">
                          Coach:{' '}
                          <span className="font-semibold text-slate-700">
                            {bus ? `${bus.registrationNo} (${bus.model})` : 'Unassigned'}
                          </span>
                        </span>
                        <span className="text-slate-400">
                          Driver:{' '}
                          <span className="font-semibold text-slate-700">
                            {driver ? driver.name : 'Unassigned'}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Operational Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleActive(route)}
                        title={route.isActive ? 'Suspend Route' : 'Activate Route'}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          route.isActive 
                            ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100 text-emerald-600' 
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-400'
                        }`}
                      >
                        {route.isActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleEditClick(route)}
                        title="Edit Configuration"
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (activeTripsCount > 0) {
                            alert('Cannot delete this corridor: There are currently active schedules running on it.');
                          } else if (confirm(`Are you sure you want to completely retire Route ${route.routeNumber}?`)) {
                            onDeleteRoute(route.id);
                            if (selectedRouteId === route.id) setSelectedRouteId(null);
                          }
                        }}
                        title="Retire Corridor"
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right panel: Route visual overview map */}
      <div className="xl:col-span-5 flex flex-col h-full space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <MapIcon className="w-4 h-4 text-emerald-500" />
            Interactive Corridor Tracker
          </h3>
          <p className="text-xs text-slate-500">
            Click on any route or stop in the system to view corridors and monitor live coaches.
          </p>
        </div>

        <div className="flex-1 min-h-[460px]">
          <RouteMap
            routes={routes}
            buses={buses}
            drivers={drivers}
            schedules={schedules}
            selectedRouteId={selectedRouteId}
            onSelectRoute={(id) => setSelectedRouteId(id)}
          />

        </div>
      </div>
    </div>
  );
}
