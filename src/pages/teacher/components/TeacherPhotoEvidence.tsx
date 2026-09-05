import React from 'react';
import { Camera, Video, Upload, RefreshCw, X, CheckCircle } from 'lucide-react';
import { useLiveCamera } from '../../../hooks/useLiveCamera';

interface TeacherPhotoEvidenceProps {
  capturedImage: string | null;
  setCapturedImage: (img: string | null) => void;
  isCapturing: boolean;
  handleCapture: () => void;
}

export const TeacherPhotoEvidence: React.FC<TeacherPhotoEvidenceProps> = ({
  capturedImage,
  setCapturedImage,
  isCapturing,
  handleCapture,
}) => {
  const { videoRef, canvasRef, isLiveCameraActive, cameraError, startCamera, stopCamera, snapPhoto, toggleCameraFacing } = useLiveCamera({
    onCapture: setCapturedImage,
  });

  return (
    <div className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-md p-6 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#00271D] flex items-center gap-2">
          <Camera size={16} className="text-[#00A77C]" />
          <span>Photo Evidence</span>
          <span className="text-rose-500">*</span>
        </h3>
        {capturedImage && (
          <span className="text-[10px] font-bold text-[#00A77C] bg-[#00A77C]/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle size={10} /> Photo Attached
          </span>
        )}
      </div>

      <div className="bg-[#00271D] rounded-2xl overflow-hidden relative min-h-[220px] flex items-center justify-center border border-[#00271D]">
        <canvas ref={canvasRef} className="hidden" />

        {isLiveCameraActive ? (
          <div className="relative w-full h-64 bg-black flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between gap-2 z-20">
              <button type="button" onClick={stopCamera} className="p-2 rounded-xl bg-slate-800/80 text-slate-200 border border-slate-600 cursor-pointer hover:bg-slate-700" title="Cancel Camera">
                <X size={16} />
              </button>
              <button type="button" onClick={snapPhoto} className="px-4 py-2 bg-[#00A77C] hover:bg-[#008f6a] text-white font-bold text-xs rounded-full shadow-lg flex items-center gap-1.5 cursor-pointer">
                <Camera size={14} />
                <span>Snap Photo</span>
              </button>
              <button type="button" onClick={toggleCameraFacing} className="p-2 rounded-xl bg-slate-800/80 text-slate-200 border border-slate-600 cursor-pointer hover:bg-slate-700" title="Flip Camera">
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
            <img src={capturedImage} alt="Photo Evidence" className="max-h-full max-w-full object-contain" />
            <div className="absolute bottom-2.5 left-2.5 bg-[#00271D]/90 border border-[#00A77C] text-[#00A77C] text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
              <CheckCircle size={12} />
              <span>Evidence Ready</span>
            </div>
            <button type="button" onClick={() => setCapturedImage(null)} title="Remove Photo" className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg cursor-pointer transition-all">
              <X size={15} strokeWidth={2.5} />
            </button>
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
              <button type="button" onClick={() => startCamera()} className="py-1.5 px-3.5 bg-[#00A77C] hover:bg-[#008f6a] text-white rounded-full text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1.5">
                <Video size={13} />
                <span>Live Camera</span>
              </button>
              <button type="button" onClick={handleCapture} className="py-1.5 px-3.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold border border-white/20 cursor-pointer transition-all flex items-center gap-1.5">
                <Camera size={13} />
                <span>Mock Photo</span>
              </button>
              <label className="py-1.5 px-3.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold border border-white/20 cursor-pointer transition-all flex items-center gap-1.5">
                <Upload size={13} />
                <span>Upload File</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const r = new FileReader();
                    r.onload = ev => setCapturedImage(ev.target?.result as string);
                    r.readAsDataURL(f);
                  }
                }} />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
