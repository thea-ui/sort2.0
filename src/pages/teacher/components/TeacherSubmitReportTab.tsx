import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle,
  Camera,
  Compass,
  MapPin,
  ChevronLeft,
  Send,
  Search,
  Building2,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Trash2,
  Armchair,
  Tv,
  Zap,
  Wrench,
  HelpCircle,
  Package,
  X,
  Upload,
  Video,
  Target,
  FlaskConical,
  Wine,
  Soup,
  Box,
  Trash,
  Monitor,
  Laptop,
  Speaker,
  Printer,
  Mic,
  Wifi,
  Cable,
  Lightbulb,
  Fan,
  ToggleLeft,
  Plug,
  DoorOpen,
  Blinds,
  Droplets,
  PaintBucket,
  Hammer,
  Bug,
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
  PILLAR_META: Record<InfrastructurePillar, { emoji?: string; icon?: React.ComponentType<any>; label: string; desc: string; accent: string; iconBg: string; iconText: string; border: string }>;
  OBSERVATION_OPTIONS: string[];
  STEPS: string[];
  isWasteCategory: boolean;
  MAP_BOUNDS: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  coordToPct: (lat: number, lng: number) => { pctX: number; pctY: number };
}

const CATEGORY_DETAILS: Record<InfrastructurePillar, {
  label: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  itemsLabel: string;
  items: { id: string; label: string; icon: React.ComponentType<any> }[];
}> = {
  furniture: {
    label: 'Furniture',
    title: 'Report Furniture',
    subtitle: 'Chairs, tables, desks, cabinets',
    icon: Armchair,
    itemsLabel: 'Select Furniture *',
    items: [
      { id: 'arm-chair-plastic', label: 'Arm Chair (Plastic)', icon: Armchair },
      { id: 'arm-chair-wooden', label: 'Arm Chair (Wooden)', icon: Armchair },
      { id: 'office-chair', label: 'Office Chair', icon: Armchair },
      { id: 'student-desk', label: 'Student Desk', icon: Armchair },
      { id: 'teachers-table', label: "Teacher's Table", icon: Armchair },
      { id: 'wooden-table', label: 'Wooden Table', icon: Armchair },
      { id: 'filing-cabinet', label: 'Filing Cabinet', icon: Box },
      { id: 'bookshelf', label: 'Bookshelf', icon: Box },
      { id: 'whiteboard-stand', label: 'Whiteboard Stand', icon: FileText },
    ]
  },
  waste: {
    label: 'Waste / Bin',
    title: 'Report Waste / Bin',
    subtitle: 'Litter issues, overflows',
    icon: Trash2,
    itemsLabel: 'Select Primary Recyclable Category *',
    items: [
      { id: 'plastic-bottles', label: 'Plastic Bottles', icon: Trash },
      { id: 'glass-bottles', label: 'Glass / Tanduay Bottles', icon: Wine },
      { id: 'aluminum-cans', label: 'Aluminum Cans', icon: Trash },
      { id: 'paper-cardboard', label: 'Paper & Cardboard', icon: Box },
      { id: 'residual-waste', label: 'Residual Waste', icon: Trash2 },
    ]
  },
  electronics: {
    label: 'Electronics',
    title: 'Report Electronics',
    subtitle: 'Projectors, display screens',
    icon: Tv,
    itemsLabel: 'Select Electronics *',
    items: [
      { id: 'projector', label: 'Projector', icon: Video },
      { id: 'display-monitor', label: 'Display Monitor / TV', icon: Monitor },
      { id: 'desktop-pc', label: 'Desktop PC', icon: Monitor },
      { id: 'laptop', label: 'Laptop', icon: Laptop },
      { id: 'speaker-system', label: 'Speaker / Sound System', icon: Speaker },
      { id: 'printer-scanner', label: 'Printer / Scanner', icon: Printer },
      { id: 'microphone', label: 'Microphone', icon: Mic },
      { id: 'router-ap', label: 'Wi-Fi Router / Access Point', icon: Wifi },
      { id: 'cable-adapter', label: 'Cable / Adapter', icon: Cable },
    ]
  },
  fixtures: {
    label: 'Fixtures',
    title: 'Report Fixtures',
    subtitle: 'AC, fans, lights, switches',
    icon: Zap,
    itemsLabel: 'Select Fixtures *',
    items: [
      { id: 'ceiling-light', label: 'Ceiling Light / Bulb', icon: Lightbulb },
      { id: 'ac-unit', label: 'Air Conditioner (AC)', icon: Zap },
      { id: 'light-switch', label: 'Light Switch', icon: ToggleLeft },
      { id: 'electrical-outlet', label: 'Electrical Socket / Outlet', icon: Plug },
      { id: 'ceiling-fan', label: 'Ceiling Fan', icon: Fan },
      { id: 'door-lock', label: 'Door Lock / Handle', icon: DoorOpen },
      { id: 'window-blinds', label: 'Window Blinds / Glass', icon: Blinds },
      { id: 'water-dispenser', label: 'Water Dispenser / Sink', icon: Droplets },
      { id: 'whiteboard-chalkboard', label: 'Whiteboard / Chalkboard', icon: FileText },
    ]
  },
  equipment: {
    label: 'Equipment',
    title: 'Report Equipment',
    subtitle: 'Lab tools, janitorial assets',
    icon: Wrench,
    itemsLabel: 'Select Equipment *',
    items: [
      { id: 'lab-tool', label: 'Lab Tool / Apparatus', icon: FlaskConical },
      { id: 'janitorial-cart', label: 'Janitorial Cart / Mop', icon: Wrench },
      { id: 'microscope', label: 'Science Microscope', icon: FlaskConical },
      { id: 'sports-gear', label: 'Gym / Sports Gear', icon: Target },
      { id: 'safety-equipment', label: 'Safety Equipment', icon: AlertTriangle },
      { id: 'podium-lectern', label: 'Podium / Lectern', icon: Mic },
      { id: 'extension-cord', label: 'Extension Cord', icon: Cable },
      { id: 'cleaning-supplies', label: 'Cleaning Supplies', icon: Droplets },
      { id: 'paper-shredder', label: 'Paper Shredder', icon: Printer },
    ]
  },
  other: {
    label: 'Other',
    title: 'Report General Repairs',
    subtitle: 'General structural repair',
    icon: HelpCircle,
    itemsLabel: 'Select Issue Type *',
    items: [
      { id: 'wall-damage', label: 'Wall Damage / Paint', icon: PaintBucket },
      { id: 'floor-tile', label: 'Floor Tile / Carpet', icon: Hammer },
      { id: 'ceiling-leak', label: 'Ceiling Leak / Stain', icon: Droplets },
      { id: 'plumbing-pipe', label: 'Plumbing / Pipe', icon: Droplets },
      { id: 'structural-issue', label: 'Structural Issue', icon: Hammer },
      { id: 'safety-hazard', label: 'Safety Hazard', icon: AlertTriangle },
      { id: 'pest-issue', label: 'Pest Issue', icon: Bug },
      { id: 'general-repair', label: 'General Repair', icon: Wrench },
    ]
  }
};

const LOCATIONS = [
  'Room 101 – Science Hall',
  'Room 102 – Admin Building',
  'Room 201 – Science Hall',
  'Room 204 – Arts Building',
  'Room 305 – Engineering',
  'Computer Lab 2 – IT Building',
  'Computer Lab 3 – IT Building',
  'Faculty Office – Admin Building',
  'Conference Room – Admin Building',
  'Library – 2nd Floor',
  'Main Courtyard (Quad)',
  'Sports Complex Entrance B',
];

const CONDITIONS = [
  { id: 'Damaged', label: 'Damaged', desc: 'Broken but may be repairable' },
  { id: 'Malfunctioning', label: 'Malfunctioning', desc: 'Not working properly' },
  { id: 'Worn Out', label: 'Worn Out', desc: 'Heavy wear, needs replacement' },
  { id: 'Missing Parts', label: 'Missing Parts', desc: 'Incomplete, parts missing' },
];

const URGENCIES = [
  { id: 'Low', label: 'Low', desc: 'Minor issue, no immediate impact', value: 'LOW' as const },
  { id: 'Normal', label: 'Normal', desc: 'Needs repair or attention soon', value: 'MEDIUM' as const },
  { id: 'Urgent', label: 'Urgent', desc: 'Dangerous condition (e.g. broken glass, unstable)', value: 'HIGH' as const },
];

const GRID_LOCATIONS = [
  { name: 'Room 101 – Science Hall', status: 'Available', isFull: false, bioFull: false, nonBioFull: false, lat: 14.6018, lng: 120.9860 },
  { name: 'Room 102 – Admin Building', status: 'Available', isFull: false, bioFull: false, nonBioFull: false, lat: 14.6000, lng: 120.9840 },
  { name: 'Room 201 – Science Hall', status: 'Available', isFull: false, bioFull: false, nonBioFull: false, lat: 14.6020, lng: 120.9862 },
  { name: 'Room 204 – Arts Building', status: 'Available', isFull: false, bioFull: false, nonBioFull: false, lat: 14.5990, lng: 120.9850 },
  { name: 'Cafeteria – Block A', status: 'Available', isFull: false, bioFull: false, nonBioFull: false, lat: 14.6005, lng: 120.9835 },
  { name: 'Library Entrance', status: 'Unavailable', isFull: true, bioFull: true, nonBioFull: false, lat: 14.5988, lng: 120.9868 },
  { name: 'Gym Hallway', status: 'Available', isFull: false, bioFull: false, nonBioFull: false, lat: 14.6022, lng: 120.9830 },
  { name: 'Engineering Bldg – 2F', status: 'Available', isFull: false, bioFull: false, nonBioFull: false, lat: 14.5995, lng: 120.9855 },
  { name: 'Parking Lot B', status: 'Available', isFull: false, bioFull: false, nonBioFull: true, lat: 14.6010, lng: 120.9870 },
];

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
  capturedImage,
  setCapturedImage,
  isCapturing,
  handleCapture,
  isSubmitting,
  submitSuccess,
  urgency,
  setUrgency,
  isPinningMode,
  setIsPinningMode,
  isCustomDebrisPin,
  setIsCustomDebrisPin,
  gpsCoords,
  setGpsCoords,
  handleSubmit,
  PILLAR_META,
}) => {
  const [selectedCategory, setSelectedCategoryState] = useState<InfrastructurePillar | null>(null);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>(roomNumber ? `${selectedBuilding} – ${roomNumber}` : 'Room 101 – Science Hall');
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [selectedCondition, setSelectedConditionState] = useState<string>(observation || 'Damaged');
  const [selectedUrgencyState, setSelectedUrgencyState] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(urgency || 'MEDIUM');

  const handleSelectCategory = (catKey: InfrastructurePillar) => {
    setSelectedCategoryState(catKey);
    setPillarCategory(catKey);
  };

  const handleLocationSelect = (locName: string) => {
    setSelectedLocation(locName);
    const parts = locName.split(' – ');
    if (parts.length > 1) {
      setRoomNumber(parts[0]);
      setSelectedBuilding(parts[1]);
    } else {
      setRoomNumber(locName);
    }
  };

  const handleItemSelect = (itemLabel: string) => {
    setSelectedItem(itemLabel);
    setReportTitle(itemLabel);
  };

  const handleConditionSelect = (condLabel: string) => {
    setSelectedConditionState(condLabel);
    setObservation(condLabel);
  };

  const handleUrgencySelect = (urgVal: 'LOW' | 'MEDIUM' | 'HIGH') => {
    setSelectedUrgencyState(urgVal);
    setUrgency(urgVal);
  };

  const filteredLocations = LOCATIONS.filter(loc =>
    loc.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const activeMeta = selectedCategory ? CATEGORY_DETAILS[selectedCategory] : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">

      {/* Success alert */}
      {submitSuccess && (
        <div className="flex items-start gap-3 rounded-2xl border border-[#00A77C]/30 bg-[#00A77C]/15 p-4 text-xs text-[#00A77C] shadow-xs animate-fade-in">
          <CheckCircle size={18} className="mt-0.5 shrink-0 text-[#00A77C]" />
          <div>
            <p className="font-bold">Maintenance Ticket Logged Successfully!</p>
            <p className="mt-0.5 text-[10px] text-[#00A77C]/90">The MRF operations center has been notified of this structural log.</p>
          </div>
        </div>
      )}

      {/* ── STEP 1: CATEGORY SELECTION MENU (If no category is selected) ── */}
      {!selectedCategory ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-white/95 via-white/90 to-[#e0f2ec]/60 border border-white/90 rounded-3xl p-7 shadow-xl shadow-[#00271D]/5 backdrop-blur-md">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#00A77C]/40 bg-[#00A77C]/15 px-3.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[#00A77C]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00A77C] animate-pulse" />
              Faculty Service Portal
            </span>
            <h2 className="mt-2 text-2xl font-heading font-black tracking-tight text-[#00271D]">
              Multi-Category Asset & Waste Report
            </h2>
            <p className="mt-1 text-xs text-[#00271D]/60 font-medium">
              File structural maintenance tickets, broken classroom items, or bin overflow reports directly to MRF staff.
            </p>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/90 backdrop-blur-md p-7 shadow-sm space-y-4">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#00271D]/60">
              1. Select Recovery Category
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(Object.entries(PILLAR_META) as [InfrastructurePillar, typeof PILLAR_META.waste][]).map(([id, meta]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelectCategory(id)}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-200/80 bg-white p-5 text-center transition-all hover:border-[#00A77C] hover:bg-[#00A77C]/5 hover:shadow-md cursor-pointer select-none"
                >
                  <span className="text-2xl">{meta.emoji}</span>
                  <span className="text-sm font-bold text-[#00271D]">{meta.label}</span>
                  <span className="text-[10px] text-[#00271D]/50 font-medium">{meta.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── STEP 2: CATEGORY REPORT FORM (Matching Student SubmitReportTab) ── */
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Header Category Banner with Back button */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 p-6 text-white shadow-lg shadow-blue-500/15 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSelectedCategoryState(null)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-all hover:bg-white/30 cursor-pointer"
              title="Back to category selection"
            >
              <ChevronLeft size={20} />
            </button>

            {activeMeta && (
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner">
                  {React.createElement(CATEGORY_DETAILS[selectedCategory].icon, { size: 24 })}
                </div>
                <div>
                  <h2 className="text-xl font-heading font-black text-white tracking-tight">{activeMeta.title}</h2>
                  <p className="text-xs text-white/80 font-medium">{activeMeta.subtitle}</p>
                </div>
              </div>
            )}
          </div>

          {/* Card 1: Photo Evidence */}
          <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-md p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Camera size={16} className="text-[#00271D]/60" />
              <h3 className="text-xs font-bold text-[#00271D]">
                Photo Evidence <span className="text-rose-500">*</span>
              </h3>
            </div>

            <div className="relative h-44 w-full overflow-hidden rounded-2xl border-2 border-dashed border-blue-200/80 bg-[#F8FAFC] flex items-center justify-center transition-all hover:bg-blue-50/20">
              {isCapturing ? (
                <div className="animate-pulse text-center">
                  <Camera className="mx-auto text-blue-500" size={28} />
                  <p className="mt-1 text-[10px] font-bold text-blue-500 uppercase">Accessing Camera...</p>
                </div>
              ) : capturedImage ? (
                <div className="group relative h-full w-full">
                  <img src={capturedImage} alt="Evidence" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={handleCapture}
                      className="rounded-full bg-blue-500 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-600 cursor-pointer"
                    >
                      Retake Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-center p-4">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                    <Camera size={20} />
                  </div>
                  <h4 className="text-xs font-bold text-[#00271D]">Take a Photo</h4>
                  <p className="text-[10px] text-gray-400 font-medium">Open camera to capture evidence</p>
                  
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCapture}
                      className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[10px] font-bold text-[#00271D] shadow-2xs hover:bg-gray-50 cursor-pointer"
                    >
                      Mock Camera
                    </button>
                    <label className="cursor-pointer rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[10px] font-bold text-[#00271D] shadow-2xs hover:bg-gray-50">
                      Upload File
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const r = new FileReader();
                            r.onload = ev => setCapturedImage(ev.target?.result as string);
                            r.readAsDataURL(f);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Location List & Interactive Grid Map (Matching Student SubmitReportTab) */}
          <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-md p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base font-heading font-bold text-[#00271D] flex items-center gap-2">
                <MapPin size={18} className="text-[#00A77C]" />
                <span>Bin Location</span>
                <span className="text-rose-500">*</span>
              </h3>

              <button
                type="button"
                onClick={() => setIsPinningMode(!isPinningMode)}
                className={`px-4 py-2 text-xs font-bold rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isPinningMode
                    ? 'bg-[#00A77C] border-[#00A77C] text-white shadow-sm'
                    : 'bg-[#F9F3F0] border-[#00271D]/15 text-[#00271D] hover:bg-[#00271D]/10'
                }`}
              >
                <Compass size={14} className={isPinningMode ? 'animate-spin' : ''} />
                <span>{isPinningMode ? 'Pinning Mode Active' : 'Pin Scattered Trash'}</span>
              </button>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search room or building..."
                value={locationSearch}
                onChange={e => setLocationSearch(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-[#F8FAFC] pl-9 pr-4 py-2.5 text-xs text-[#00271D] outline-none transition-all focus:border-[#00A77C] focus:bg-white font-medium"
              />
            </div>

            <div className="border border-[#00271D]/10 rounded-2xl overflow-hidden divide-y divide-[#00271D]/10 max-h-48 overflow-y-auto bg-white">
              {filteredLocations.map(loc => {
                const isSelected = selectedLocation === loc;
                return (
                  <div
                    key={loc}
                    onClick={() => handleLocationSelect(loc)}
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#00A77C]/15 font-semibold'
                        : 'hover:bg-[#F9F3F0]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#00A77C]" />
                      <span className={`text-xs ${isSelected ? 'text-[#00271D] font-bold' : 'text-[#00271D]/80 font-medium'}`}>
                        {loc}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold px-3 py-0.5 rounded-full border bg-[#00A77C]/20 text-[#00A77C] border-[#00A77C]/40">
                      Available
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Interactive Campus Grid Map */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-[#00271D]/50 uppercase tracking-wider">
                <span>Campus Map Grid View (Side-by-Side Dual Trash Can Stations)</span>
                {selectedLocation && <span className="text-[#00A77C] normal-case font-semibold truncate max-w-[200px]">Selected: {selectedLocation}</span>}
              </div>

              <div
                onClick={(e) => {
                  if (!isPinningMode) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const clickY = e.clientY - rect.top;

                  const pctX = clickX / rect.width;
                  const pctY = clickY / rect.height;

                  const minLat = 14.5980;
                  const maxLat = 14.6030;
                  const minLng = 120.9820;
                  const maxLng = 120.9880;

                  const lat = maxLat - pctY * (maxLat - minLat);
                  const lng = minLng + pctX * (maxLng - minLng);

                  setGpsCoords({ lat, lng });
                  setIsCustomDebrisPin(true);
                  handleLocationSelect(`Scattered Debris at Grid [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
                }}
                className={`relative w-full h-[300px] rounded-2xl border bg-[#00271D] border-[#00271D] overflow-hidden shadow-inner flex items-center justify-center transition-all ${
                  isPinningMode ? 'cursor-crosshair ring-2 ring-[#00A77C]' : 'cursor-default'
                }`}
              >
                <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="teacher-map-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#00A77C" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#teacher-map-grid)" />
                  <rect x="15%" y="10%" width="20%" height="15%" rx="6" fill="#00A77C" opacity="0.4" />
                  <text x="25%" y="19%" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">Sports Gym</text>

                  <rect x="65%" y="12%" width="22%" height="18%" rx="6" fill="#00A77C" opacity="0.4" />
                  <text x="76%" y="22%" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">Science Hall</text>

                  <circle cx="50%" cy="50%" r="35" fill="#00A77C" opacity="0.4" />
                  <text x="50%" y="51%" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">Quad</text>

                  <rect x="10%" y="70%" width="25%" height="18%" rx="6" fill="#00A77C" opacity="0.4" />
                  <text x="22%" y="81%" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">Chemistry Lab</text>

                  <rect x="60%" y="72%" width="28%" height="18%" rx="6" fill="#00A77C" opacity="0.4" />
                  <text x="74%" y="83%" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">Main Library</text>
                </svg>

                <div className="absolute top-2 left-2 bg-[#00271D]/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-[8px] text-[#00A77C] font-bold uppercase border border-[#00A77C] flex items-center gap-1">
                <MapPin size={9} />
                <span>Side-by-Side Color-Coded Stations</span>
              </div>

                {/* Plot Dual Trash Can Stations on Map */}
                {GRID_LOCATIONS.map(loc => {
                  const minLat = 14.5980;
                  const maxLat = 14.6030;
                  const minLng = 120.9820;
                  const maxLng = 120.9880;

                  const pctY = ((maxLat - loc.lat) / (maxLat - minLat)) * 100;
                  const pctX = ((loc.lng - minLng) / (maxLng - minLng)) * 100;

                  const isSelected = selectedLocation === loc.name;

                  return (
                    <div
                      key={loc.name}
                      style={{ left: `${pctX}%`, top: `${pctY}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLocationSelect(loc.name);
                        setGpsCoords({ lat: loc.lat, lng: loc.lng });
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-20 group ${
                        isSelected
                          ? 'scale-125 z-40 ring-4 ring-[#00A77C] ring-offset-2 ring-offset-[#00271D] rounded-2xl shadow-[0_0_25px_rgba(0,167,124,0.9)] animate-pulse'
                          : 'hover:scale-110'
                      }`}
                    >
                      {/* Station Pair Box with Two Side-by-Side Trash Cans */}
                      <div className={`flex items-center gap-1.5 bg-[#00271D]/90 backdrop-blur-md px-2 py-1.5 rounded-xl border shadow-xl ${
                        isSelected ? 'border-[#00A77C] bg-[#00271D]' : 'border-[#00A77C]/40'
                      }`}>
                        {/* Left Trash Can: Biodegradable */}
                        <div className="flex flex-col items-center">
                          <div className={`p-1 rounded-md flex items-center justify-center transition-colors ${
                            loc.bioFull ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
                          }`}>
                            <Trash2 size={12} strokeWidth={2.5} />
                          </div>
                          <span className="text-[6px] font-black text-emerald-300 uppercase tracking-tighter mt-0.5">Bio</span>
                        </div>

                        {/* Right Trash Can: Non-Biodegradable */}
                        <div className="flex flex-col items-center">
                          <div className={`p-1 rounded-md flex items-center justify-center transition-colors ${
                            loc.nonBioFull ? 'bg-rose-500 text-white' : 'bg-sky-500 text-white'
                          }`}>
                            <Trash2 size={12} strokeWidth={2.5} />
                          </div>
                          <span className="text-[6px] font-black text-sky-300 uppercase tracking-tighter mt-0.5">Non-Bio</span>
                        </div>
                      </div>

                      {/* Location Tooltip label */}
                      <div className={`absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded bg-black/80 text-white text-[8px] font-bold pointer-events-none transition-opacity ${
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        {loc.name}
                      </div>
                    </div>
                  );
                })}

                {isCustomDebrisPin && gpsCoords && (
                  <div
                    style={{ left: `${((gpsCoords.lng - 120.9820) / 0.0060) * 100}%`, top: `${((14.6030 - gpsCoords.lat) / 0.0050) * 100}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-rose-500 border border-rose-400 text-white shadow-xl animate-bounce z-30 flex items-center justify-center"
                  >
                    <MapPin size={16} className="stroke-[2.5]" />
                  </div>
                )}
              </div>

              {isPinningMode && (
                <p className="text-xs text-[#00A77C] font-semibold text-center mt-1.5 animate-pulse flex items-center justify-center gap-1">
                  <Target size={13} />
                  <span>Pinning Mode active! Tap anywhere on grid map to mark scattered trash location.</span>
                </p>
              )}
            </div>
          </div>

          {/* Card 3: Select Category Item Grid (Matches Screenshot 699) */}
          {activeMeta && (
            <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-md p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-[#00271D]/60" />
                <h3 className="text-xs font-bold text-[#00271D]">
                  {activeMeta.itemsLabel}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {activeMeta.items.map(item => {
                  const isSelected = selectedItem === item.label;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemSelect(item.label)}
                      className={`flex items-center gap-2.5 rounded-2xl border p-3.5 text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-400 text-blue-900 font-bold shadow-xs'
                          : 'bg-white border-gray-200/80 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-[#00A77C]/10 text-[#00A77C]">
                        <activeMeta.icon size={15} />
                      </div>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card 4 & 5: Condition & Urgency Side-by-Side (Matches Screenshot 700) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Condition Card */}
            <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-md p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-[#00271D]/60" />
                <h3 className="text-xs font-bold text-[#00271D]">Condition</h3>
              </div>

              <div className="space-y-2">
                {CONDITIONS.map(cond => {
                  const isSelected = selectedCondition === cond.id;
                  return (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => handleConditionSelect(cond.id)}
                      className={`w-full text-left p-3 rounded-2xl border text-xs transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-400 text-blue-900 shadow-2xs font-bold'
                          : 'bg-white border-gray-200/80 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`mt-0.5 h-3.5 w-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <div>
                        <p className="font-bold text-xs">{cond.label}</p>
                        <p className="text-[10px] text-gray-400 font-normal mt-0.5">{cond.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Urgency Level Card */}
            <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-md p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#00271D]/60" />
                <h3 className="text-xs font-bold text-[#00271D]">Urgency Level</h3>
              </div>

              <div className="space-y-2">
                {URGENCIES.map(urg => {
                  const isSelected = selectedUrgencyState === urg.value;
                  return (
                    <button
                      key={urg.id}
                      type="button"
                      onClick={() => handleUrgencySelect(urg.value)}
                      className={`w-full text-left p-3 rounded-2xl border text-xs transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-400 text-amber-900 shadow-2xs font-bold'
                          : 'bg-white border-gray-200/80 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`mt-0.5 h-3.5 w-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        isSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <div>
                        <p className="font-bold text-xs">{urg.label}</p>
                        <p className="text-[10px] text-gray-400 font-normal mt-0.5">{urg.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Card 6: Additional Notes (Matches Screenshot 700) */}
          <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-md p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[#00271D]/60" />
              <h3 className="text-xs font-bold text-[#00271D]">Additional Notes <span className="text-gray-400 font-normal">(optional)</span></h3>
            </div>

            <textarea
              rows={3}
              maxLength={300}
              placeholder="Describe the issue..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full resize-none rounded-2xl border border-gray-200 bg-[#F8FAFC] p-3.5 text-xs text-[#00271D] outline-none transition-all focus:border-blue-400 focus:bg-white placeholder:text-gray-400 font-medium"
            />
            <p className="text-[10px] text-gray-400 font-medium">
              {notes.length}/300 characters
            </p>
          </div>

          {/* Submit Button & Subtext (Matches Screenshot 700) */}
          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !selectedItem || !selectedLocation}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Submitting Report...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Report</span>
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-gray-400 font-medium">
              Reports are reviewed by the appropriate department within 24 hours.
            </p>
          </div>

        </form>
      )}

    </div>
  );
};
