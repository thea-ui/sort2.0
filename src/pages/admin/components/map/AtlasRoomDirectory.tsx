import React, { useMemo, useState } from 'react';
import { Building2, Search } from 'lucide-react';
import { AtlasBuilding, AtlasRoom } from '../../../../types';
import { roomTypeMeta } from '../../../../components/atlas/atlasRoomMeta';

interface AtlasRoomDirectoryProps {
  buildings: AtlasBuilding[];
}

interface FloorGroup {
  floor: number;
  rooms: AtlasRoom[];
}

/**
 * Read-only directory of the rooms teachers actually pick from (the ATLAS
 * mirror). The manual preset list stays available as a fallback when ATLAS
 * has no data.
 */
export const AtlasRoomDirectory: React.FC<AtlasRoomDirectoryProps> = ({ buildings }) => {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();

  const withRooms = useMemo(
    () => buildings.filter((building) => building.rooms.length > 0),
    [buildings]
  );

  const totalRooms = useMemo(
    () => withRooms.reduce((acc, building) => acc + building.rooms.length, 0),
    [withRooms]
  );

  const groups = useMemo(() => {
    return withRooms
      .map((building) => {
        const matches = building.rooms.filter((room) => {
          if (!normalizedQuery) return true;
          return (
            room.name.toLowerCase().includes(normalizedQuery) ||
            room.type.toLowerCase().includes(normalizedQuery) ||
            building.name.toLowerCase().includes(normalizedQuery)
          );
        });

        const byFloor = new Map<number, AtlasRoom[]>();
        for (const room of matches) {
          const list = byFloor.get(room.floor) ?? [];
          list.push(room);
          byFloor.set(room.floor, list);
        }

        const floors: FloorGroup[] = Array.from(byFloor.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([floor, rooms]) => ({
            floor,
            rooms: rooms.sort(
              (a, b) =>
                (a.floorPosition ?? 999) - (b.floorPosition ?? 999) ||
                a.name.localeCompare(b.name)
            ),
          }));

        return { building, floors };
      })
      .filter((group) => group.floors.length > 0);
  }, [withRooms, normalizedQuery]);

  return (
    <div data-testid="atlas-room-directory" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <span className="text-[10px] font-extrabold text-[var(--text-strong)] bg-[var(--primary)]/10 border border-[var(--primary)]/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Synced from ATLAS
          </span>
          <h3 className="text-base font-extrabold text-[var(--text-strong)] mt-1 flex items-center gap-2">
            <Building2 size={18} className="text-[var(--text-strong)]" />
            ATLAS Rooms ({totalRooms})
          </h3>
          <p className="text-xs text-[var(--text-strong)]/50 mt-0.5 font-medium">
            These are the rooms teachers see when filing asset reports. Synced automatically; read-only.
          </p>
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search ATLAS rooms..."
            data-testid="atlas-room-search"
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {groups.length === 0 && (
        <p className="text-xs font-semibold text-[var(--text-strong)]/50 py-4 text-center">
          No rooms match “{query}”.
        </p>
      )}

      <div className="space-y-4">
        {groups.map(({ building, floors }) => (
          <div key={building.atlasId}>
            <p className="text-[11px] font-black uppercase tracking-wider text-[var(--text-strong)]/60 mb-2">
              {building.name}
              {building.shortCode ? ` · ${building.shortCode}` : ''}
            </p>
            <div className="space-y-2">
              {floors.map((floor) => (
                <div key={floor.floor}>
                  <p className="text-[10px] font-bold text-[var(--text-strong)]/40 mb-1">
                    Floor {floor.floor} · {floor.rooms.length} room{floor.rooms.length !== 1 ? 's' : ''}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {floor.rooms.map((room) => {
                      const meta = roomTypeMeta(room.type);
                      const Icon = meta.icon;
                      return (
                        <div
                          key={room.atlasId}
                          data-testid="atlas-room-item"
                          className="p-2.5 bg-white rounded-2xl border border-gray-200/70 flex items-center justify-between gap-2"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className={`h-6 w-6 shrink-0 rounded-lg border flex items-center justify-center ${meta.badgeClass}`}>
                              <Icon size={12} />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-bold text-[var(--text-strong)]" title={room.name}>
                                {room.name}
                              </span>
                              <span className="block text-[10px] font-medium text-[var(--text-strong)]/50">
                                {meta.label}
                                {room.capacity !== null ? ` · ${room.capacity} seats` : ''}
                              </span>
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
