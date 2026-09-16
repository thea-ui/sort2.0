import React, { useEffect, useState } from 'react';
import {
  BlueprintTransform,
  DEFAULT_BLUEPRINT_TRANSFORM,
  BLUEPRINT_UPDATED_EVENT,
  getStoredBlueprintUrl,
  getBlueprintTransform,
} from '../../services/locationStore';

interface BlueprintImageProps {
  /** Explicit URL; when omitted the component reads storage and stays in sync. */
  url?: string | null;
  /** Explicit transform (used by the editor while adjusting); otherwise reads storage. */
  transform?: BlueprintTransform | null;
  className?: string;
}

const DEFAULT_CLASS = 'absolute inset-0 w-full h-full object-cover opacity-75 pointer-events-none';

function read() {
  return { url: getStoredBlueprintUrl(), transform: getBlueprintTransform() };
}

export const BlueprintImage: React.FC<BlueprintImageProps> = ({ url, transform, className }) => {
  const [stored, setStored] = useState(read);

  useEffect(() => {
    const handler = () => setStored(read());
    window.addEventListener('storage', handler);
    window.addEventListener(BLUEPRINT_UPDATED_EVENT, handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener(BLUEPRINT_UPDATED_EVENT, handler);
    };
  }, []);

  const resolvedUrl = url !== undefined ? url : stored.url;
  if (!resolvedUrl) return null;

  const t = (transform !== undefined ? transform : stored.transform) || DEFAULT_BLUEPRINT_TRANSFORM;

  return (
    <img
      src={resolvedUrl}
      alt="Campus Map Blueprint"
      draggable={false}
      className={className ?? DEFAULT_CLASS}
      style={{
        transform: `translate(${t.offsetX}%, ${t.offsetY}%) scale(${t.scale})`,
        transformOrigin: 'center center',
      }}
    />
  );
};
