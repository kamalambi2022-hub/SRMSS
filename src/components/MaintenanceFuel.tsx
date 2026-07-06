import React, { useState, useMemo } from 'react';
import { Bus, MaintenanceLog, FuelLog, Driver } from '../types';
import {
  Wrench,
  Gauge,
  Fuel,
  Plus,
  Trash2,
  AlertTriangle,
  Calendar,
  DollarSign,
  TrendingUp,
  BarChart,
  X,
  FileSpreadsheet
} from 'lucide-react';

interface MaintenanceFuelProps {
  buses: Bus[];
  drivers: Driver[];
  maintenanceLogs: MaintenanceLog[];
  fuelLogs: FuelLog[];
  onAddMaintenance: (log: MaintenanceLog) => void;
  onAddFuel: (log: FuelLog) => void;
  onDeleteMaintenance: (logId: string) => void;
  onDeleteFuel: (logId: string) => void;
}

export default function MaintenanceFuel({
  buses,
  drivers,
  maintenanceLogs,
  fuelLogs,
  onAddMaintenance,
  onAddFuel,
  onDeleteMaintenance,
  onDeleteFuel
}: MaintenanceFuelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'maintenance' | 'fuel'>('maintenance');

  // Form states - Maintenance
  const [isAddingMaint, setIsAddingMaint] = useState(false);
  const [maintBusId, setMaintBusId] = useState('');
  const [maintType, setMaintType] = useState<'Preventive' | 'Corrective'>('Preventive');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintCost, setMaintCost] = useState<number>(15000);
  const [maintDate, setMaintDate] = useState('2026-07-01');
  const [maintMileage, setMaintMileage] = useState<number>(120000);
  const [maintNextDate, setMaintNextDate] = useState('2026-10-01');

  // Form states - Fuel
  const [isAddingFuel, setIsAddingFuel] = useState(false);
  const [fuelBusId, setFuelBusId] = useState('');
  const [fuelDriverId, setFuelDriverId] = useState('');
  const [fuelLiters, setFuelLiters] = useState<number>(50);
  const [fuelCost, setFuelCost] = useState<number>(17150); // diesel baseline LKR 343/l
  const [fuelMileage, setFuelMileage] = useState<number>(100000);
  const [fuelDate, setFuelDate] = useState('2026-07-01');

  // Summary statistics
  const summary = useMemo(() => {
    const totalMaintCost = maintenanceLogs.reduce((acc, curr) => acc + curr.cost, 0);
    const totalFuelCost = fuelLogs.reduce((acc, curr) => acc + curr.cost, 0);
    const totalFuelLiters = fuelLogs.reduce((acc, curr) => acc + curr.liters, 0);
    
    const avgFuelEfficiency = fuelLogs.length > 0 
      ? Number((fuelLogs.reduce((acc, curr) => acc + curr.efficiencyKmpl, 0) / fuelLogs.length).toFixed(2))
      : 0;

    return {
      totalMaintCost,
      totalFuelCost,
      totalFuelLiters,
      avgFuelEfficiency
    };
  }, [maintenanceLogs, fuelLogs]);

  // Handle Maintenance logging
  const handleMaintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintBusId || !maintDesc) {
      alert('Please select a vehicle and enter a description.');
      return;
    }

    const log: MaintenanceLog = {
      id: `M-${Date.now()}`,
      busId: maintBusId,
      type: maintType,
      description: maintDesc,
      cost: Number(maintCost),
      date: maintDate,
      mileageAtService: Number(maintMileage),
      nextServiceDate: maintNextDate
    };

    onAddMaintenance(log);
    
    // Close & Reset
    setIsAddingMaint(false);
    setMaintBusId('');
    setMaintDesc('');
    setMaintCost(15000);
    setMaintMileage(120000);
  };

  // Handle Fuel logging
  const handleFuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelBusId || !fuelDriverId) {
      alert('Please fill out all mandatory fields.');
      return;
    }

    // Standard LKR 343 per liter baseline. If custom fuel cost is provided, we respect that.
    const selectedBus = buses.find(b => b.id === fuelBusId);
    
    // Calculate simulated or basic efficiency: normal heavy vehicle is around 3.8 to 5.4 km/l
    let calculatedEfficiency = 3.8;
    if (selectedBus) {
      const lastFuelFill = fuelLogs
        .filter(f => f.busId === fuelBusId)
        .sort((a,b) => b.date.localeCompare(a.date))[0];
      
      if (lastFuelFill && fuelMileage > lastFuelFill.mileageAtFill) {
        const diffMileage = fuelMileage - lastFuelFill.mileageAtFill;
        calculatedEfficiency = Number((diffMileage / fuelLiters).toFixed(2));
        // Clamp to realistic bounds for heavy commercial passenger vehicle
        if (calculatedEfficiency > 12) calculatedEfficiency = 5.2;
        if (calculatedEfficiency < 2) calculatedEfficiency = 3.5;
      } else {
        // Fallback baseline according to manufacturer
        calculatedEfficiency = selectedBus.fuelType === 'Electric' ? 8.5 : selectedBus.manufacturer === 'Isuzu' ? 5.2 : 3.8;
      }
    }

    const log: FuelLog = {
      id: `F-${Date.now()}`,
      busId: fuelBusId,
      driverId: fuelDriverId,
      liters: Number(fuelLiters),
      cost: Number(fuelCost),
      mileageAtFill: Number(fuelMileage),
      efficiencyKmpl: calculatedEfficiency,
      date: fuelDate
    };

    onAddFuel(log);

    // Close & Reset
    setIsAddingFuel(false);
    setFuelBusId('');
    setFuelDriverId('');
    setFuelLiters(50);
    setFuelCost(17150);
    setFuelMileage(100000);
  };

  // Quick auto-adjust fuel cost when liters changes (using diesel approx cost LKR 343)
  const handleLitersChange = (litersVal: number) => {
    setFuelLiters(litersVal);
    setFuelCost(Math.round(litersVal * 343));
  };

  return (
    <div className="space-y-6" id="srmss-maintenance-panel">
      {/* Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Refueling Expenses</span>
            <div className="text-2xl font-bold text-slate-950">LKR {summary.totalFuelCost.toLocaleString()}</div>
            <p className="text-[10px] text-slate-400">Total logged diesel & energy cost</p>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 text-emerald-600">
            <Fuel className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fleet Service Expenses</span>
            <div className="text-2xl font-bold text-slate-950">LKR {summary.totalMaintCost.toLocaleString()}</div>
            <p className="text-[10px] text-slate-400">Total preventive & corrective cost</p>
          </div>
          <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100 text-blue-600">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Fuel Efficiency</span>
            <div className="flex items-baseline gap-1.5">
              <div className="text-2xl font-bold text-slate-950">{summary.avgFuelEfficiency}</div>
              <span className="text-xs text-slate-400">km/L</span>
            </div>
            <p className="text-[10px] text-slate-400">Standard Leyland Viking runs ~3.8 km/L</p>
          </div>
          <div className="bg-violet-50 p-2.5 rounded-xl border border-violet-100 text-violet-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Fuel Volume</span>
            <div className="flex items-baseline gap-1.5">
              <div className="text-2xl font-bold text-slate-950">{summary.totalFuelLiters}</div>
              <span className="text-xs text-slate-400">Liters</span>
            </div>
            <p className="text-[10px] text-slate-400">Bulk depot fueling log capacity</p>
          </div>
          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100 text-amber-600">
            <BarChart className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        <button
          onClick={() => setActiveSubTab('maintenance')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeSubTab === 'maintenance'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Workshop & Repair Bay ({maintenanceLogs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('fuel')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeSubTab === 'fuel'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Fuel Logbook & Efficiency ({fuelLogs.length})
        </button>
      </div>

      {/* Workshop Module */}
      {activeSubTab === 'maintenance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Add maint form / details */}
          <div className="lg:col-span-5 space-y-4">
            {isAddingMaint ? (
              <form onSubmit={handleMaintSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-950 flex items-center gap-1.5 uppercase">
                    <Wrench className="w-4 h-4 text-emerald-500" />
                    Log Maintenance Service
                  </h3>
                  <button type="button" onClick={() => setIsAddingMaint(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Target Coach *</label>
                  <select
                    value={maintBusId}
                    onChange={(e) => setMaintBusId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50"
                    required
                  >
                    <option value="">-- Choose Coach --</option>
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>{b.registrationNo} ({b.manufacturer} - {b.model})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Service Category</label>
                    <select
                      value={maintType}
                      onChange={(e) => setMaintType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="Preventive">Preventive Maintenance</option>
                      <option value="Corrective">Corrective Maintenance (Repair)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Service Cost (LKR) *</label>
                    <input
                      type="number"
                      value={maintCost}
                      onChange={(e) => setMaintCost(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Service Date *</label>
                    <input
                      type="date"
                      value={maintDate}
                      onChange={(e) => setMaintDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Next Scheduled Service *</label>
                    <input
                      type="date"
                      value={maintNextDate}
                      onChange={(e) => setMaintNextDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Odometer Reading (km)</label>
                  <input
                    type="number"
                    value={maintMileage}
                    onChange={(e) => setMaintMileage(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    min="0"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Repairs & Tasks Completed *</label>
                  <textarea
                    placeholder="e.g. Replaced worn front brake linings, topped up engine coolant, fixed radiator fan leaf"
                    value={maintDesc}
                    onChange={(e) => setMaintDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs h-16 resize-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingMaint(false)}
                    className="px-3.5 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                  >
                    Commit Record
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-sans flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" /> Upcoming Service Reminders
                </span>
                <div className="h-[1px] bg-slate-800"></div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto text-xs pr-1">
                  {maintenanceLogs.map(log => {
                    const bus = buses.find(b => b.id === log.busId);
                    return (
                      <div key={log.id} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex justify-between items-center">
                        <div className="space-y-1">
                          <span className="text-slate-400 font-mono font-bold">{bus?.registrationNo || 'N/A'}</span>
                          <p className="text-slate-300 font-medium">Next service scheduled:</p>
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/40">
                            {log.nextServiceDate}
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-500 font-semibold uppercase">{log.type}</span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setIsAddingMaint(true)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors text-center block"
                >
                  Schedule/Log Workshop Entry
                </button>
              </div>
            )}
          </div>

          {/* Service record table log */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Historical Workshop Entries</h3>
            
            <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto pr-1 text-xs">
              {maintenanceLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 italic">No workshop entries recorded in logs.</div>
              ) : (
                maintenanceLogs.map(log => {
                  const bus = buses.find(b => b.id === log.busId);
                  return (
                    <div key={log.id} className="py-3 flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-900 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded">
                            {bus?.registrationNo || 'N/A'}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            log.type === 'Preventive' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {log.type}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800">{log.description}</p>
                        <div className="flex gap-4 text-[10px] text-slate-400 pt-0.5">
                          <span>Mileage: {log.mileageAtService.toLocaleString()} km</span>
                          <span>Completed: {log.date}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          LKR {log.cost.toLocaleString()}
                        </span>
                        <button
                          onClick={() => {
                            if (confirm('Delete this maintenance record permanently from history?')) {
                              onDeleteMaintenance(log.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg"
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
      )}

      {/* Fuel Module */}
      {activeSubTab === 'fuel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Add fuel form */}
          <div className="lg:col-span-5 space-y-4">
            {isAddingFuel ? (
              <form onSubmit={handleFuelSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-950 flex items-center gap-1.5 uppercase">
                    <Fuel className="w-4 h-4 text-emerald-500" />
                    Record Fuel Dispatch
                  </h3>
                  <button type="button" onClick={() => setIsAddingFuel(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Target Coach *</label>
                  <select
                    value={fuelBusId}
                    onChange={(e) => setFuelBusId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50"
                    required
                  >
                    <option value="">-- Choose Coach --</option>
                    {buses.map(b => (
                      <option key={b.id} value={b.id}>{b.registrationNo} ({b.model})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Dispensing Driver *</label>
                  <select
                    value={fuelDriverId}
                    onChange={(e) => setFuelDriverId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50"
                    required
                  >
                    <option value="">-- Choose Driver --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.employeeId})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Volume (Liters) *</label>
                    <input
                      type="number"
                      value={fuelLiters}
                      onChange={(e) => handleLitersChange(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      min="1"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Cost (LKR) *</label>
                    <input
                      type="number"
                      value={fuelCost}
                      onChange={(e) => setFuelCost(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Odometer Reading (km) *</label>
                    <input
                      type="number"
                      value={fuelMileage}
                      onChange={(e) => setFuelMileage(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      min="1"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Fueling Date *</label>
                    <input
                      type="date"
                      value={fuelDate}
                      onChange={(e) => setFuelDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingFuel(false)}
                    className="px-3.5 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                  >
                    Log Fueling
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-sans flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-emerald-400" /> Fuel Analytics Overview
                </span>
                <div className="h-[1px] bg-slate-800"></div>

                <div className="space-y-2 text-xs font-sans">
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    The system automatically calculates the Kilometers per Liter (<strong className="text-slate-100">km/L</strong>) metric upon fuel fill transactions based on previous odometer values. 
                  </p>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    This flags engines demanding corrective workshop checks due to high fuel friction.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddingFuel(true)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors text-center block"
                >
                  Log Refueling Event
                </button>
              </div>
            )}
          </div>

          {/* Refuel transactions table */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Historical Refuel Transactions</h3>

            <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto pr-1 text-xs">
              {fuelLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 italic">No fueling transactions in database.</div>
              ) : (
                fuelLogs.map(log => {
                  const bus = buses.find(b => b.id === log.busId);
                  const driver = drivers.find(d => d.id === log.driverId);
                  return (
                    <div key={log.id} className="py-3 flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-900 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded">
                            {bus?.registrationNo || 'N/A'}
                          </span>
                          <span className="text-slate-500 text-[10px]">Logged by: {driver?.name || 'N/A'}</span>
                        </div>
                        <div className="flex gap-4 text-[11px] font-medium text-slate-600 pt-0.5">
                          <span>Volume: <strong className="text-slate-800">{log.liters} L</strong></span>
                          <span>Odometer: <strong className="text-slate-800">{log.mileageAtFill.toLocaleString()} km</strong></span>
                          <span>Efficiency:{' '}
                            <strong className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                              log.efficiencyKmpl >= 4.5 ? 'text-emerald-700 bg-emerald-50' : 'text-slate-700 bg-slate-50'
                            }`}>
                              {log.efficiencyKmpl} km/L
                            </strong>
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 block pt-0.5">{log.date}</span>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          LKR {log.cost.toLocaleString()}
                        </span>
                        <button
                          onClick={() => {
                            if (confirm('Delete this refueling transaction from logs?')) {
                              onDeleteFuel(log.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg"
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
      )}

    </div>
  );
}
