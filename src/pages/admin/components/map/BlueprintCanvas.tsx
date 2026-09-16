import React from 'react';
import { MapPin, Search } from 'lucide-react';
import { BinLocationItem } from '../../../../types';
import { BlueprintTransform } from '../../../../services/locationStore';
import { BlueprintImage } from '../../../../components/map/BlueprintImage';

interface BlueprintCanvasProps {
  filteredList: BinLocationItem[];
  selectedLocId: string | null;
  setSelectedLocId: (id: string | null) => void;
  draggingLocId: string | null;
  isEditMode: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filter: 'All' | 'Available' | 'Unavailable';
  setFilter: (f: 'All' | 'Available' | 'Unavailable') => void;
  blueprintUrl: string | null;
  blueprintTransform: BlueprintTransform;
  isAdjusting: boolean;
  onAdjustPointerDown: (e: React.PointerEvent) => void;
  onAdjustPointerMove: (e: React.PointerEvent) => void;
  onAdjustPointerUp: () => void;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  handleMouseDown: (locId: string, e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseUp: () => void;
}

export const BlueprintCanvas: React.FC<BlueprintCanvasProps> = ({
  filteredList,
  selectedLocId,
  setSelectedLocId,
  draggingLocId,
  isEditMode,
  searchQuery,
  setSearchQuery,
  filter,
  setFilter,
  blueprintUrl,
  blueprintTransform,
  isAdjusting,
  onAdjustPointerDown,
  onAdjustPointerMove,
  onAdjustPointerUp,
  mapContainerRef,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
}) => (
  <div className="lg:col-span-7 bg-white/95 backdrop-blur-md border border-white/80 rounded-3xl p-5 shadow-sm space-y-3">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
      <div className="relative flex-1 w-full">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search campus station name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#00A77C]"
        />
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl text-[10px] font-bold">
        {(['All', 'Available', 'Unavailable'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-lg cursor-pointer transition-all ${
              filter === f ? 'bg-[#00271D] text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
    </div>

    <div className="flex items-center justify-between text-xs font-extrabold text-[#00271D]">
      <span className="flex items-center gap-1.5">
        <MapPin size={15} className="text-sky-600" />
        Blueprint Grid Editor
      </span>
      {isAdjusting ? (
        <span className="text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold animate-pulse">
          DRAG TO POSITION · SCROLL TO ZOOM
        </span>
      ) : isEditMode ? (
        <span className="text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold animate-pulse">
          DRAG PINS TO RE-POSITION (0-100%)
        </span>
      ) : (
        <span className="text-[#00271D]/40 text-[11px] font-medium">Click pin to inspect bins</span>
      )}
    </div>

    <div
      ref={mapContainerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onPointerDown={onAdjustPointerDown}
      onPointerMove={onAdjustPointerMove}
      onPointerUp={onAdjustPointerUp}
      onPointerLeave={onAdjustPointerUp}
      className={`relative w-full h-[400px] rounded-2xl border border-gray-200 bg-slate-900 overflow-hidden shadow-inner flex items-center justify-center select-none ${
        isAdjusting
          ? 'cursor-grab active:cursor-grabbing border-amber-400 border-2'
          : isEditMode
            ? 'cursor-crosshair border-amber-400 border-2'
            : ''
      }`}
    >
      {blueprintUrl ? (
        <BlueprintImage url={blueprintUrl} transform={blueprintTransform} />
      ) : (
        <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="editor-grid-full" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#334155" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#editor-grid-full)" />
        </svg>
      )}

      {filteredList.map((loc) => {
        const isSelected = selectedLocId === loc.id;
        const isDragging = draggingLocId === loc.id;

        return (
          <div
            key={loc.id}
            onMouseDown={(e) => handleMouseDown(loc.id, e)}
            onClick={() => setSelectedLocId(loc.id)}
            style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${
              isAdjusting ? 'pointer-events-none opacity-40' : ''
            } ${isDragging ? 'scale-125 z-30' : isSelected ? 'scale-110 z-20' : 'z-10 hover:scale-105'}`}
          >
            <div className={`h-9 w-9 rounded-full flex items-center justify-center border-2 shadow-lg ${
              loc.status === 'Unavailable' ? 'bg-rose-500 border-white text-white' : 'bg-[#00A77C] border-white text-white'
            } ${isSelected ? 'ring-4 ring-amber-400' : ''}`}>
              <MapPin size={18} />
            </div>
            <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap border border-slate-700 shadow-md">
              {loc.name}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
