import React, { useState } from 'react';
import { useMockData } from '../../hooks/useMockData';
import { Report, BinStatus } from '../../types';
import {
  Truck,
  Scale,
  MapPin,
  Compass,
  CheckCircle,
  AlertTriangle,
  Play,
  TrendingUp,
  Check
} from 'lucide-react';

interface MRFDashboardProps {
  activeTab: string;
}

export const MRFDashboard: React.FC<MRFDashboardProps> = ({ activeTab }) => {
  const {
    reports,
    bins,
    updateReportStatus,
    updateBinLevel,
    toggleBinDispatch
  } = useMockData();

  // Payload Registration States
  const [selectedReportId, setSelectedReportId] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [payloadSuccess, setPayloadSuccess] = useState(false);

  // GPS Route Simulation States
  const [routeStep, setRouteStep] = useState(0);
  const [gpsNavigating, setGpsNavigating] = useState(false);
  const [navLogs, setNavLogs] = useState<string[]>([]);

  // Filter lists
  const pendingDispatches = reports.filter(r => r.status === 'PENDING' || r.status === 'DISPATCHED');
  const criticalBins = bins.filter(b => b.fillLevel >= 85);

  const handlePayloadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId || !weightKg) return;

    const parsedWeight = parseFloat(weightKg) || 0;
    updateReportStatus(selectedReportId, 'RESOLVED', parsedWeight);
    
    setPayloadSuccess(true);
    setWeightKg('');
    setSelectedReportId('');

    setTimeout(() => {
      setPayloadSuccess(false);
    }, 3000);
  };

  const startRouteSimulation = (rep: Report) => {
    setGpsNavigating(true);
    setRouteStep(1);
    setNavLogs([`[09:00] Dispatch triggered for ${rep.locationName}`]);

    setTimeout(() => {
      setRouteStep(2);
      setNavLogs(prev => [...prev, `[09:02] GPS: Navigating via main campus avenue`]);
    }, 1500);

    setTimeout(() => {
      setRouteStep(3);
      setNavLogs(prev => [...prev, `[09:04] GPS: Arrived at ${rep.locationName}`]);
      updateReportStatus(rep.id, 'COLLECTED');
    }, 3000);

    setTimeout(() => {
      setRouteStep(4);
      setNavLogs(prev => [...prev, `[09:05] MRF Dispatch Complete. Container emptied.`]);
      setGpsNavigating(false);
    }, 4500);
  };

  return (
    <div className="space-y-6">

      {/* 1. ACTIVE DISPATCHES VIEW */}
      {activeTab === 'dispatches' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Dispatch Cards */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-[#00271D]/50 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Truck size={14} className="text-[#00A77C]" />
                Active Incident Dispatches
              </h3>

              {pendingDispatches.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-150">
                  <CheckCircle className="mx-auto text-emerald-500 mb-2" size={24} />
                  <p className="text-xs font-bold text-gray-700">All dispatches resolved!</p>
                  <p className="text-[10px] text-gray-450 mt-0.5">No pending waste collections scheduled.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {pendingDispatches.map(rep => (
                    <div key={rep.id} className="p-4 rounded-xl border border-gray-250 bg-white hover:border-gray-300 shadow-sm transition-all flex flex-col justify-between sm:flex-row gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-gray-800">{rep.title}</p>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                            rep.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-violet-50 text-violet-700 border border-violet-100'
                          }`}>
                            {rep.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{rep.locationName}</p>
                        <p className="text-[11px] text-gray-500 leading-normal">{rep.description}</p>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {rep.status === 'PENDING' ? (
                          <button
                            type="button"
                            onClick={() => startRouteSimulation(rep)}
                            disabled={gpsNavigating}
                            className="w-full sm:w-auto px-4 py-2 text-white rounded-xl text-xs font-bold hover:opacity-90 flex items-center justify-center gap-1 shadow-md shadow-[#00A77C]/15"
                            style={{ background: 'linear-gradient(135deg, #00A77C, #00c491)' }}
                          >
                            <Play size={12} /> Start Route
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                            MRF On Site
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* GPS Simulation Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="border-b border-[#00271D]/8 pb-3">
                <span className="text-[9px] font-bold text-[#00A77C] bg-[#00A77C]/10 border border-[#00A77C]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Dispatch Nav System
                </span>
                <h4 className="text-sm font-bold text-[#00271D] mt-2">Active Navigation Telemetry</h4>
              </div>

              <div className="space-y-4">
                {routeStep > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Compass size={14} className={`text-[#00A77C] ${gpsNavigating ? 'animate-spin' : ''}`} />
                      <span className="text-xs font-bold text-[#00271D]">
                        {routeStep === 4 ? 'Arrived & Emptying Complete' : 'GPS Route in Progress...'}
                      </span>
                    </div>

                    <div className="relative border-l border-gray-200 pl-4 ml-2 space-y-3">
                      {navLogs.map((log, i) => (
                        <div key={i} className="text-[10px] font-mono text-gray-500 relative">
                          <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-[#00A77C]" />
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-6">
                    Trigger a route simulation from an active dispatch ticket to monitor telematics logs.
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 2. WEIGHT PAYLOAD REGISTER VIEW */}
      {activeTab === 'payload-register' && (
        <div className="max-w-md mx-auto bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm">
          <div className="mb-4">
            <span className="text-[9px] font-bold text-[#00A77C] bg-[#00A77C]/10 px-2 py-0.5 rounded-full border border-[#00A77C]/20 uppercase tracking-widest">
              Weighbridge Operations
            </span>
            <h3 className="text-base font-bold text-[#00271D] mt-2">Log Collection Weight Payload</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Register weight payload values collected from site incidents to complete and allocate user points.</p>
          </div>

          {payloadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs flex gap-2 mb-4">
              <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-bold">Weight Payload Logged!</p>
                <p className="text-[10px] text-emerald-600/90 mt-0.5">Dispatches updated, user rewards allocated.</p>
              </div>
            </div>
          )}

          <form onSubmit={handlePayloadSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Dispatch Ticket</label>
              <select
                value={selectedReportId}
                onChange={e => setSelectedReportId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 outline-none cursor-pointer focus:border-emerald-500 focus:bg-white"
              >
                <option value="">-- Choose collected dispatch --</option>
                {reports.filter(r => r.status === 'COLLECTED').map(r => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.locationName})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Weight Collected (kg)</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g. 24.5"
                value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:opacity-90 shadow-md shadow-[#00A77C]/15 flex items-center justify-center gap-1.5"
              style={{ background: 'linear-gradient(135deg, #00A77C, #00c491)' }}
            >
              <Scale size={13} />
              <span>Record & Log Weight</span>
            </button>
          </form>
        </div>
      )}

      {/* 3. BINS STATUS MONITOR VIEW */}
      {activeTab === 'bins-monitor' && (
        <div className="bg-white/90 backdrop-blur-md border border-white/80 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-[#00271D]/50 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <MapPin size={14} className="text-[#00A77C]" />
            Global Bins Status & Level Overrides
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {bins.map(bin => {
              const isCrit = bin.fillLevel >= 85;
              const fillBarColor = isCrit ? 'bg-red-500' : bin.fillLevel >= 60 ? 'bg-amber-400' : 'bg-[#00A77C]';
              const textLvlColor = isCrit ? 'text-red-600' : bin.fillLevel >= 60 ? 'text-amber-600' : 'text-[#00A77C]';
              
              return (
                <div key={bin.id} className="p-4 rounded-xl border border-[#00271D]/10 bg-white/80 hover:shadow-md hover:-translate-y-0.5 transition-all shadow-sm space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-xs font-bold text-[#00271D]">{bin.name}</p>
                      <p className="text-[10px] text-[#00271D]/50 mt-0.5">{bin.locationName}</p>
                    </div>
                    <span className={`text-xs font-black tabular-nums ${textLvlColor}`}>{bin.fillLevel}%</span>
                  </div>

                  <div className="h-1.5 w-full bg-[#00271D]/8 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${fillBarColor}`} style={{ width: `${bin.fillLevel}%` }} />
                  </div>

                  <div className="flex justify-between items-center text-[10px] pt-1">
                    <div className="flex gap-1">
                      {[15, 65, 95].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => updateBinLevel(bin.id, v)}
                          className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-[9px] font-bold text-gray-505"
                        >
                          {v}%
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleBinDispatch(bin.id)}
                      className={`px-2 py-0.5 rounded-full border text-[9px] font-bold transition-all ${
                        bin.activeDispatch
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-[#00A77C]/10 text-[#00A77C] border-[#00A77C]/20'
                      }`}
                    >
                      {bin.activeDispatch ? 'Active' : 'Dispatch'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
