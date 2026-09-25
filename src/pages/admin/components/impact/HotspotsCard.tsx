import React from 'react';
import { ExternalLink, MapPin } from 'lucide-react';

export interface HotspotZone {
  name: string;
  reportCount: number;
  highPriority: number;
  isOverdue: boolean;
}

interface HotspotsCardProps {
  hotspotZones: HotspotZone[];
  totalOpenReports: number;
  totalHighPriority: number;
  onNavigate?: (tab: string) => void;
}

export const HotspotsCard: React.FC<HotspotsCardProps> = ({
  hotspotZones,
  totalOpenReports,
  totalHighPriority,
  onNavigate,
}) => (
  <div className="lg:col-span-5 bg-white/90 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[color-mix(in_srgb,var(--action)_10%,white)] rounded-xl text-[var(--action)]">
            <MapPin size={18} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[var(--text-strong)]">Campus Waste Hotspots</h3>
            <p className="text-xs text-[var(--text-strong)]/50">
              High-frequency report zones requiring MRF attention
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Hotspot Zone List */}
      <div className="space-y-2.5 mt-5">
        {hotspotZones.length > 0 ? (
          hotspotZones.map((zone) => (
            <div
              key={zone.name}
              className="p-3 bg-gray-50 hover:bg-white rounded-2xl border border-gray-100 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${
                    zone.isOverdue
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-[color-mix(in_srgb,var(--primary)_10%,white)] text-[var(--text-strong)]'
                  }`}
                >
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--text-strong)]">{zone.name}</p>
                  <p className="text-[11px] text-[var(--text-strong)]/50 font-medium">
                    {zone.reportCount} open report{zone.reportCount === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {zone.isOverdue ? (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    High Priority
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-[var(--text-strong)] bg-[color-mix(in_srgb,var(--primary)_10%,white)] px-2 py-0.5 rounded-full border border-[var(--primary)]/25">
                    Normal
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-xs text-[var(--text-strong)]/50 font-medium bg-gray-50 rounded-2xl border border-gray-100">
            No active hotspots — all zones clear
          </div>
        )}
      </div>
    </div>

    {/* Action Footer linking to Bin Map */}
    <div className="pt-3 border-t border-[var(--primary)]/10 flex items-center justify-between text-xs mt-5">
      <span className="text-[var(--text-strong)]/60 font-semibold">
        {totalOpenReports} open report{totalOpenReports === 1 ? '' : 's'} across {hotspotZones.length}{' '}
        zone{hotspotZones.length === 1 ? '' : 's'}
        {totalHighPriority > 0 && (
          <span className="text-rose-600 ml-1">• {totalHighPriority} high priority</span>
        )}
      </span>
      <button
        type="button"
        onClick={() => onNavigate?.('admin-bin-map')}
        className="text-[11px] font-bold text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,white)] px-2.5 py-1 rounded-full border border-[var(--accent)]/20 flex items-center gap-1 cursor-pointer hover:bg-[color-mix(in_srgb,var(--accent)_20%,white)] transition-colors"
      >
        <ExternalLink size={11} />
        View Bin Map
      </button>
    </div>
  </div>
);
