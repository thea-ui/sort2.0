import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle,
  Compass,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  RefreshCw,
  Scale,
  Search,
  Send,
  Sparkles,
  Tag,
  Trash2,
  Trophy,
  X,
  Flame,
  Video,
  Upload
} from 'lucide-react';
import { User, Bin, SystemSettings, WasteCategory } from '../../../types';

interface SubmitReportTabProps {
  currentUser: User;
  bins: Bin[];
  settings: SystemSettings;
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

const DEFAULT_LOCATIONS = [
  { name: 'Cafeteria – Block A', status: 'Available', isFull: false, lat: 14.6005, lng: 120.9835 },
  { name: 'Library Entrance', status: 'Unavailable', isFull: true, lat: 14.5988, lng: 120.9868 },
  { name: 'Gym Hallway', status: 'Available', isFull: false, lat: 14.6022, lng: 120.9830 },
  { name: 'Engineering Bldg – 2F', status: 'Available', isFull: false, lat: 14.5995, lng: 120.9855 },
  { name: 'Parking Lot B', status: 'Available', isFull: false, lat: 14.6010, lng: 120.9870 },
  { name: 'Science Hall Cafeteria Side', status: 'Unavailable', isFull: true, lat: 14.6018, lng: 120.9860 },
];

const CATEGORIES: { key: WasteCategory; label: string; icon: string; bg: string; text: string; border: string }[] = [
  { key: 'RECYCLABLE', label: 'Recyclable', icon: '♻️', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
  { key: 'ORGANIC', label: 'Organic', icon: '🍏', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  { key: 'HAZARDOUS', label: 'Hazardous', icon: '⚠️', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' },
  { key: 'GENERAL', label: 'General', icon: '🗑️', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' },
];

export const SubmitReportTab: React.FC<SubmitReportTabProps> = ({
  currentUser,
  bins,
  settings,
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
  sliderValue,
  setSliderValue,
  handleSubmit
}) => {
  const [searchLocation, setSearchLocation] = useState('');

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
          // Fallback if specific facingMode constraint fails
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
      setCameraError('Camera access not supported or permission denied. You can use native file upload or device camera.');
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

  const filteredLocations = DEFAULT_LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(searchLocation.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">

      {/* Hidden canvas element for frame snapshot */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Banner Alert (Matches Screenshot 688) */}
      <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 flex items-start sm:items-center gap-3.5 text-rose-900 shadow-sm">
        <div className="h-9 w-9 rounded-full bg-rose-100/90 border border-rose-200 flex items-center justify-center shrink-0">
          <AlertTriangle className="text-rose-500" size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm text-rose-950">Report a Full Trashbin</h3>
          <p className="text-xs text-rose-700/90 mt-0.5 font-medium">
            Take a photo, select location, and submit. MRF staff will handle the rest.
          </p>
        </div>
      </div>

      {/* Submission Success Toast */}
      {submitSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 animate-fade-in text-xs shadow-sm">
          <CheckCircle size={20} className="shrink-0 text-emerald-600" />
          <div>
            <p className="font-bold text-sm">Report Filed Successfully!</p>
            <p className="text-emerald-700 mt-0.5">
              Awarded <span className="font-bold">{settings.pointsPerReport} points</span> after human verification review.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Card 1: Photo Evidence */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3.5">
            <ImageIcon size={18} className="text-gray-500" />
            <span>Photo Evidence</span>
            <span className="text-rose-500">*</span>
          </h3>

          <div className="bg-slate-900 rounded-xl overflow-hidden relative min-h-[260px] flex items-center justify-center border border-slate-800 group">

            {/* State A: Live HTML5 Camera Stream */}
            {isLiveCameraActive ? (
              <div className="relative w-full h-64 sm:h-72 bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Live Stream Overlay Controls */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-600 backdrop-blur-sm cursor-pointer transition-transform active:scale-95"
                    title="Close Camera"
                  >
                    <X size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={snapPhoto}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-full shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Camera size={16} />
                    <span>Capture Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-600 backdrop-blur-sm cursor-pointer transition-transform active:scale-95"
                    title="Flip Camera (Front/Rear)"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>
            ) : isCapturing ? (
              /* State B: Mock capture spinner */
              <div className="text-center space-y-2 py-10 animate-pulse">
                <Camera className="mx-auto text-emerald-400" size={32} />
                <p className="text-xs font-bold text-emerald-300 tracking-wide uppercase">Accessing Camera Preview...</p>
              </div>
            ) : capturedImage ? (
              /* State C: Captured Photo View */
              <div className="relative w-full h-64 sm:h-72 flex items-center justify-center bg-black/90">
                <img
                  src={capturedImage}
                  alt="Waste verification evidence"
                  className="max-h-full max-w-full object-contain"
                />

                {/* Photo Ready Badge (Matches Screenshot 688) */}
                <div className="absolute bottom-3 left-3 bg-emerald-950/90 border border-emerald-600/80 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md backdrop-blur-sm">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span>Photo ready</span>
                </div>

                {/* Remove Photo Red X Circle Button (Matches Screenshot 688) */}
                {setCapturedImage && (
                  <button
                    type="button"
                    onClick={() => setCapturedImage(null)}
                    title="Remove Photo"
                    className="absolute top-3 right-3 h-8 w-8 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            ) : (
              /* State D: Default Upload & Camera Options */
              <div className="text-center space-y-3 py-8 px-4 w-full">
                <div className="h-12 w-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto border border-slate-700">
                  <Camera size={22} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-300">Upload or capture photo evidence</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Works on desktop webcams & mobile cameras (iOS & Android)</p>
                </div>

                {cameraError && (
                  <p className="text-[11px] text-amber-400 font-medium bg-amber-950/40 border border-amber-800/60 p-2 rounded-lg max-w-md mx-auto">
                    {cameraError}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Video size={14} />
                    <span>Live Device Camera</span>
                  </button>

                  <label className="py-2 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-all flex items-center gap-1.5 active:scale-95">
                    <Upload size={14} />
                    <span>Device Gallery / Camera</span>
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
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 rounded-lg text-[11px] font-medium shadow-sm cursor-pointer transition-all flex items-center gap-1"
                  >
                    <span>Mock Demo</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Bin Location & Map */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <MapPin size={18} className="text-gray-500" />
              <span>Bin Location</span>
              <span className="text-rose-500">*</span>
            </h3>

            {/* Map Pinning Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setIsPinningMode(!isPinningMode)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto ${
                isPinningMode
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Compass size={14} className={isPinningMode ? 'animate-spin' : ''} />
              <span>{isPinningMode ? 'Pinning Mode Active' : '📍 Pin Scattered Trash'}</span>
            </button>
          </div>

          {/* Search Campus Location Input (Matches Screenshot 688) */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search campus location..."
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 font-medium placeholder-gray-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all"
            />
          </div>

          {/* Selectable Location List (Matches Screenshot 688) */}
          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-150 max-h-48 overflow-y-auto bg-white">
            {filteredLocations.map((loc) => {
              const isSelected = locationName === loc.name;
              return (
                <div
                  key={loc.name}
                  onClick={() => {
                    setLocationName(loc.name);
                    setBinId(null);
                    setIsScatteredDebris(false);
                    setGpsCoords({ lat: loc.lat, lng: loc.lng });
                  }}
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-rose-50/60 font-semibold'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${loc.isFull ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    <span className={`text-xs ${isSelected ? 'text-gray-900 font-bold' : 'text-gray-700 font-medium'}`}>
                      {loc.name}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    loc.isFull
                      ? 'bg-rose-100 text-rose-700 border-rose-200'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}>
                    {loc.status}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Interactive Campus Grid Map Component */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Campus Map Grid View</span>
              {locationName && <span className="text-emerald-600 normal-case font-semibold truncate max-w-[200px]">Selected: {locationName}</span>}
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
                setBinId(null);
                setIsScatteredDebris(true);
                setLocationName(`Scattered Debris at Grid [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
              }}
              className={`relative w-full h-[280px] rounded-xl border bg-slate-900 border-slate-950 overflow-hidden shadow-inner flex items-center justify-center transition-all ${
                isPinningMode ? 'cursor-crosshair ring-2 ring-emerald-500/50' : 'cursor-default'
              }`}
            >
              {/* SVG Blueprint Grid */}
              <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="campus-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#campus-grid)" />
                <rect x="15%" y="10%" width="20%" height="15%" rx="8" fill="#475569" />
                <text x="25%" y="19%" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Sports Gym</text>

                <rect x="65%" y="12%" width="22%" height="18%" rx="8" fill="#475569" />
                <text x="76%" y="22%" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Science Hall</text>

                <circle cx="50%" cy="50%" r="35" fill="#334155" />
                <text x="50%" y="51%" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Quad</text>

                <rect x="10%" y="70%" width="25%" height="18%" rx="8" fill="#475569" />
                <text x="22%" y="81%" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Chemistry Lab</text>

                <rect x="60%" y="72%" width="28%" height="18%" rx="8" fill="#475569" />
                <text x="74%" y="83%" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle">Main Library</text>
              </svg>

              <div className="absolute top-2 left-2 bg-slate-800/80 backdrop-blur-sm px-2 py-1 rounded text-[8px] text-slate-350 font-bold uppercase border border-slate-700 pointer-events-none">
                Interactive Grid Coordinate System
              </div>

              {/* Dynamic Bins */}
              {bins.map(bin => {
                const minLat = 14.5980;
                const maxLat = 14.6030;
                const minLng = 120.9820;
                const maxLng = 120.9880;

                const pctY = ((maxLat - bin.coordinates.lat) / (maxLat - minLat)) * 100;
                const pctX = ((bin.coordinates.lng - minLng) / (maxLng - minLng)) * 100;

                const isSelected = binId === bin.id || locationName === bin.locationName;
                const unavail = bin.activeDispatch || bin.fillLevel >= 85;

                const trashColor = unavail
                  ? 'text-rose-400 bg-rose-950/80 border-rose-800'
                  : 'text-emerald-400 bg-emerald-950/80 border-emerald-800';

                return (
                  <div
                    key={bin.id}
                    style={{ left: `${pctX}%`, top: `${pctY}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setBinId(bin.id);
                      setIsScatteredDebris(false);
                      setGpsCoords(bin.coordinates);
                      setLocationName(bin.locationName);
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-lg border flex flex-col items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-all select-none z-20 ${trashColor} ${
                      isSelected ? 'ring-2 ring-emerald-400 scale-110' : ''
                    }`}
                  >
                    <Trash2 size={12} className="stroke-[2.5]" />
                    <span className="text-[5.5px] font-black block text-center uppercase tracking-wider mt-0.5">{bin.type.slice(0, 4)}</span>
                  </div>
                );
              })}

              {/* Pin Marker */}
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
              <p className="text-xs text-emerald-600 font-semibold text-center mt-1.5 animate-pulse">
                🎯 Pinning Mode active! Tap anywhere on grid map to mark scattered trash location.
              </p>
            )}
          </div>
        </div>

        {/* Card 3: Waste Category */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Tag size={18} className="text-gray-500" />
            <span>Waste Category</span>
            <span className="text-rose-500">*</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {CATEGORIES.map(cat => {
              const isSelected = category === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory && setCategory(cat.key)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? `${cat.bg} ${cat.border} ring-2 ring-emerald-500/20 font-bold`
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-lg">{cat.icon}</div>
                  <span className={`text-xs font-bold mt-2 ${isSelected ? cat.text : 'text-gray-700'}`}>
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 4: Urgency Level (Matches Screenshot 688 & 689) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow space-y-3.5">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle size={18} className="text-gray-500" />
            <span>Urgency Level</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { level: 'LOW', title: 'Low', desc: 'Not full yet, but reported' },
              { level: 'MEDIUM', title: 'Normal', desc: 'Full, needs collection' },
              { level: 'HIGH', title: 'Urgent', desc: 'Overflowing / hazard' },
            ].map(item => {
              const isSelected = urgency === item.level;
              return (
                <div
                  key={item.level}
                  onClick={() => setUrgency(item.level as any)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                    isSelected
                      ? item.level === 'HIGH'
                        ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
                        : item.level === 'MEDIUM'
                        ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20'
                        : 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? item.level === 'HIGH'
                          ? 'border-rose-600 bg-rose-600'
                          : item.level === 'MEDIUM'
                          ? 'border-amber-500 bg-amber-500'
                          : 'border-emerald-600 bg-emerald-600'
                        : 'border-gray-300'
                    }`}>
                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{item.title}</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 5: Additional Notes (optional) (Matches Screenshot 689) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow space-y-3">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <MessageSquare size={18} className="text-gray-500" />
            <span>Additional Notes</span>
            <span className="text-gray-400 font-normal text-xs">(optional)</span>
          </h3>

          <div className="space-y-1.5">
            <textarea
              rows={3}
              maxLength={300}
              placeholder="Describe what you see... e.g. 'Bin overflowing with plastic cups since morning'"
              value={reportDesc}
              onChange={e => setReportDesc(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all resize-none placeholder-gray-400"
            />
            <p className="text-[11px] text-gray-400 font-medium">
              {reportDesc.length}/300 characters
            </p>
          </div>
        </div>

        {/* Submit Report Button & SLA Notice (Matches Screenshot 689) */}
        <div className="space-y-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-75"
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

          <p className="text-center text-xs text-gray-500 font-medium">
            Reports are reviewed by MRF staff within 30 minutes during office hours.
          </p>
        </div>

      </form>
    </div>
  );
};
