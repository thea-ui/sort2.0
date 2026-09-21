import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface PhotoLightboxProps {
  src: string | null;
  alt?: string;
  caption?: string;
  onClose: () => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  src,
  alt = 'Photo evidence',
  caption,
  onClose,
}) => {
  useEffect(() => {
    if (!src) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [src, onClose]);

  if (!src) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Full screen photo viewer"
      onClick={onClose}
      className="fixed inset-0 z-[120] flex h-[100dvh] w-screen items-center justify-center bg-black/95 p-3 sm:p-6 animate-fade-in"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close full screen photo"
        className="absolute top-4 right-4 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/50 text-white transition-all hover:bg-white/20"
      >
        <X size={20} />
      </button>

      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
      />

      {caption && (
        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/20 bg-black/60 px-3.5 py-1.5 text-[10px] font-bold tracking-widest text-white uppercase backdrop-blur-sm">
          {caption}
        </span>
      )}
    </div>,
    document.body
  );
};
