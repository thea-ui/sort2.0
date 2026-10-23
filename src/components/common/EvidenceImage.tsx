import type { ImgHTMLAttributes } from 'react';
import { useReportPhoto } from '../../hooks/useReportPhoto';

interface EvidenceImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Server-resolved photo path (GET /api/reports/:id/photo). */
  photoUrl?: string | null;
  /** Directly renderable source (local data:/blob:/http URL). */
  imageUrl?: string | null;
}

/**
 * Renders report photo evidence whether it arrives as a local data URL
 * (optimistic submit) or as a server photo path (polled list). Renders
 * nothing until the server photo has been fetched.
 */
export function EvidenceImage({ photoUrl, imageUrl, ...imgProps }: EvidenceImageProps) {
  const src = useReportPhoto(photoUrl, imageUrl);
  if (!src) return null;
  return <img src={src} {...imgProps} />;
}

interface EvidenceThumbnailProps {
  photoUrl?: string | null;
  imageUrl?: string | null;
  alt: string;
  className?: string;
  onOpen: (resolvedSrc: string) => void;
}

/** Small zoomable thumbnail button used in report history lists. */
export function EvidenceThumbnail({ photoUrl, imageUrl, alt, className, onOpen }: EvidenceThumbnailProps) {
  const src = useReportPhoto(photoUrl, imageUrl);
  if (!src) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(src);
      }}
      aria-label="View evidence photo full screen"
      className={className}
    >
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    </button>
  );
}
