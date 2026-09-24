import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, RefreshCw, X, AlertTriangle, Loader2 } from 'lucide-react';

interface CameraCaptureOverlayProps {
  isOpen: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraError: string | null;
  onSnap: () => void;
  onClose: () => void;
  onFlip: () => void;
  title?: string;
}

export const CameraCaptureOverlay: React.FC<CameraCaptureOverlayProps> = ({
  isOpen,
  videoRef,
  cameraError,
  onSnap,
  onClose,
  onFlip,
  title = 'Capture Photo Evidence',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsVideoReady(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const node = containerRef.current;
    if (node?.requestFullscreen) {
      node.requestFullscreen().catch(() => {});
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[120] flex h-[100dvh] w-screen flex-col overflow-hidden bg-black"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onCanPlay={() => setIsVideoReady(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {!isVideoReady && !cameraError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/80 text-white">
          <Loader2 size={30} className="animate-spin text-[var(--accent)]" />
          <p className="text-xs font-bold tracking-widest uppercase">Opening Camera...</p>
        </div>
      )}

      {cameraError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/85 p-6">
          <div className="max-w-sm space-y-3 rounded-2xl border border-amber-800/60 bg-amber-950/50 p-5 text-center">
            <AlertTriangle className="mx-auto text-amber-400" size={26} />
            <p className="text-sm font-bold text-amber-200">Camera Unavailable</p>
            <p className="text-xs leading-relaxed text-amber-100/80">{cameraError}</p>
            <button
              type="button"
              onClick={onClose}
              className="mx-auto mt-1 flex cursor-pointer items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-white/20"
            >
              <X size={13} /> Close & Upload Instead
            </button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 pb-8 pt-[calc(1rem+env(safe-area-inset-top))]">
        <span className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[10px] font-black tracking-widest text-white uppercase backdrop-blur-sm">
          {title}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close camera"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition-all hover:bg-white/20"
        >
          <X size={20} />
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-8 pt-14 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="h-12 w-12" />

        <button
          type="button"
          onClick={onSnap}
          disabled={!isVideoReady}
          aria-label="Snap photo"
          className="group flex h-[74px] w-[74px] cursor-pointer items-center justify-center rounded-full border-4 border-white bg-[var(--accent)] text-white shadow-2xl shadow-[var(--accent)]/40 transition-all hover:bg-[var(--accent-dark)] active:scale-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Camera size={30} className="transition-transform group-active:scale-90" />
        </button>

        <button
          type="button"
          onClick={onFlip}
          aria-label="Flip camera"
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition-all hover:bg-white/20"
        >
          <RefreshCw size={20} />
        </button>
      </div>
    </div>,
    document.body
  );
};
