import React, { useState } from 'react';
import { Camera, Video, Upload, RefreshCw, X, CheckCircle, Maximize2 } from 'lucide-react';
import { useLiveCamera } from '../../../hooks/useLiveCamera';
import { CameraCaptureOverlay } from '../../../components/common/CameraCaptureOverlay';
import { PhotoLightbox } from '../../../components/common/PhotoLightbox';

interface StudentPhotoEvidenceProps {
  capturedImage: string | null;
  setCapturedImage: (img: string | null) => void;
  isCapturing: boolean;
  handleCapture: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const StudentPhotoEvidence: React.FC<StudentPhotoEvidenceProps> = ({
  capturedImage,
  setCapturedImage,
  isCapturing,
  handleCapture,
  handleFileChange,
}) => {
  const [showPreviewFull, setShowPreviewFull] = useState(false);
  const { videoRef, canvasRef, isLiveCameraActive, cameraError, startCamera, stopCamera, snapPhoto, toggleCameraFacing } = useLiveCamera({
    onCapture: setCapturedImage,
  });

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-white/80 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-heading font-bold text-[#00271D] flex items-center gap-2">
          <Camera size={16} className="text-[#00A77C]" />
          <span>1. Photo Evidence</span>
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

        {capturedImage ? (
          <div className="relative w-full h-64 sm:h-72 flex items-center justify-center bg-black/90">
            <img
              src={capturedImage}
              alt="Waste verification evidence"
              className="max-h-full max-w-full object-contain"
            />
            <button
              type="button"
              onClick={() => setShowPreviewFull(true)}
              aria-label="View photo full screen"
              className="absolute top-2.5 left-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white shadow-lg cursor-pointer transition-all hover:bg-black/80"
            >
              <Maximize2 size={13} />
            </button>
            <div className="absolute bottom-2.5 left-2.5 bg-[#00271D]/90 border border-[#00A77C] text-[#00A77C] text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md">
              <CheckCircle size={12} />
              <span>Evidence Ready</span>
            </div>
            <button
              type="button"
              onClick={() => startCamera()}
              className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg cursor-pointer transition-all"
            >
              <RefreshCw size={12} />
              <span>Retake</span>
            </button>
            <button
              type="button"
              onClick={() => setCapturedImage(null)}
              title="Remove Photo"
              aria-label="Remove photo"
              className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg cursor-pointer transition-all"
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>
        ) : isCapturing && !isLiveCameraActive ? (
          <div className="text-center space-y-2 py-8 animate-pulse">
            <Camera className="mx-auto text-[#00A77C]" size={28} />
            <p className="text-xs font-bold text-white tracking-wide uppercase">Opening Camera...</p>
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

              <label className="py-1.5 px-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1.5">
                <Upload size={13} />
                <span>Gallery Upload</span>
                <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
              </label>

              <button type="button" onClick={handleCapture} className="py-1.5 px-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 rounded-full text-[10px] font-medium cursor-pointer">
                <span>Demo Photo</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <CameraCaptureOverlay
        isOpen={isLiveCameraActive}
        videoRef={videoRef}
        cameraError={cameraError}
        onSnap={snapPhoto}
        onClose={stopCamera}
        onFlip={toggleCameraFacing}
      />

      <PhotoLightbox
        src={showPreviewFull ? capturedImage : null}
        alt="Waste verification evidence preview"
        caption="Photo Evidence"
        onClose={() => setShowPreviewFull(false)}
      />
    </div>
  );
};
