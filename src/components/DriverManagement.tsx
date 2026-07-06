import React, { useState, useMemo } from 'react';
import { Driver, Route, Schedule } from '../types';
import {
  Search,
  Filter,
  Plus,
  User,
  Star,
  Calendar,
  Clock,
  Phone,
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  MapPin,
  Trash2
} from 'lucide-react';

interface DriverManagementProps {
  drivers: Driver[];
  routes: Route[];
  schedules: Schedule[];
  onAddDriver: (driver: Driver) => void;
  onUpdateDriver: (driver: Driver) => void;
  onDeleteDriver: (driverId: string) => void;
}

const EMPLOYMENT_STATUSES: Driver['employmentStatus'][] = ['Permanent', 'Contract'];
const DRIVER_STATUSES: Driver['status'][] = ['Available', 'On Duty', 'On Leave', 'Suspended'];

export default function DriverManagement({
  drivers,
  routes,
  schedules,
  onAddDriver,
  onUpdateDriver,
  onDeleteDriver
}: DriverManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form states
  const [isAdding, setIsAdding] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('2027-01-01');
  const [status, setStatus] = useState<Driver['status']>('Available');
  const [employmentStatus, setEmploymentStatus] = useState<Driver['employmentStatus']>('Permanent');
  const [totalHoursLogged, setTotalHoursLogged] = useState<number>(0);
  const [performanceRating, setPerformanceRating] = useState<number>(5);

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Expiry scanner
  const checkLicenseExpiry = (expiryDateStr: string) => {
    const today = new Date('2026-07-01');
    const target = new Date(expiryDateStr);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: 'Expired' as const, days: Math.abs(diffDays) };
    if (diffDays <= 45) return { status: 'Urgent' as const, days: diffDays };
    if (diffDays <= 90) return { status: 'Warning' as const, days: diffDays };
    return { status: 'OK' as const, days: diffDays };
  };

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const matchesSearch = 
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.licenseNo.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [drivers, searchQuery, statusFilter]);

  const handleEditClick = (driver: Driver, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDriverId(driver.id);
    setIsAdding(true);
    
    setEmployeeId(driver.employeeId);
    setName(driver.name);
    setContact(driver.contact);
    setLicenseNo(driver.licenseNo);
    setLicenseExpiry(driver.licenseExpiry);
    setStatus(driver.status);
    setEmploymentStatus(driver.employmentStatus);
    setTotalHoursLogged(driver.totalHoursLogged);
    setPerformanceRating(driver.performanceRating);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingDriverId(null);
    setEmployeeId('');
    setName('');
    setContact('');
    setLicenseNo('');
    setLicenseExpiry('2027-01-01');
    setStatus('Available');
    setEmploymentStatus('Permanent');
    setTotalHoursLogged(0);
    setPerformanceRating(5);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !name || !licenseNo) {
      alert('Please fill out all mandatory fields.');
      return;
    }

    const driverData: Driver = {
      id: editingDriverId || `D-${Date.now()}`,
      employeeId,
      name,
      contact,
      licenseNo,
      licenseExpiry,
      status,
      employmentStatus,
      totalHoursLogged: Number(totalHoursLogged),
      performanceRating: Number(performanceRating)
    };

    if (editingDriverId) {
      onUpdateDriver(driverData);
    } else {
      onAddDriver(driverData);
    }

    resetForm();
  };

  return (
    <div className="space-y-6" id="srmss-drivers-panel">
      {/* Search and Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search driver name, employee ID, license..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
          <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs text-slate-700 bg-transparent py-2 pr-1 focus:outline-none font-semibold"
            >
              <option value="All">All Roster Statuses</option>
              {DRIVER_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
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
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Close Form' : 'Enlist Driver'}
          </button>
        </div>
      </div>

      {/* Grid deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Add/Edit form or stats card */}
        {(isAdding || editingDriverId) ? (
          <form onSubmit={handleSubmit} className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 h-fit animate-fadeIn">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              {editingDriverId ? `Modify Driver Credentials (${employeeId})` : 'Register Professional Operator'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Employee ID *</label>
                <input
                  type="text"
                  placeholder="e.g. EMP-101"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Operator Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Priyantha Perera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Contact Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +94 77 123 4567"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Employment status</label>
                <select
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value as Driver['employmentStatus'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                >
                  {EMPLOYMENT_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">SL Heavy License No *</label>
                <input
                  type="text"
                  placeholder="e.g. SL-DL-987123"
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">License Expiry Date *</label>
                <input
                  type="date"
                  value={licenseExpiry}
                  onChange={(e) => setLicenseExpiry(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Total Hours Logged</label>
                <input
                  type="number"
                  value={totalHoursLogged}
                  onChange={(e) => setTotalHoursLogged(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  min="0"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Quality Rating (1-5)</label>
                <input
                  type="number"
                  value={performanceRating}
                  onChange={(e) => setPerformanceRating(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  min="1"
                  max="5"
                  step="0.1"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Roster Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Driver['status'])}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              >
                {DRIVER_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
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
                {editingDriverId ? 'Save Edits' : 'Enlist Driver'}
              </button>
            </div>
          </form>
        ) : (
          <div className="lg:col-span-4 space-y-4">
            {/* Quick Analytics */}
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-sm space-y-3.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-sans">Operator roster Diagnostics</span>
              <div className="h-[1px] bg-slate-800"></div>

              <div className="space-y-2 text-xs font-sans">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Available Standby Drivers:</span>
                  <span className="font-bold text-emerald-400 font-mono">{drivers.filter(d => d.status === 'Available').length}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Currently On Duty:</span>
                  <span className="font-bold text-blue-400 font-mono">{drivers.filter(d => d.status === 'On Duty').length}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>On Approved Leave:</span>
                  <span className="font-bold text-amber-400 font-mono">{drivers.filter(d => d.status === 'On Leave').length}</span>
                </div>
              </div>
            </div>

            {/* Selected Driver detail panel */}
            {selectedDriver && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2.5 items-center">
                    <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 text-slate-600">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">{selectedDriver.employeeId}</span>
                      <h4 className="text-sm font-bold text-slate-900">{selectedDriver.name}</h4>
                    </div>
                  </div>
                  <button onClick={() => setSelectedDriver(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs divide-y divide-slate-100">
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Heavy Licence No:</span>
                    <span className="font-semibold text-slate-800 font-mono">{selectedDriver.licenseNo}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Contact Number:</span>
                    <span className="font-semibold text-slate-800">{selectedDriver.contact}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Shift Hours Logged:</span>
                    <span className="font-semibold text-slate-800 font-mono">{selectedDriver.totalHoursLogged} hours</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Contract Grade:</span>
                    <span className="font-semibold text-slate-800">{selectedDriver.employmentStatus}</span>
                  </div>
                  <div className="flex justify-between py-1.5 items-center">
                    <span className="text-slate-500">Driver Score:</span>
                    <div className="flex items-center gap-0.5 text-amber-500 font-bold font-mono">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      {selectedDriver.performanceRating}
                    </div>
                  </div>
                </div>

                {/* Logged today schedules */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    Today's Dispatch Roster
                  </span>
                  <div className="space-y-1.5 text-[11px] max-h-[120px] overflow-y-auto">
                    {schedules.filter(s => s.driverId === selectedDriver.id && s.date === '2026-07-01').length === 0 ? (
                      <span className="text-slate-400 italic">No schedules allocated for today.</span>
                    ) : (
                      schedules.filter(s => s.driverId === selectedDriver.id && s.date === '2026-07-01').map(s => {
                        const r = routes.find(rt => rt.id === s.routeId);
                        return (
                          <div key={s.id} className="p-2 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                            <div>
                              <span className="font-bold text-slate-800">Route {r?.routeNumber}</span>
                              <p className="text-[10px] text-slate-500">{s.departureTime} departure</p>
                            </div>
                            <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded uppercase">
                              {s.status}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right column: Drivers index grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isAdding ? 'lg:col-span-7' : 'lg:col-span-8'}`}>
          {filteredDrivers.map(driver => {
            const licStatus = checkLicenseExpiry(driver.licenseExpiry);
            const isSelected = selectedDriver?.id === driver.id;

            return (
              <div
                key={driver.id}
                onClick={() => setSelectedDriver(driver)}
                className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected ? 'border-2 border-emerald-500 ring-2 ring-emerald-50/50' : 'border-slate-200'
                }`}
              >
                {/* Roster status indicator pill */}
                <div className="absolute top-4 right-4">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    driver.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    driver.status === 'On Duty' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    driver.status === 'On Leave' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                    'bg-slate-50 text-slate-700 border border-slate-100'
                  }`}>
                    {driver.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-700">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">{driver.employeeId} ({driver.employmentStatus})</span>
                      <h4 className="text-xs font-bold text-slate-900">{driver.name}</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-500 pt-2 border-t border-slate-5 */">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{driver.contact || 'No phone'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-500 font-bold font-mono">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      {driver.performanceRating} rating
                    </div>
                  </div>

                  {/* LICENSE EXPIRY ALERTS IN PAGES */}
                  <div className="pt-2.5 border-t border-slate-50 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400 font-semibold">
                        <FileText className="w-3.5 h-3.5" /> Sri Lankan heavy licence:
                      </span>
                      {licStatus.status === 'Expired' ? (
                        <span className="bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded animate-pulse">
                          EXPIRED {licStatus.days} DAYS AGO
                        </span>
                      ) : licStatus.status === 'Urgent' || licStatus.status === 'Warning' ? (
                        <span className="bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Expiry: {licStatus.days} days
                        </span>
                      ) : (
                        <span className="text-slate-700 font-semibold">{driver.licenseExpiry}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-3" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleEditClick(driver, e)}
                    className="text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/50 px-2.5 py-1 rounded-lg"
                  >
                    Edit Credentials
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Completely remove operator ${driver.name} from depot credentials database?`)) {
                        onDeleteDriver(driver.id);
                        if (selectedDriver?.id === driver.id) setSelectedDriver(null);
                      }
                    }}
                    className="p-1 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-colors"
                    title="Remove Operator"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
