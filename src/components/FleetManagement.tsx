import React, { useState, useMemo } from 'react';
import { Bus, MaintenanceLog } from '../types';
import {
  Plus,
  Bus as BusIcon,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Gauge,
  Calendar,
  X,
  Shield,
  FileText,
  Trash2
} from 'lucide-react';

interface FleetManagementProps {
  buses: Bus[];
  maintenanceLogs: MaintenanceLog[];
  onAddBus: (bus: Bus) => void;
  onUpdateBus: (bus: Bus) => void;
  onDeleteBus: (busId: string) => void;
}

const MANUFACTURERS = ['Ashok Leyland', 'Isuzu', 'Volvo', 'King Long', 'Tata', 'Mitsubishi'];
const STATUS_OPTIONS: Bus['status'][] = ['Available', 'On Route', 'Under Maintenance', 'Inactive'];

export default function FleetManagement({
  buses,
  maintenanceLogs,
  onAddBus,
  onUpdateBus,
  onDeleteBus
}: FleetManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Form view states
  const [isAdding, setIsAdding] = useState(false);
  const [editingBusId, setEditingBusId] = useState<string | null>(null);

  // Form Fields
  const [registrationNo, setRegistrationNo] = useState('');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('Ashok Leyland');
  const [capacity, setCapacity] = useState<number>(54);
  const [fuelType, setFuelType] = useState<Bus['fuelType']>('Diesel');
  const [currentMileageKm, setCurrentMileageKm] = useState<number>(100000);
  const [status, setStatus] = useState<Bus['status']>('Available');
  const [fitnessCertificateExpiry, setFitnessCertificateExpiry] = useState('2027-01-01');
  const [insuranceExpiry, setInsuranceExpiry] = useState('2027-01-01');
  const [assignedDepot, setAssignedDepot] = useState('Colombo Central Depot');

  // Active bus detail modal
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);

  // Expiry Checker
  const checkExpiryStatus = (dateStr: string) => {
    const today = new Date('2026-07-01');
    const target = new Date(dateStr);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: 'Expired' as const, days: Math.abs(diffDays) };
    if (diffDays <= 45) return { status: 'Urgent' as const, days: diffDays };
    if (diffDays <= 90) return { status: 'Warning' as const, days: diffDays };
    return { status: 'Safe' as const, days: diffDays };
  };

  const filteredBuses = useMemo(() => {
    return buses.filter(b => {
      const matchesSearch = 
        b.registrationNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.manufacturer.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [buses, searchQuery, statusFilter]);

  const handleEditClick = (bus: Bus, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBusId(bus.id);
    setIsAdding(true);
    
    setRegistrationNo(bus.registrationNo);
    setModel(bus.model);
    setManufacturer(bus.manufacturer);
    setCapacity(bus.capacity);
    setFuelType(bus.fuelType);
    setCurrentMileageKm(bus.currentMileageKm);
    setStatus(bus.status);
    setFitnessCertificateExpiry(bus.fitnessCertificateExpiry);
    setInsuranceExpiry(bus.insuranceExpiry);
    setAssignedDepot(bus.assignedDepot);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingBusId(null);
    setRegistrationNo('');
    setModel('');
    setManufacturer('Ashok Leyland');
    setCapacity(54);
    setFuelType('Diesel');
    setCurrentMileageKm(100000);
    setStatus('Available');
    setFitnessCertificateExpiry('2027-01-01');
    setInsuranceExpiry('2027-01-01');
    setAssignedDepot('Colombo Central Depot');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationNo || !model) {
      alert('Please fill out all mandatory fields.');
      return;
    }

    const busData: Bus = {
      id: editingBusId || `B-${Date.now()}`,
      registrationNo,
      model,
      manufacturer,
      capacity: Number(capacity),
      fuelType,
      currentMileageKm: Number(currentMileageKm),
      status,
      fitnessCertificateExpiry,
      insuranceExpiry,
      assignedDepot
    };

    if (editingBusId) {
      onUpdateBus(busData);
    } else {
      onAddBus(busData);
    }

    resetForm();
  };

  return (
    <div className="space-y-6" id="srmss-fleet-panel">
      {/* Search & Filter bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search registration or vehicle spec..."
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
              <option value="All">All Statuses</option>
              {STATUS_OPTIONS.map(s => (
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
            {isAdding ? 'Close Form' : 'Register Vehicle'}
          </button>
        </div>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form or detailed metrics panel */}
        {(isAdding || editingBusId) ? (
          <form onSubmit={handleFormSubmit} className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 h-fit animate-fadeIn">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              {editingBusId ? `Edit Vehicle Profile (${registrationNo})` : 'Register New Fleet Asset'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Registration No *</label>
                <input
                  type="text"
                  placeholder="e.g. WP ND-4567"
                  value={registrationNo}
                  onChange={(e) => setRegistrationNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Manufacturer *</label>
                <select
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                >
                  {MANUFACTURERS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Model Specification *</label>
                <input
                  type="text"
                  placeholder="e.g. Viking, B11R"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Seating Capacity</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  min="10"
                  max="100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Fuel Type</label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value as Bus['fuelType'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="Diesel">Diesel</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Electric">Electric</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Current Mileage (km)</label>
                <input
                  type="number"
                  value={currentMileageKm}
                  onChange={(e) => setCurrentMileageKm(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Fitness Cert Expiry *</label>
                <input
                  type="date"
                  value={fitnessCertificateExpiry}
                  onChange={(e) => setFitnessCertificateExpiry(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Insurance Policy Expiry *</label>
                <input
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Asset Depot Station</label>
                <input
                  type="text"
                  value={assignedDepot}
                  onChange={(e) => setAssignedDepot(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Vehicle Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Bus['status'])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
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
                {editingBusId ? 'Save Profile' : 'Deploy Coach'}
              </button>
            </div>
          </form>
        ) : (
          <div className="lg:col-span-4 space-y-4">
            {/* Quick Metrics */}
            <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-sans">Depot Fleet Roster Health</span>
              <div className="h-[1px] bg-slate-800"></div>
              
              <div className="space-y-2 text-xs font-sans">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Available Coaches:</span>
                  <span className="font-bold text-emerald-400 font-mono">{buses.filter(b => b.status === 'Available').length}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Active Dispatches:</span>
                  <span className="font-bold text-blue-400 font-mono">{buses.filter(b => b.status === 'On Route').length}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>In Service Bay:</span>
                  <span className="font-bold text-amber-400 font-mono">{buses.filter(b => b.status === 'Under Maintenance').length}</span>
                </div>
              </div>
            </div>

            {/* Selected Bus detail panel */}
            {selectedBus && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 font-mono">{selectedBus.manufacturer}</span>
                    <h4 className="text-sm font-bold text-slate-900">{selectedBus.registrationNo}</h4>
                  </div>
                  <button onClick={() => setSelectedBus(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs divide-y divide-slate-100">
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Model:</span>
                    <span className="font-semibold text-slate-800">{selectedBus.model}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Mileage Log:</span>
                    <span className="font-semibold text-slate-800 font-mono">{selectedBus.currentMileageKm.toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Coaching Capacity:</span>
                    <span className="font-semibold text-slate-800">{selectedBus.capacity} Seats</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Fuel Grade:</span>
                    <span className="font-semibold text-slate-800">{selectedBus.fuelType}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Depot Hub:</span>
                    <span className="font-semibold text-slate-800">{selectedBus.assignedDepot}</span>
                  </div>
                </div>

                {/* Sub-maintenance log list */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-amber-500" />
                    Service Records
                  </span>
                  <div className="space-y-1.5 text-[11px] max-h-[120px] overflow-y-auto">
                    {maintenanceLogs.filter(log => log.busId === selectedBus.id).length === 0 ? (
                      <span className="text-slate-400 italic">No maintenance history recorded yet.</span>
                    ) : (
                      maintenanceLogs.filter(log => log.busId === selectedBus.id).map(log => (
                        <div key={log.id} className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span>{log.type}</span>
                            <span className="font-mono text-emerald-600">LKR {log.cost.toLocaleString()}</span>
                          </div>
                          <p className="text-slate-500 text-[10px] leading-relaxed mt-0.5">{log.description}</p>
                          <span className="text-[9px] text-slate-400 mt-1 block">{log.date}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right Column: Fleet Grid index */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isAdding ? 'lg:col-span-7' : 'lg:col-span-8'}`}>
          {filteredBuses.map(bus => {
            const fitStatus = checkExpiryStatus(bus.fitnessCertificateExpiry);
            const insStatus = checkExpiryStatus(bus.insuranceExpiry);
            const isSelected = selectedBus?.id === bus.id;

            return (
              <div
                key={bus.id}
                onClick={() => setSelectedBus(bus)}
                className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected ? 'border-2 border-emerald-500 ring-2 ring-emerald-50/50' : 'border-slate-200'
                }`}
              >
                {/* Status indicator pill top-right */}
                <div className="absolute top-4 right-4">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    bus.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    bus.status === 'On Route' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    bus.status === 'Under Maintenance' ? 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse' :
                    'bg-slate-50 text-slate-700 border border-slate-100'
                  }`}>
                    {bus.status}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-700">
                      <BusIcon className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">{bus.manufacturer}</span>
                      <h4 className="text-xs font-bold text-slate-900">{bus.registrationNo}</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-500 pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-slate-400 font-mono" />
                      <span>{bus.currentMileageKm.toLocaleString()} km</span>
                    </div>
                    <div>
                      Capacity: <span className="text-slate-800">{bus.capacity} seats</span>
                    </div>
                  </div>

                  {/* CERTIFICATE ALERTS EXPIRY */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-50 text-[10px]">
                    {/* Fitness expiry */}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400 font-medium">
                        <FileText className="w-3.5 h-3.5" /> Fitness Certificate:
                      </span>
                      {fitStatus.status === 'Expired' ? (
                        <span className="bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded animate-pulse">
                          EXPIRED {fitStatus.days} DAYS AGO
                        </span>
                      ) : fitStatus.status === 'Urgent' || fitStatus.status === 'Warning' ? (
                        <span className="bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Expiring: {fitStatus.days} days
                        </span>
                      ) : (
                        <span className="text-slate-700 font-semibold">{bus.fitnessCertificateExpiry}</span>
                      )}
                    </div>

                    {/* Insurance expiry */}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400 font-medium">
                        <Shield className="w-3.5 h-3.5" /> Insurance:
                      </span>
                      {insStatus.status === 'Expired' ? (
                        <span className="bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded">
                          EXPIRED
                        </span>
                      ) : insStatus.status === 'Urgent' || insStatus.status === 'Warning' ? (
                        <span className="bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">
                          Expiring: {insStatus.days} days
                        </span>
                      ) : (
                        <span className="text-slate-700 font-semibold">{bus.insuranceExpiry}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-3" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleEditClick(bus, e)}
                    className="text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/50 px-2.5 py-1 rounded-lg"
                  >
                    Edit Spec
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Retire vehicle ${bus.registrationNo} completely from depot roster?`)) {
                        onDeleteBus(bus.id);
                        if (selectedBus?.id === bus.id) setSelectedBus(null);
                      }
                    }}
                    className="p-1 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-colors"
                    title="Retire Asset"
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
