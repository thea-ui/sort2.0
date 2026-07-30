import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  Compass,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Tag,
  X,
  Video,
  Upload,
  Droplets,
  Recycle,
  Map as MapIcon,
  PackageX,
  Target,
  Sparkles,
  Info,
  Clock,
  Check,
  Trash2,
  Award,
  ArrowRight,
  FileText,
  PlusCircle,
} from 'lucide-react';
import { User, Bin, SystemSettings, WasteCategory, Report } from '../../../types';

interface SubmitReportTabProps {
  currentUser: User;
  bins: Bin[];
  reports?: Report[];
  settings: SystemSettings;
  setActiveTab?: (tab: string) => void;
  createReport: (params: any) => void;
  reportTitle: string;
  setReportTitle: (v: string) => void;
  reportDesc: string;
  setReportDesc: (v: string) => void;
  category?: WasteCategory;
  setCategory?: (v: WasteCategory) => void;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  setUrgency: (v: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  locationName: string;
  setLocationName: (v: string) => void;
  isCapturing: boolean;
  handleCapture: () => void;
  capturedImage: string | null;
  setCapturedImage?: (v: string | null) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  gpsLoading: boolean;
  gpsCoords: { lat: number; lng: number } | null;
  setGpsCoords: (coords: { lat: number; lng: number } | null) => void;
  isSubmitting: boolean;
  submitSuccess: boolean;
  binId: string | null;
  setBinId: (v: string | null) => void;
  isScatteredDebris: boolean;
  setIsScatteredDebris: (v: boolean) => void;
  isPinningMode: boolean;
  setIsPinningMode: (v: boolean) => void;
  selectedMaterials: string[];
  setSelectedMaterials: (v: any) => void;
  sliderValue: number;
  setSliderValue: (v: number) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

// Station & Category Helpers
type BinCategory = 'BIODEGRADABLE' | 'NON_BIODEGRADABLE' | 'RECYCLABLE';
export type BinReportStatusState = 'AVAILABLE' | 'REPORTED_FULL' | 'DISPATCHED' | 'NO_BIN';

interface BinSlot {
  bin: Bin | null;
  type: BinCategory;
  statusState: BinReportStatusState;
  activeReport?: Report;
}

interface StationCluster {
  locationName: string;
  coordinates: { lat: number; lng: number };
  slots: [BinSlot, BinSlot, BinSlot];
}

const CATEGORY_ORDER: BinCategory[] = ['BIODEGRADABLE', 'NON_BIODEGRADABLE', 'RECYCLABLE'];

const CAT_META: Record<BinCategory, { label: string; short: string; bg: string; border: string; text: string; Icon: React.FC<{ size?: number; className?: string }>; desc: string }> = {
  BIODEGRADABLE:     { label: 'Biodegradable',     short: 'Bio', bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-600', Icon: Droplets, desc: 'Food scraps, organic waste & plant leaves' },
  NON_BIODEGRADABLE: { label: 'Non-Biodegradable', short: 'Non', bg: 'bg-rose-500',    border: 'border-rose-400',    text: 'text-rose-600',    Icon: PackageX, desc: 'Wrappers, plastic films & residual waste' },
  RECYCLABLE:        { label: 'Recyclable',         short: 'Rec', bg: 'bg-sky-500',     border: 'border-sky-400',     text: 'text-sky-600',     Icon: Recycle,  desc: 'PET bottles, aluminum cans, glass & cardboard' },
};

function getBinSlotDetails(bin: Bin | null, reports: Report[] = []): { statusState: BinReportStatusState; activeReport?: Report } {
  if (!bin) return { statusState: 'NO_BIN' };

  const activeReport = reports.find(r => 
    r.locationName.toLowerCase() === bin.locationName.toLowerCase() &&
    r.category === bin.type &&
    (r.status === 'PENDING' || r.status === 'DISPATCHED')
  );

  if (activeReport?.status === 'DISPATCHED' || bin.activeDispatch) {
    return { statusState: 'DISPATCHED', activeReport };
  }

  if (activeReport?.status === 'PENDING' || bin.fillLevel >= 85) {
    return { statusState: 'REPORTED_FULL', activeReport };
  }

  return { statusState: 'AVAILABLE' };
}

function groupStations(bins: Bin[], reports: Report[] = []): StationCluster[] {
  const map = new Map<string, { coords: { lat: number; lng: number }; byType: Map<BinCategory, Bin> }>();
  for (const bin of bins) {
    if (!map.has(bin.locationName)) map.set(bin.locationName, { coords: bin.coordinates, byType: new Map() });
    const t = bin.type as BinCategory;
    if (CATEGORY_ORDER.includes(t)) map.get(bin.locationName)!.byType.set(t, bin);
  }

  return Array.from(map.entries()).map(([locationName, data]) => ({
    locationName,
    coordinates: data.coords,
    slots: CATEGORY_ORDER.map(type => {
      const bin = data.byType.get(type) ?? null;
      const details = getBinSlotDetails(bin, reports);
      return {
        type,
        bin,
        statusState: details.statusState,
        activeReport: details.activeReport,
      };
    }) as [BinSlot, BinSlot, BinSlot],
  }));
}

export const SubmitReportTab: React.FC<SubmitReportTabProps> = ({
  currentUser,
  bins,
  reports = [],
  settings,
  setActiveTab,
  reportTitle,
  setReportTitle,
  reportDesc,
  setReportDesc,
  category = 'RECYCLABLE',
  setCategory,
  urgency,
  setUrgency,
  locationName,
  setLocationName,
  isCapturing,
  handleCapture,
  capturedImage,
  setCapturedImage,
  handleFileChange,
  gpsCoords,
  setGpsCoords,
  isSubmitting,
  submitSuccess,
  binId,
  setBinId,
  isScatteredDebris,
  setIsScatteredDebris,
  isPinningMode,
  setIsPinningMode,
  selectedMaterials,
  setSelectedMaterials,
  handleSubmit
}) => {
  const [searchLocation, setSearchLocation] = useState('');
  const [activePopoverStation, setActivePopoverStation] = useState<string | null>(null);

  const stations = useMemo(() => groupStations(bins, reports), [bins, reports]);
  const filteredStations = useMemo(
    () => stations.filter(s => s.locationName.toLowerCase().includes(searchLocation.toLowerCase())),
    [stations, searchLocation]
  );

  // Active station selection
  const activeStation = useMemo(
    () => stations.find(s => s.locationName === locationName),
    [stations, locationName]
  );

  // Select Category & Sync Title/Materials
  const handleSelectCategoryAndBin = (selectedCat: WasteCategory, targetBinId?: string | null) => {
    setCategory?.(selectedCat);
    const catLabel = selectedCat === 'BIODEGRADABLE' ? 'Biodegradable' : selectedCat === 'NON_BIODEGRADABLE' ? 'Non-Biodegradable' : 'Recyclable';
    setReportTitle(catLabel);
    setSelectedMaterials([catLabel]);

    if (targetBinId) {
      setBinId(targetBinId);
    } else if (activeStation) {
      const slot = activeStation.slots.find(s => s.type === selectedCat);
      if (slot?.bin) {
        setBinId(slot.bin.id);
      }
    }
  };

  // Station Selection from Map Pin or Pill
  const handleSelectStation = (station: StationCluster, specificBinId?: string | null, binType?: BinCategory) => {
    setLocationName(station.locationName);
    setGpsCoords(station.coordinates);
    setIsScatteredDebris(false);

    const targetType = binType || (category as BinCategory) || 'RECYCLABLE';
    const slot = station.slots.find(s => s.type === targetType && s.bin !== null) || station.slots.find(s => s.bin !== null);
    
    if (specificBinId && binType) {
      handleSelectCategoryAndBin(binType, specificBinId);
    } else if (slot && slot.bin) {
      handleSelectCategoryAndBin(slot.type, slot.bin.id);
    } else {
      setBinId(null);
    }
  };

  // Live Camera states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsLiveCameraActive(false);
    setCameraError(null);
  };

  const startCamera = async (facing: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    setIsLiveCameraActive(true);

    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }

    try {
      let mediaStream: MediaStream;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } }
          });
        } catch {
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        setCameraStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      } else {
        throw new Error('MediaDevices API not supported on this browser');
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Camera access not supported or permission denied. Please use file upload.');
    }
  };

  const snapPhoto = () => {
    if (!videoRef.current || !setCapturedImage) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
    }
    stopCamera();
  };

  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Check if current user already filed an active report for the selected bin
  const isDuplicateActiveReport = useMemo(() => {
    if (!locationName || !category) return false;
    return reports.some(r =>
      (r.reporterId === currentUser.id || r.reporterId === 'current') &&
      r.locationName.toLowerCase() === locationName.toLowerCase() &&
      r.category === category &&
      (r.status === 'PENDING' || r.status === 'DISPATCHED')
    );
  }, [reports, currentUser, locationName, category]);

  // FULL SUBMISSION SUCCESS INDICATOR VIEW
  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-12 pt-4">
        <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-3xl p-8 shadow-xl text-center space-y-6">
          
          {/* Animated Success Icon & Status Pill */}
          <div className="flex flex-col items-center gap-3">
            <div className="h-20 w-20 rounded-full bg-[#00A77C]/15 flex items-center justify-center text-[#00A77C] ring-8 ring-[#00A77C]/10 shadow-inner">
              <CheckCircle size={44} strokeWidth={2.5} className="animate-bounce" />
            </div>
            <div className="bg-[#C69B26]/15 border border-[#C69B26]/30 text-[#C69B26] px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-sm">
              <Award size={13} /> Pending Admin Verification
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-heading font-black text-[#00271D]">Report Successfully Submitted!</h2>
            <p className="text-xs text-[#00271D]/70 font-medium mt-1 max-w-md mx-auto">
              Your waste report is submitted and pending Admin verification. Once verified by Admin and MRF completes the cleanup, points will be awarded based on reporting order (1st: 15 pts, 2nd: 10 pts, 3rd: 5 pts).
            </p>
          </div>

          {/* Submitted Summary Details Card */}
          <div className="p-5 bg-gray-50/80 border border-gray-200 rounded-2xl text-left space-y-3">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Report Details Summary</p>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-400 font-medium block text-[10px]">Location</span>
                <span className="font-bold text-[#00271D] flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-[#00A77C]" /> {locationName || 'Campus Station'}
                </span>
              </div>

              <div>
                <span className="text-gray-400 font-medium block text-[10px]">Waste Category</span>
                <span className="font-bold text-[#00A77C] flex items-center gap-1 mt-0.5">
                  <Tag size={12} /> {category}
                </span>
              </div>

              <div>
                <span className="text-gray-400 font-medium block text-[10px]">Urgency</span>
                <span className="font-bold text-[#00271D] flex items-center gap-1 mt-0.5">
                  <AlertTriangle size={12} className={urgency === 'HIGH' ? 'text-rose-500' : 'text-[#00A77C]'} /> {urgency}
                </span>
              </div>

              <div>
                <span className="text-gray-400 font-medium block text-[10px]">Status</span>
                <span className="font-extrabold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md inline-block mt-0.5 text-[10px]">
                  ⏳ FILED · PENDING ADMIN VERIFICATION
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab?.('report-history')}
              className="flex-1 py-3.5 px-4 bg-[#00271D] hover:bg-[#00382a] text-white font-bold text-xs rounded-full shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <FileText size={15} />
              <span>View My Report History</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (setCapturedImage) setCapturedImage(null);
                setLocationName('');
                setReportDesc('');
              }}
              className="flex-1 py-3.5 px-4 bg-[#00A77C] hover:bg-[#008f6a] text-white font-bold text-xs rounded-full shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <PlusCircle size={15} />
              <span>File Another Report</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in pb-12">
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Banner Alert */}
      <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#00A77C]/15 text-[#00A77C] flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm text-[#00271D]">Report Campus Waste</h2>
            <p className="text-xs text-[#00271D]/70 font-medium">
              Snap photo → Tap map pin → Submit. Points awarded upon MRF resolution!
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 bg-[#C69B26]/10 border border-[#C69B26]/30 text-[#C69B26] px-3 py-1.5 rounded-full text-xs font-bold shrink-0">
          <span>1st: 15pts · 2nd: 10pts · 3rd: 5pts</span>
        </div>
      </div>

      {/* Duplicate Active Report Warning Banner */}
      {isDuplicateActiveReport && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl flex items-start gap-3 text-xs shadow-sm animate-fade-in">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-950">You Have Already Reported This Trash Bin</p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              Per user policy, you can only submit <strong>1 report per specific trash bin</strong> until MRF staff complete the cleanup. Your existing report is registered and pending MRF action.
            </p>
          </div>
        </div>
      )}

      {/* SINGLE COLUMN FORM */}
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* STEP 1: PHOTO EVIDENCE */}
        <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-bold text-[#00271D] flex items-center gap-2">
              <ImageIcon size={16} className="text-[#00A77C]" />
              <span>1. Photo Evidence</span>
              <span className="text-rose-500">*</span>
            </h3>
            {capturedImage && (
              <span className="text-[10px] font-bold text-[#00A77C] bg-[#00A77C]/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle size={10} /> Photo Attached
              </span>
            )}
          </div>

          <div className="bg-[#00271D] rounded-2xl overflow-hidden relative min-h-[220px] flex items-center justify-center border border-[#00271D] group">
            {isLiveCameraActive ? (
              <div className="relative w-full h-64 bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-2 rounded-xl bg-slate-800/80 text-slate-200 border border-slate-600 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={snapPhoto}
                    className="px-4 py-2 bg-[#00A77C] hover:bg-[#008f6a] text-white font-bold text-xs rounded-full shadow-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera size={14} />
                    <span>Snap Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-2 rounded-xl bg-slate-800/80 text-slate-200 border border-slate-600 cursor-pointer"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>
            ) : isCapturing ? (
              <div className="text-center space-y-2 py-8 animate-pulse">
                <Camera className="mx-auto text-[#00A77C]" size={28} />
                <p className="text-xs font-bold text-white tracking-wide uppercase">Opening Camera...</p>
              </div>
            ) : capturedImage ? (
              <div className="relative w-full h-64 flex items-center justify-center bg-black/90">
                <img
                  src={capturedImage}
                  alt="Waste verification evidence"
                  className="max-h-full max-w-full object-contain"
                />
                <div className="absolute bottom-2.5 left-2.5 bg-[#00271D]/90 border border-[#00A77C] text-[#00A77C] text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
                  <CheckCircle size={12} />
                  <span>Evidence Ready</span>
                </div>
                {setCapturedImage && (
                  <button
                    type="button"
                    onClick={() => setCapturedImage(null)}
                    title="Remove Photo"
                    className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg cursor-pointer transition-all"
                  >
                    <X size={15} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center space-y-2.5 py-6 px-4 w-full">
                <div className="h-10 w-10 rounded-xl bg-[#00A77C]/20 text-[#00A77C] flex items-center justify-center mx-auto border border-[#00A77C]/40">
                  <Camera size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Upload or capture photo evidence</p>
                  <p className="text-[10px] text-white/60 mt-0.5">Works on desktop webcams & mobile cameras</p>
                </div>

                {cameraError && (
                  <p className="text-[10px] text-amber-300 font-medium bg-amber-950/40 border border-amber-800/60 p-2 rounded-lg max-w-md mx-auto">
                    {cameraError}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="py-1.5 px-3.5 bg-[#00A77C] hover:bg-[#008f6a] text-white rounded-full text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Video size={13} />
                    <span>Live Camera</span>
                  </button>

                  <label className="py-1.5 px-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1.5">
                    <Upload size={13} />
                    <span>Gallery Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleCapture}
                    className="py-1.5 px-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 rounded-full text-[10px] font-medium cursor-pointer"
                  >
                    <span>Demo Photo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STEP 2: LOCATION & BIN CATEGORY SELECTOR (RESPONSIVE MAP + AUTO-ADJUSTING POPOVER) */}
        <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-[#00A77C]/15 text-[#00A77C] flex items-center justify-center">
                <MapPin size={15} />
              </div>
              <h3 className="text-sm font-heading font-bold text-[#00271D]">
                2. Location & Waste Category
                <span className="text-rose-500 ml-1">*</span>
              </h3>
            </div>

            <button
              type="button"
              onClick={() => setIsPinningMode(!isPinningMode)}
              className={`px-3 py-1 text-xs font-bold rounded-full border transition-all flex items-center gap-1.5 cursor-pointer w-fit ${
                isPinningMode
                  ? 'bg-[#00A77C] border-[#00A77C] text-white shadow-xs'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Compass size={13} className={isPinningMode ? 'animate-spin' : ''} />
              <span>{isPinningMode ? 'Pinning Active (Tap Map)' : 'Pin Scattered Waste'}</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search campus location or building..."
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-[#00271D] font-medium outline-none focus:border-[#00A77C] focus:bg-white transition-all shadow-xs"
            />
          </div>

          {/* Generous & Responsive Campus Map Container */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Interactive Campus Map (Tap Circular Trash Pin)</span>
              {locationName && (
                <span className="text-[#00A77C] normal-case font-bold truncate max-w-[240px]">
                  Selected: {locationName}
                </span>
              )}
            </div>

            <div
              onClick={(e) => {
                if (!isPinningMode) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                const pctX = clickX / rect.width;
                const pctY = clickY / rect.height;

                const minLat = 14.5980, maxLat = 14.6030, minLng = 120.9820, maxLng = 120.9880;
                const lat = maxLat - pctY * (maxLat - minLat);
                const lng = minLng + pctX * (maxLng - minLng);

                setGpsCoords({ lat, lng });
                setBinId(null);
                setIsScatteredDebris(true);
                setLocationName(`Scattered Debris at Grid [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
                setActivePopoverStation(null);
              }}
              className={`relative w-full h-[360px] sm:h-[420px] rounded-2xl border border-gray-200 bg-[#f8fafc] overflow-hidden shadow-inner flex items-center justify-center transition-all ${
                isPinningMode ? 'cursor-crosshair ring-2 ring-[#00A77C]' : 'cursor-default'
              }`}
            >
              {/* Grid Overlay */}
              <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="campus-grid-clean" width="28" height="28" patternUnits="userSpaceOnUse">
                    <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#E2E8F0" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#campus-grid-clean)" />
                <rect x="15%" y="10%" width="20%" height="15%" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                <text x="25%" y="19%" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Sports Gym</text>

                <rect x="65%" y="12%" width="22%" height="18%" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                <text x="76%" y="22%" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Science Hall</text>

                <circle cx="50%" cy="50%" r="35" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                <text x="50%" y="51%" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Quad</text>

                <rect x="10%" y="70%" width="25%" height="18%" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                <text x="22%" y="81%" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Chemistry Lab</text>

                <rect x="60%" y="72%" width="28%" height="18%" rx="8" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1" />
                <text x="74%" y="83%" fill="#475569" fontSize="9" fontWeight="bold" textAnchor="middle">Main Library</text>
              </svg>

              <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-[#00271D] font-bold border border-gray-200 shadow-xs pointer-events-none flex items-center gap-1 z-10">
                <MapIcon size={12} className="text-[#00A77C]" />
                <span>Map Pins</span>
              </div>

              {/* Clean Circular Trash Can Icons with Smart Auto-Adjusting Popover */}
              {filteredStations.map(station => {
                const minLat = 14.5975, maxLat = 14.6035, minLng = 120.9815, maxLng = 120.9885;
                const pctY = ((maxLat - station.coordinates.lat) / (maxLat - minLat)) * 100;
                const pctX = ((station.coordinates.lng - minLng) / (maxLng - minLng)) * 100;
                const isSel = locationName === station.locationName;
                const isPopoverOpen = activePopoverStation === station.locationName;
                const hasReportedFull = station.slots.some(s => s.statusState === 'REPORTED_FULL' || s.statusState === 'DISPATCHED');

                // Dynamic Popover Positioning Logic
                const isNearTopEdge = pctY < 55;
                const isNearLeftEdge = pctX < 25;
                const isNearRightEdge = pctX > 75;

                const verticalPosClass = isNearTopEdge ? 'top-12' : 'bottom-12';
                const horizontalPosClass = isNearLeftEdge
                  ? 'left-0 translate-x-0'
                  : isNearRightEdge
                  ? 'right-0 translate-x-0'
                  : 'left-1/2 -translate-x-1/2';

                return (
                  <div key={station.locationName} style={{ left: `${pctX}%`, top: `${pctY}%` }} className="absolute">
                    {/* Trash Circle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStation(station);
                        setActivePopoverStation(isPopoverOpen ? null : station.locationName);
                      }}
                      className={`relative -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md border-2 ${
                        isSel
                          ? 'bg-[#00A77C] border-white text-white ring-4 ring-[#00A77C]/30 scale-110 z-30'
                          : hasReportedFull
                          ? 'bg-rose-500 border-white text-white ring-4 ring-rose-400/40 animate-pulse z-20'
                          : 'bg-white border-[#00A77C] text-[#00A77C] hover:bg-emerald-50 hover:scale-105 z-10'
                      }`}
                      title={station.locationName}
                    >
                      <Trash2 size={18} strokeWidth={2.2} />

                      {/* Micro Reported Alert Badge */}
                      {hasReportedFull && (
                        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-rose-600 rounded-full border border-white flex items-center justify-center">
                          <AlertTriangle size={8} className="text-white" />
                        </span>
                      )}
                    </button>

                    {/* Auto-Adjusting Smart Popover Card */}
                    {(isPopoverOpen || (isSel && activePopoverStation === station.locationName)) && (
                      <div className={`absolute z-40 bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-xl border border-gray-200 w-56 text-left animate-fade-in ${verticalPosClass} ${horizontalPosClass}`}>
                        <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-1.5">
                          <p className="text-[10px] font-extrabold text-[#00271D] truncate max-w-[150px]">
                            {station.locationName}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActivePopoverStation(null); }}
                            className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </div>

                        {/* Category Quick Select Buttons inside Popover */}
                        <div className="space-y-1">
                          {station.slots.map(slot => {
                            const meta = CAT_META[slot.type];
                            const isReported = slot.statusState === 'REPORTED_FULL' || slot.statusState === 'DISPATCHED';
                            const isThisSelected = binId === slot.bin?.id;
                            const Icon = meta.Icon;

                            return (
                              <button
                                key={slot.type}
                                type="button"
                                disabled={!slot.bin}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectStation(station, slot.bin?.id, slot.type);
                                  setActivePopoverStation(null);
                                }}
                                className={`w-full p-2 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                                  isThisSelected
                                    ? 'bg-[#00A77C]/15 border-[#00A77C] ring-1 ring-[#00A77C]/30 font-bold'
                                    : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                                } ${!slot.bin ? 'opacity-30 cursor-not-allowed' : ''}`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <div className={`h-5 w-5 rounded-lg text-white flex items-center justify-center shrink-0 ${isReported ? 'bg-rose-500' : meta.bg}`}>
                                    <Icon size={11} />
                                  </div>
                                  <span className="text-[10px] font-bold text-[#00271D] truncate">{meta.label}</span>
                                </div>
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${
                                  isReported ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {isReported ? 'FULL' : 'READY'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Custom Pin for Scattered Debris */}
              {isScatteredDebris && gpsCoords && (
                <div
                  style={{ left: `${((gpsCoords.lng - 120.9820) / 0.0060) * 100}%`, top: `${((14.6030 - gpsCoords.lat) / 0.0050) * 100}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-rose-500 border border-rose-400 text-white shadow-xl animate-bounce z-30 flex items-center justify-center"
                >
                  <MapPin size={16} className="stroke-[2.5]" />
                </div>
              )}
            </div>

            {isPinningMode && (
              <p className="text-xs text-[#00A77C] font-semibold text-center mt-1 animate-pulse flex items-center justify-center gap-1">
                <Target size={13} />
                <span>Tap anywhere on the map to pin scattered trash!</span>
              </p>
            )}
          </div>

          {/* Location Pills Bar */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Campus Locations</span>
            <div className="flex flex-wrap gap-1.5">
              {filteredStations.map((station) => {
                const isSel = locationName === station.locationName;
                const hasReported = station.slots.some(s => s.statusState === 'REPORTED_FULL' || s.statusState === 'DISPATCHED');
                return (
                  <button
                    key={station.locationName}
                    type="button"
                    onClick={() => {
                      handleSelectStation(station);
                      setActivePopoverStation(station.locationName);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSel
                        ? 'bg-[#00A77C] border-[#00A77C] text-white shadow-xs'
                        : 'bg-gray-50 border-gray-200 text-[#00271D]/80 hover:bg-emerald-50 hover:border-emerald-200'
                    }`}
                  >
                    <span>{station.locationName}</span>
                    {hasReported && (
                      <span className={`h-2 w-2 rounded-full ${isSel ? 'bg-white' : 'bg-rose-500 animate-ping'}`} title="Has reported full bins" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SINGLE UNIFIED WASTE CATEGORY SELECTOR */}
          {activeStation && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#00271D] flex items-center gap-1.5">
                  <Tag size={14} className="text-[#00A77C]" />
                  <span>Select Waste Category at {activeStation.locationName}:</span>
                </p>
                <span className="text-[10px] font-bold text-[#00A77C] bg-[#00A77C]/10 px-2 py-0.5 rounded-full">
                  1-Click Select
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {activeStation.slots.map(slot => {
                  const meta = CAT_META[slot.type];
                  const isSelectedCategory = category === slot.type;
                  const isReported = slot.statusState === 'REPORTED_FULL' || slot.statusState === 'DISPATCHED';
                  const Icon = meta.Icon;

                  return (
                    <button
                      key={slot.type}
                      type="button"
                      disabled={!slot.bin}
                      onClick={() => handleSelectCategoryAndBin(slot.type, slot.bin?.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between select-none relative overflow-hidden ${
                        isSelectedCategory
                          ? 'bg-[#00A77C]/15 border-[#00A77C] text-[#00271D] font-bold ring-2 ring-[#00A77C]/40 shadow-xs'
                          : 'bg-white border-gray-200 text-[#00271D]/70 hover:bg-gray-50 hover:border-[#00A77C]/40'
                      } ${!slot.bin ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-xl text-white ${meta.bg}`}>
                          <Icon size={18} />
                        </div>

                        {isReported ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500 text-white animate-pulse flex items-center gap-0.5">
                            <AlertTriangle size={9} /> Reported Full
                          </span>
                        ) : isSelectedCategory ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#00A77C] text-white">
                            Selected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                            Ready
                          </span>
                        )}
                      </div>

                      <div>
                        <p className={`text-xs font-bold ${isSelectedCategory ? 'text-[#00A77C]' : 'text-[#00271D]'}`}>
                          {meta.label}
                        </p>
                        <p className="text-[10px] text-[#00271D]/60 font-medium mt-0.5 leading-snug">
                          {meta.desc}
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-gray-500">Status:</span>
                          {isReported ? (
                            <span className="font-extrabold text-rose-600 flex items-center gap-1">
                              <Clock size={10} /> Pending Pick Up
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-600 flex items-center gap-1">
                              <Check size={10} /> Ready for Disposal
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Report Notice Banner */}
              {activeStation.slots.some(s => s.type === category && (s.statusState === 'REPORTED_FULL' || s.statusState === 'DISPATCHED')) && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-2.5 text-xs mt-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-950">Notice: Category Already Reported Full</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      The <span className="font-bold">{category}</span> bin at <span className="font-bold">{locationName}</span> has already been reported full by a campus user. MRF staff have been dispatched for collection.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* STEP 3: URGENCY LEVEL (DEFAULTS TO NORMAL) */}
        <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-3xl p-5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-heading font-bold text-[#00271D] flex items-center gap-2">
              <AlertTriangle size={16} className="text-[#00A77C]" />
              <span>3. Urgency Level</span>
            </h3>
            <span className="text-[10px] font-medium text-gray-400">Defaults to Normal</span>
          </div>

          <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100/80 rounded-2xl">
            {[
              { level: 'LOW', label: 'Low', desc: 'Not full yet' },
              { level: 'MEDIUM', label: 'Normal', desc: 'Needs pick up' },
              { level: 'HIGH', label: 'Urgent', desc: 'Overflowing' },
            ].map(item => {
              const isSelected = urgency === item.level;
              return (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => setUrgency(item.level as any)}
                  className={`py-2 px-2.5 rounded-xl text-center transition-all cursor-pointer select-none ${
                    isSelected
                      ? item.level === 'HIGH'
                        ? 'bg-rose-500 text-white font-bold shadow-xs'
                        : 'bg-[#00A77C] text-white font-bold shadow-xs'
                      : 'text-gray-600 hover:text-[#00271D]'
                  }`}
                >
                  <p className="text-xs font-bold leading-tight">{item.label}</p>
                  <p className={`text-[9px] mt-0.5 opacity-80 ${isSelected ? 'text-white' : 'text-gray-400'}`}>{item.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 4: ADDITIONAL NOTES (OPTIONAL) */}
        <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-3xl p-5 shadow-sm space-y-2">
          <h3 className="text-sm font-heading font-bold text-[#00271D] flex items-center gap-2">
            <MessageSquare size={16} className="text-[#00A77C]" />
            <span>4. Additional Notes</span>
            <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </h3>
          <textarea
            rows={2}
            maxLength={300}
            placeholder="e.g. 'Bin overflowing with plastic cups since morning'"
            value={reportDesc}
            onChange={e => setReportDesc(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-3 text-xs text-[#00271D] outline-none focus:border-[#00A77C] focus:bg-white transition-all resize-none"
          />
        </div>

        {/* SUBMIT REPORT BUTTON */}
        <div className="space-y-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !capturedImage || !locationName || isDuplicateActiveReport}
            className="w-full py-4 bg-[#00A77C] hover:bg-[#008f6a] text-white font-bold text-sm rounded-full shadow-md shadow-[#00A77C]/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Submitting Report...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>{isDuplicateActiveReport ? 'Bin Already Reported' : 'Submit Report'}</span>
              </>
            )}
          </button>

          {isDuplicateActiveReport ? (
            <p className="text-center text-[11px] text-amber-700 font-bold flex items-center justify-center gap-1">
              <AlertTriangle size={12} />
              <span>You have already reported this trashbin. Only 1 report per user per bin is allowed.</span>
            </p>
          ) : (!capturedImage || !locationName) ? (
            <p className="text-center text-[11px] text-amber-700 font-medium flex items-center justify-center gap-1">
              <Info size={12} />
              <span>Please attach photo evidence and select a location to submit.</span>
            </p>
          ) : null}

          <p className="text-center text-[11px] text-gray-500 font-medium">
            Points are awarded upon MRF final cleanup (1st reporter = 15 pts, 2nd = 10 pts, 3rd = 5 pts).
          </p>
        </div>

      </form>
    </div>
  );
};
