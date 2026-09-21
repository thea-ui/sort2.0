import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAtlasMap } from '../../hooks/useAtlasMap';
import { FitBox, atlasAspectRatio, fitContain } from '../../utils/fitContain';
import { BlueprintTransform } from '../../services/locationStore';
import { BlueprintImage } from './BlueprintImage';
import { AtlasBaseMap } from './AtlasBaseMap';

export const BASE_MAP_MODE_KEY = 'sort_base_map_mode';

type BaseMapMode = 'atlas' | 'blueprint';

function readBaseMapMode(): BaseMapMode {
  try {
    return localStorage.getItem(BASE_MAP_MODE_KEY) === 'blueprint' ? 'blueprint' : 'atlas';
  } catch {
    return 'atlas';
  }
}

interface CampusMapFrameProps {
  /** Stored blueprint (the fallback background). */
  blueprintUrl?: string | null;
  /** Blueprint transform (used by the settings editor while adjusting). */
  blueprintTransform?: BlueprintTransform | null;
  /** Extra classes for the fallback blueprint image (per-surface styling). */
  blueprintClassName?: string;
  /**
   * Force the fallback/blueprint layer even when ATLAS is available.
   * Used by the settings editor while adjusting the fallback background so the
   * zoom/pan feedback is visible.
   */
  forceBlueprint?: boolean;
  /** Rendered when neither ATLAS nor a blueprint is available. */
  fallback?: React.ReactNode;
  /** Full override of the fallback layer composition (settings editor). */
  fallbackContent?: React.ReactNode;
  /** Pin overlays; positioned against the same box as the base layer. */
  children?: React.ReactNode;
  /** Ref to the box pins are positioned against (editor drag math). */
  contentRef?: React.Ref<HTMLDivElement>;
  /** Interaction handlers applied to the box pins live in. */
  contentProps?: React.HTMLAttributes<HTMLDivElement>;
}

/**
 * Base map layer for every campus map surface.
 *
 * Order: ATLAS mirror (default) -> uploaded blueprint -> provided fallback.
 * In ATLAS mode a measured, ratio-locked fit box guarantees that
 * percentage-based pins map linearly onto ATLAS canvas coordinates.
 * In fallback mode the box is the full container, preserving the exact
 * pre-ATLAS DOM/behavior. `localStorage.sort_base_map_mode = 'blueprint'`
 * reverts every surface to the legacy look without a redeploy.
 */
export const CampusMapFrame: React.FC<CampusMapFrameProps> = ({
  blueprintUrl = null,
  blueprintTransform,
  blueprintClassName,
  forceBlueprint = false,
  fallback = null,
  fallbackContent,
  children,
  contentRef,
  contentProps,
}) => {
  const { buildings, campusImageUrl, resolved } = useAtlasMap();
  const ratio = useMemo(() => atlasAspectRatio(buildings), [buildings]);

  const [mode] = useState<BaseMapMode>(readBaseMapMode);
  const [box, setBox] = useState<FitBox | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);

  const atlasActive = mode === 'atlas' && ratio !== null && !forceBlueprint;

  useEffect(() => {
    if (!atlasActive || ratio === null) {
      setBox(null);
      return;
    }
    const element = measureRef.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setBox(fitContain(rect.width, rect.height, ratio));
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [atlasActive, ratio]);

  const { className: contentClassName, style: contentStyle, ...restContentProps } =
    contentProps ?? {};

  // Wait for the first ATLAS response (mirror or empty) before choosing a
  // layer, so the old blueprint/vector never flashes for a frame on entry.
  // (Kept after all hooks — an early return above a hook breaks hook order.)
  if (!resolved && mode === 'atlas' && !forceBlueprint) {
    return (
      <div ref={measureRef} className="absolute inset-0" data-testid="campus-map-frame">
        <div
          data-testid="campus-map-pending"
          className="absolute inset-0 rounded-2xl bg-[#F8FAFC] animate-pulse"
        />
      </div>
    );
  }

  if (atlasActive && box && box.width > 0) {
    return (
      <div ref={measureRef} className="absolute inset-0" data-testid="campus-map-frame">
        <div
          ref={contentRef}
          {...restContentProps}
          data-testid="campus-map-content"
          className={`absolute ${contentClassName ?? ''}`}
          style={{
            left: box.offsetX,
            top: box.offsetY,
            width: box.width,
            height: box.height,
            ...contentStyle,
          }}
        >
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <AtlasBaseMap buildings={buildings} campusImageUrl={campusImageUrl} />
          </div>
          {children}
        </div>
      </div>
    );
  }

  const fallbackLayer =
    fallbackContent !== undefined
      ? fallbackContent
      : blueprintUrl
        ? (
          <BlueprintImage
            url={blueprintUrl}
            transform={blueprintTransform ?? undefined}
            className={blueprintClassName}
          />
        )
        : fallback;

  return (
    <div ref={measureRef} className="absolute inset-0" data-testid="campus-map-frame">
      <div
        ref={contentRef}
        {...restContentProps}
        data-testid="campus-map-content"
        className={`absolute inset-0 ${contentClassName ?? ''}`}
        style={contentStyle}
      >
        <div
          data-testid="campus-map-fallback"
          className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
        >
          {fallbackLayer}
        </div>
        {children}
      </div>
    </div>
  );
};
