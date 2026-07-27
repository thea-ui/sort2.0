import React from 'react';
import {
  CheckCircle,
  Camera,
  MapPin,
  Compass,
  ChevronRight,
  Send
} from 'lucide-react';

type InfrastructurePillar = 'waste' | 'furniture' | 'electronics' | 'fixtures' | 'equipment' | 'other';

interface TeacherSubmitReportTabProps {
  pillarCategory: InfrastructurePillar;
  setPillarCategory: (cat: InfrastructurePillar) => void;
  reportTitle: string;
  setReportTitle: (t: string) => void;
  notes: string;
  setNotes: (n: string) => void;
  observation: string;
  setObservation: (o: string) => void;
  selectedBuilding: string;
  setSelectedBuilding: (b: string) => void;
  roomNumber: string;
  setRoomNumber: (r: string) => void;
  wizardStep: number;
  setWizardStep: (s: number) => void;
  capturedImage: string | null;
  setCapturedImage: (img: string | null) => void;
  isCapturing: boolean;
  handleCapture: () => void;
  gpsCoords: { lat: number; lng: number } | null;
  setGpsCoords: (coords: { lat: number; lng: number } | null) => void;
  gpsLoading: boolean;
  handleGPSDetect: () => void;
  isSubmitting: boolean;
  submitSuccess: boolean;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  setUrgency: (u: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  isPinningMode: boolean;
  setIsPinningMode: (p: boolean) => void;
  isCustomDebrisPin: boolean;
  setIsCustomDebrisPin: (p: boolean) => void;
  assignedLocationText: string;
  setAssignedLocationText: (txt: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  PILLAR_META: Record<InfrastructurePillar, { emoji: string; label: string; desc: string; accent: string; iconBg: string; iconText: string; border: string }>;
  OBSERVATION_OPTIONS: string[];
  STEPS: string[];
  isWasteCategory: boolean;
  MAP_BOUNDS: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  coordToPct: (lat: number, lng: number) => { pctX: number; pctY: number };
}

export const TeacherSubmitReportTab: React.FC<TeacherSubmitReportTabProps> = ({
  pillarCategory,
  setPillarCategory,
  reportTitle,
  setReportTitle,
  notes,
  setNotes,
  observation,
  setObservation,
  selectedBuilding,
  setSelectedBuilding,
  roomNumber,
  setRoomNumber,
  wizardStep,
  setWizardStep,
  capturedImage,
  setCapturedImage,
  isCapturing,
  handleCapture,
  gpsCoords,
  setGpsCoords,
  gpsLoading,
  handleGPSDetect,
  isSubmitting,
  submitSuccess,
  urgency,
  setUrgency,
  isPinningMode,
  setIsPinningMode,
  isCustomDebrisPin,
  setIsCustomDebrisPin,
  assignedLocationText,
  setAssignedLocationText,
  handleSubmit,
  PILLAR_META,
  OBSERVATION_OPTIONS,
  STEPS,
  isWasteCategory,
  MAP_BOUNDS,
  coordToPct
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">

      {/* Page header */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-indigo-700">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          Faculty Service Portal
        </span>
        <h2 className="mt-2 text-xl font-extrabold tracking-tight text-gray-900">Advanced Multi-Category Asset Report</h2>
        <p className="mt-1 text-xs text-gray-500">File structural maintenance tickets, broken assets, or environmental anomalies directly to MRF administrators.</p>
      </div>

      {/* Step tracker */}
      <div className="rounded-3xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-center gap-0">
          {STEPS.map((step, idx) => {
            const n = idx + 1;
            const done   = wizardStep > n;
            const active = wizardStep === n;
            return (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all ${
                    done   ? 'bg-indigo-600 text-white' :
                    active ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                             'bg-gray-100 text-gray-400'
                  }`}>
                    {done ? <CheckCircle size={14} /> : n}
                  </div>
                  <p className={`mt-1.5 text-[10px] font-bold ${active ? 'text-indigo-600' : 'text-gray-400'}`}>{step}</p>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`mx-2 mb-5 h-px flex-1 transition-all ${wizardStep > n ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Success alert */}
      {submitSuccess && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700 shadow-sm animate-fade-in">
          <CheckCircle size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-bold">Maintenance Ticket Logged Successfully!</p>
            <p className="mt-0.5 text-[10px] text-emerald-600/90">The MRF operations center has been notified of this structural log.</p>
          </div>
        </div>
      )}

      {/* Form card */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">

          {/* ── Step 1 ── */}
          {wizardStep === 1 && (
            <div className="space-y-5">
              {/* Category tiles */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">1. Select Recovery Category</label>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {(Object.entries(PILLAR_META) as [InfrastructurePillar, typeof PILLAR_META.waste][]).map(([id, meta]) => {
                    const selected = pillarCategory === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPillarCategory(id)}
                        className={`group flex flex-col items-center gap-1.5 rounded-2xl border p-3.5 text-center transition-all select-none cursor-pointer ${
                          selected
                            ? `bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200`
                            : `bg-gray-50 border-gray-200 hover:border-indigo-300 text-gray-600`
                        }`}
                      >
                        <span className="text-lg">{meta.emoji}</span>
                        <span className="text-xs font-bold">{meta.label}</span>
                        <span className={`text-[9px] leading-tight ${selected ? 'text-indigo-200' : 'text-gray-400'}`}>{meta.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">2. Maintenance Subject / Title</label>
                <input
                  type="text" required
                  placeholder="e.g. Broken Desk in Room 204 or Overhead Projector flickering"
                  value={reportTitle}
                  onChange={e => setReportTitle(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-900 outline-none transition-all focus:border-indigo-500 focus:bg-white font-bold placeholder:font-normal"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={!reportTitle.trim()}
                  onClick={() => setWizardStep(2)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  Continue <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2 ── */}
          {wizardStep === 2 && (
            <div className="space-y-5">
              {/* Photo */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">1. Verification Photo</label>
                <div className="relative h-40 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center">
                  {isCapturing ? (
                    <div className="animate-pulse text-center">
                      <Camera className="mx-auto text-indigo-500" size={24} />
                      <p className="mt-1 text-[9px] font-bold text-indigo-600 uppercase">Accessing Camera...</p>
                    </div>
                  ) : capturedImage ? (
                    <div className="group relative h-full w-full">
                      <img src={capturedImage} alt="Evidence" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 opacity-0 transition-opacity group-hover:opacity-100">
                        <button type="button" onClick={handleCapture} className="rounded-xl bg-indigo-600 px-4 py-2 text-[10px] font-bold text-white cursor-pointer shadow">
                          Retake Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 px-4 text-center">
                      <Camera className="mx-auto text-gray-300" size={24} />
                      <p className="text-[10px] text-gray-400 font-medium">Capture or upload evidence photo</p>
                      <div className="flex justify-center gap-2">
                        <button type="button" onClick={handleCapture} className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-[10px] font-bold text-gray-600 shadow-sm hover:bg-gray-50 cursor-pointer">
                          Mock Camera
                        </button>
                        <label className="cursor-pointer rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-[10px] font-bold text-gray-600 shadow-sm hover:bg-gray-50">
                          Upload File
                          <input type="file" accept="image/*" className="hidden" onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) { const r = new FileReader(); r.onload = ev => setCapturedImage(ev.target?.result as string); r.readAsDataURL(f); }
                          }} />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CONDITIONAL LOCATION LOGIC */}
              {isWasteCategory ? (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">2. Pin Location on Campus Map</label>
                  <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5">
                    <div>
                      <p className="text-[10px] font-bold text-amber-800">Waste / Bin Category — Map Pinning Required</p>
                      <p className="text-[9px] text-amber-700">Enable pinning mode and click the exact location on the campus grid.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPinningMode(!isPinningMode)}
                      className={`ml-3 flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                        isPinningMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Compass size={12} className={isPinningMode ? 'animate-spin' : ''} />
                      {isPinningMode ? 'Pinning Active' : 'Enable Pinning'}
                    </button>
                  </div>

                  {/* Map Grid */}
                  <div
                    onClick={e => {
                      if (!isPinningMode) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pctX = (e.clientX - rect.left) / rect.width;
                      const pctY = (e.clientY - rect.top) / rect.height;
                      const lat = MAP_BOUNDS.maxLat - pctY * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
                      const lng = MAP_BOUNDS.minLng + pctX * (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
                      setGpsCoords({ lat, lng });
                      setIsCustomDebrisPin(true);
                      setAssignedLocationText(`Pinned at [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
                    }}
                    className={`relative h-60 w-full overflow-hidden rounded-2xl border bg-slate-900 border-slate-700 shadow-inner transition-all ${
                      isPinningMode ? 'cursor-crosshair ring-2 ring-indigo-500/50' : 'cursor-default'
                    }`}
                  >
                    <svg className="absolute inset-0 h-full w-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="wizard-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#wizard-grid)" />
                      <rect x="15%" y="10%" width="20%" height="15%" rx="8" fill="#475569" />
                      <text x="25%" y="19%" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Sports Gym</text>
                      <rect x="65%" y="12%" width="22%" height="18%" rx="8" fill="#475569" />
                      <text x="76%" y="22%" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Science Hall</text>
                      <circle cx="50%" cy="50%" r="36" fill="#334155" />
                      <text x="50%" y="51%" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Quad</text>
                      <rect x="10%" y="70%" width="25%" height="18%" rx="8" fill="#475569" />
                      <text x="22%" y="81%" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Chemistry Lab</text>
                      <rect x="60%" y="72%" width="28%" height="18%" rx="8" fill="#475569" />
                      <text x="74%" y="83%" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Main Library</text>
                    </svg>
                    <div className="absolute left-2 top-2 rounded border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[7px] font-bold uppercase text-slate-400 backdrop-blur-sm pointer-events-none">
                      Campus Grid
                    </div>
                    {isCustomDebrisPin && gpsCoords && (() => {
                      const { pctX, pctY } = coordToPct(gpsCoords.lat, gpsCoords.lng);
                      return (
                        <div style={{ left: `${pctX}%`, top: `${pctY}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow-xl animate-bounce">
                          <MapPin size={14} strokeWidth={2.5} />
                        </div>
                      );
                    })()}
                  </div>
                  {gpsCoords && (
                    <p className="text-[10px] text-indigo-600 font-bold text-center">
                      📍 Pinned: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
                    </p>
                  )}
                  {!gpsCoords && (
                    <p className="text-[10px] text-gray-400 text-center animate-pulse">
                      Enable pinning mode and click a location on the map above
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">2. Campus Building</label>
                    <select
                      value={selectedBuilding}
                      onChange={e => setSelectedBuilding(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
                    >
                      <option value="Main Courtyard (Quad)">Main Courtyard (Quad)</option>
                      <option value="Science Hall Cafeteria Side">Science Hall</option>
                      <option value="Chemistry Building Room 302 Entrance">Chemistry Building</option>
                      <option value="Main Library Lobby Entrance">Main Library</option>
                      <option value="Sports Complex Entrance B">Sports Complex</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">3. Floor / Room Number</label>
                    <input
                      type="text" required
                      placeholder="e.g. Room 302 or 2nd Floor"
                      value={roomNumber}
                      onChange={e => setRoomNumber(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {!isWasteCategory && (
                <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-2.5">
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Telemetry Coordinates</p>
                    <p className="font-mono text-[10px] text-gray-600">{gpsCoords ? `${gpsCoords.lat.toFixed(4)}, ${gpsCoords.lng.toFixed(4)}` : 'Not detected'}</p>
                  </div>
                  <button type="button" onClick={handleGPSDetect} disabled={gpsLoading}
                    className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-gray-600 shadow-sm hover:border-indigo-400 hover:text-indigo-600 cursor-pointer">
                    <MapPin size={11} className={gpsLoading ? 'animate-spin' : ''} />
                    {gpsLoading ? 'Detecting...' : 'Detect GPS'}
                  </button>
                </div>
              )}

              <div className="flex justify-between pt-1">
                <button type="button" onClick={() => setWizardStep(1)} className="rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-200 cursor-pointer">← Back</button>
                <button
                  type="button"
                  disabled={!isWasteCategory ? !roomNumber.trim() : !gpsCoords}
                  onClick={() => setWizardStep(3)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  Continue <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3 ── */}
          {wizardStep === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">1. Priority Severity</label>
                  <select
                    value={urgency}
                    onChange={e => setUrgency(e.target.value as any)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
                  >
                    <option value="LOW">🟢 Low Severity</option>
                    <option value="MEDIUM">🟡 Medium Priority</option>
                    <option value="HIGH">🔴 Critical (Immediate)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">2. Condition / Observation</label>
                  <select
                    value={observation}
                    onChange={e => setObservation(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white cursor-pointer"
                  >
                    {OBSERVATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">3. Detailed Observations</label>
                <textarea
                  required rows={3}
                  placeholder="Describe specific damage, affected area, or any additional operational notes..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-900 outline-none focus:border-indigo-500 focus:bg-white placeholder:font-normal"
                />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-2">
                <span className="inline-block rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-700">Ticket Preview</span>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  <div className="text-gray-500">Category: <span className="font-bold capitalize text-gray-800">{PILLAR_META[pillarCategory].label}</span></div>
                  <div className="text-gray-500">Severity: <span className="font-bold uppercase text-gray-800">{urgency}</span></div>
                  <div className="text-gray-500">Condition: <span className="font-bold text-gray-800">{observation}</span></div>
                  <div className="text-gray-500">Location: <span className="font-bold text-gray-800">{isWasteCategory ? 'Map pin' : `${selectedBuilding}${roomNumber ? ` · ${roomNumber}` : ''}`}</span></div>
                  <div className="col-span-2 text-gray-500">Subject: <span className="font-bold text-gray-800">{reportTitle}</span></div>
                </div>
              </div>

              <div className="flex justify-between pt-1">
                <button type="button" onClick={() => setWizardStep(2)} className="rounded-xl bg-gray-100 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-200 cursor-pointer">← Back</button>
                <button
                  type="submit"
                  disabled={isSubmitting || !notes.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /><span>Logging...</span></>
                  ) : (
                    <><Send size={13} /><span>Log Maintenance Ticket</span></>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

    </div>
  );
};
