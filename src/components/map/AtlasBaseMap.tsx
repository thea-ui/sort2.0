import React, { useId, useMemo } from 'react';
import { AtlasBuilding } from '../../types';
import { atlasBounds } from '../../utils/fitContain';
import { readableTextColor } from '../atlas/atlasRoomMeta';

interface AtlasBaseMapProps {
  buildings: AtlasBuilding[];
  campusImageUrl?: string | null;
  showLabels?: boolean;
  className?: string;
}

/**
 * Read-only ATLAS rendering for use as a *background* under percentage-based
 * pin overlays. Uses the exact drawing bounds as its viewBox (no padding) and
 * `preserveAspectRatio="none"`, so the parent fit box maps percentages
 * linearly to ATLAS canvas coordinates. Not interactive by design.
 */
export const AtlasBaseMap: React.FC<AtlasBaseMapProps> = ({
  buildings,
  campusImageUrl = null,
  showLabels = true,
  className,
}) => {
  const bounds = useMemo(() => atlasBounds(buildings), [buildings]);
  const rawId = useId();
  const patternId = useMemo(
    () => `atlas-base-grid-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`,
    [rawId]
  );

  if (!bounds) return null;

  const valid = buildings.filter((b) => b.width > 0 && b.height > 0);
  const labelSize = Math.max(bounds.w, bounds.h) * 0.012;
  const gridSize = Math.max(8, bounds.w / 45);

  return (
    <svg
      data-testid="atlas-base-map"
      className={className ?? 'absolute inset-0 w-full h-full pointer-events-none'}
      viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Campus base map with ${valid.length} buildings`}
    >
      <defs>
        <pattern id={patternId} width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#E2E8F0" />
        </pattern>
      </defs>

      <rect x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h} fill={`url(#${patternId})`} />

      {campusImageUrl && (
        <image
          href={campusImageUrl}
          x={bounds.x}
          y={bounds.y}
          width={bounds.w}
          height={bounds.h}
          preserveAspectRatio="xMidYMid slice"
          opacity={0.55}
        />
      )}

      {valid.map((building) => {
        const fill = building.color || '#94A3B8';
        const labelColor = readableTextColor(fill);
        const centerX = building.x + building.width / 2;
        const centerY = building.y + building.height / 2;
        const showLabel =
          showLabels &&
          building.width > bounds.w * 0.045 &&
          building.height > bounds.h * 0.06;

        return (
          <g
            key={building.atlasId}
            data-building-id={building.atlasId}
            transform={
              building.rotation
                ? `rotate(${building.rotation} ${centerX} ${centerY})`
                : undefined
            }
          >
            <rect
              x={building.x}
              y={building.y}
              width={building.width}
              height={building.height}
              rx={8}
              fill={fill}
              fillOpacity={0.45}
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeOpacity={0.9}
              strokeDasharray={building.isTeachingBuilding ? undefined : '6 4'}
              vectorEffect="non-scaling-stroke"
            />
            {showLabel && (
              <text
                x={centerX}
                y={centerY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={labelSize}
                fontWeight={700}
                fill={labelColor}
                opacity={0.65}
              >
                {building.shortCode || building.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
