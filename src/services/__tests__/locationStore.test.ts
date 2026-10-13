import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CAMPUS_LOCATIONS,
  locationsToBins,
  stripHazardousStreams,
} from '../locationStore';
import type { BinLocationItem } from '../../types';

function location(streams: BinLocationItem['streams']): BinLocationItem {
  return {
    id: 'loc-test',
    name: 'Test Hall',
    code: 'LOC-T',
    status: 'Available',
    x: 10,
    y: 20,
    streams,
  };
}

const hazardousStream = { type: 'HAZARDOUS', status: 'Available' } as unknown as BinLocationItem['streams'][number];

describe('stripHazardousStreams', () => {
  it('removes the phantom hazardous stream and keeps the three admin-managed streams', () => {
    const input = location([
      { type: 'BIODEGRADABLE', status: 'Available' },
      { type: 'NON_BIODEGRADABLE', status: 'No Bin' },
      { type: 'RECYCLABLE', status: 'Available' },
      hazardousStream,
    ]);

    const [cleaned] = stripHazardousStreams([input]);

    expect(cleaned.streams.map((s) => s.type)).toEqual([
      'BIODEGRADABLE',
      'NON_BIODEGRADABLE',
      'RECYCLABLE',
    ]);
  });

  it('recomputes the location status when hazardous was the last available stream', () => {
    const input = location([
      { type: 'RECYCLABLE', status: 'Unavailable' },
      hazardousStream,
    ]);

    const [cleaned] = stripHazardousStreams([input]);

    expect(cleaned.streams).toHaveLength(1);
    expect(cleaned.status).toBe('Unavailable');
  });

  it('returns the same reference when nothing needs stripping', () => {
    const clean = location([
      { type: 'BIODEGRADABLE', status: 'Available' },
      { type: 'RECYCLABLE', status: 'Available' },
    ]);
    const input = [clean];

    expect(stripHazardousStreams(input)).toBe(input);
  });
});

describe('locationsToBins', () => {
  it('never derives a hazardous bin, even from a legacy payload', () => {
    const bins = locationsToBins([
      location([
        { type: 'BIODEGRADABLE', status: 'Available' },
        { type: 'NON_BIODEGRADABLE', status: 'Available' },
        { type: 'RECYCLABLE', status: 'Available' },
        hazardousStream,
      ]),
    ]);

    expect(bins).toHaveLength(3);
    expect(bins.some((b) => (b.type as string) === 'HAZARDOUS')).toBe(false);
  });
});

describe('DEFAULT_CAMPUS_LOCATIONS', () => {
  it('configures exactly the three admin-managed streams on every station', () => {
    for (const loc of DEFAULT_CAMPUS_LOCATIONS) {
      expect(loc.streams.map((s) => s.type)).toEqual([
        'BIODEGRADABLE',
        'NON_BIODEGRADABLE',
        'RECYCLABLE',
      ]);
    }
  });
});
