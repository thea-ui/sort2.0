import React from 'react';
import { Edit2, Trash2, SlidersHorizontal, AlertTriangle, Droplets, PackageX, Recycle } from 'lucide-react';
import { BinLocationItem, CategoryStreamType, BinStreamState } from '../../../../types';

const CAT_META: Record<CategoryStreamType, { label: string; bg: string; desc: string; Icon: React.FC<{ size?: number; className?: string }> }> = {
  BIODEGRADABLE: { label: 'Biodegradable Bin', bg: 'bg-emerald-500', desc: 'Food scraps, organic waste & plant leaves', Icon: Droplets },
  NON_BIODEGRADABLE: { label: 'Non-Biodegradable Bin', bg: 'bg-rose-500', desc: 'Wrappers, plastic films & residual waste', Icon: PackageX },
  RECYCLABLE: { label: 'Recyclable Bin', bg: 'bg-sky-500', desc: 'PET bottles, aluminum cans, glass & cardboard', Icon: Recycle },
};

interface StationInspectorProps {
  selectedLoc: BinLocationItem | null;
  setEditingLoc: (loc: BinLocationItem | null) => void;
  setDeletingLoc: (loc: BinLocationItem | null) => void;
  filteredList: BinLocationItem[];
  selectedLocId: string | null;
  setSelectedLocId: (id: string | null) => void;
  handleSetStreamStatus: (locId: string, streamType: CategoryStreamType, newStatus: BinStreamState) => void;
  reports: any[];
}

export const StationInspector: React.FC<StationInspectorProps> = ({
  selectedLoc,
  setEditingLoc,
  setDeletingLoc,
  filteredList,
  selectedLocId,
  setSelectedLocId,
  handleSetStreamStatus,
  reports,
}) => {
  if (!selectedLoc) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-3xl p-6 shadow-sm text-center py-12 text-gray-400 space-y-2">
        <Building2 size={32} className="mx-auto text-gray-300" />
        <p className="text-xs font-bold text-[#00271D]">No Station Selected</p>
        <p className="text-[11px]">Click a pin on the blueprint grid to inspect and manipulate its bins.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between border-b border-gray-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-extrabold text-gray-400 uppercase">{selectedLoc.code}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
              selectedLoc.status === 'Available' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-rose-100 border-rose-300 text-rose-800'
            }`}>
              {selectedLoc.status}
            </span>
          </div>
          <h3 className="text-base font-black text-[#00271D] mt-0.5">{selectedLoc.name}</h3>
          <p className="text-[11px] text-gray-400 font-medium">Grid Position: X: {selectedLoc.x}% · Y: {selectedLoc.y}%</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setEditingLoc(selectedLoc)} className="p-2 text-gray-500 hover:text-[#00A77C] hover:bg-emerald-50 rounded-xl transition-all cursor-pointer" title="Edit Station Details">
            <Edit2 size={15} />
          </button>
          <button type="button" onClick={() => setDeletingLoc(selectedLoc)} className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer" title="Delete Station">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-black text-[#00271D] uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal size={14} className="text-[#00A77C]" />
            Waste Stream Bins at Station
          </h4>
          <span className="text-[10px] text-gray-400 font-semibold">Click button to toggle each bin</span>
        </div>

        <div className="space-y-2.5">
          {(['BIODEGRADABLE', 'NON_BIODEGRADABLE', 'RECYCLABLE'] as CategoryStreamType[]).map((streamType) => {
            const meta = CAT_META[streamType];
            const streamObj = selectedLoc.streams.find((s) => s.type === streamType);
            const isInstalled = Boolean(streamObj);

            const activeReport = reports.find(
              (r) =>
                r.locationName.trim().toLowerCase() === selectedLoc.name.trim().toLowerCase() &&
                r.category === streamType &&
                (r.status === 'PENDING' || r.status === 'DISPATCHED')
            );

            const streamStatus: BinStreamState = streamObj ? streamObj.status : 'No Bin';
            const isAvailable = streamStatus === 'Available' && !activeReport;
            const statusLabel = activeReport ? 'Pending Pickup' : streamStatus === 'Available' ? 'Available' : streamStatus === 'No Bin' ? 'No Bin' : 'Unavailable';

            return (
              <div key={streamType} className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isAvailable ? 'bg-white border-gray-200/80 shadow-xs' : activeReport ? 'bg-amber-50/80 border-amber-200' : streamStatus === 'No Bin' ? 'bg-gray-50/80 border-gray-200' : 'bg-rose-50/70 border-rose-200'
              }`}>
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`p-2.5 rounded-xl text-white ${meta.bg} shadow-xs shrink-0 mt-0.5`}>
                    <meta.Icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h5 className="font-extrabold text-xs text-[#00271D]">{meta.label}</h5>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full border ${
                        isAvailable ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : activeReport ? 'bg-amber-100 border-amber-300 text-amber-900' : streamStatus === 'No Bin' ? 'bg-gray-200 border-gray-300 text-gray-700' : 'bg-rose-100 border-rose-300 text-rose-800'
                      }`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{meta.desc}</p>
                    {activeReport && (
                      <p className="text-[10px] text-amber-700 font-bold mt-1 flex items-center gap-1">
                        <AlertTriangle size={11} className="shrink-0" />
                        Active report filed ({activeReport.status})
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <select
                    value={streamStatus}
                    onChange={(e) => handleSetStreamStatus(selectedLoc.id, streamType, e.target.value as BinStreamState)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer border transition-all focus:outline-none focus:ring-2 focus:ring-[#00A77C]/40 ${
                      streamStatus === 'Available' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' : streamStatus === 'Unavailable' ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <option value="Available">Available</option>
                    <option value="Unavailable">Unavailable</option>
                    <option value="No Bin">No Bin at Location</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100 space-y-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select Another Station:</p>
        <div className="flex flex-wrap gap-1.5">
          {filteredList.map((loc) => (
            <button key={loc.id} type="button" onClick={() => setSelectedLocId(loc.id)} className={`px-2.5 py-1 rounded-xl text-[11px] font-bold cursor-pointer transition-all border ${
              selectedLocId === loc.id ? 'bg-[#00271D] text-white border-[#00271D]' : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}>
              {loc.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

function Building2(props: { size: number; className?: string }) {
  return <span className={props.className}>🏗️</span>;
}
