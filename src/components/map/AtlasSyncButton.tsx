import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiService } from '../../services/api';

/** Broadcast after a successful sync so mounted maps reload immediately. */
export const ATLAS_MAP_UPDATED_EVENT = 'atlas_map_updated';

interface AtlasSyncButtonProps {
  onSynced?: () => void;
  className?: string;
}

type SyncState = 'idle' | 'syncing' | 'done' | 'error';

/**
 * Admin-only manual ATLAS sync. Auto-sync already runs every 15 minutes, so
 * this is a convenience for "I just edited ATLAS, show me now" moments.
 */
export const AtlasSyncButton: React.FC<AtlasSyncButtonProps> = ({ onSynced, className }) => {
  const [state, setState] = useState<SyncState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    },
    []
  );

  const handleClick = async () => {
    if (state === 'syncing') return;
    setState('syncing');
    setMessage('Syncing from ATLAS…');

    try {
      const result = await apiService.triggerAtlasSync();
      if (result?.unchanged) {
        setMessage('Already up to date');
      } else {
        setMessage(
          `Updated · ${result?.buildingsSeen ?? '?'} buildings / ${result?.roomsSeen ?? '?'} rooms`
        );
      }
      setState('done');
      window.dispatchEvent(new Event(ATLAS_MAP_UPDATED_EVENT));
      onSynced?.();
    } catch {
      setMessage('ATLAS unreachable — showing last snapshot');
      setState('error');
    } finally {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => {
        setState('idle');
        setMessage(null);
      }, 4000);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <button
        type="button"
        data-testid="atlas-sync-button"
        onClick={handleClick}
        disabled={state === 'syncing'}
        title="Fetch the latest buildings and rooms from ATLAS"
        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs border transition-all cursor-pointer ${
          state === 'syncing'
            ? 'bg-sky-50 text-sky-700 border-sky-200 opacity-80 cursor-wait'
            : 'bg-white text-[#00271D] border-gray-200 hover:bg-gray-50'
        }`}
      >
        <RefreshCw size={13} className={`text-[#0091EA] ${state === 'syncing' ? 'animate-spin' : ''}`} />
        {state === 'syncing' ? 'Syncing…' : 'Sync from ATLAS'}
      </button>
      {message && (
        <span
          data-testid="atlas-sync-message"
          className={`text-[10px] font-bold ${
            state === 'error' ? 'text-rose-600' : state === 'done' ? 'text-emerald-700' : 'text-sky-700'
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
};
