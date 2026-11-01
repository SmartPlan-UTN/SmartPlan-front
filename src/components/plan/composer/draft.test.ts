import { describe, expect, it } from 'vitest';
import { composerTarget, createInitialDraft, placeComposerStop } from './draft';
import type { OwnPlanDetail } from '@/types';

describe('place action composer draft', () => {
  const place = { id: 42, name: 'Un café', latitude: -32.89, longitude: -68.84 };
  it('sends a real place target and never the presentation row ID as an Activity', () => {
    const stop = placeComposerStop(place, { action: 'coffee', label: 'Tomar un café', durationMinutes: 60 });
    expect(composerTarget(stop)).toEqual({ placeId: 42, action: 'coffee' });
    expect(stop.estimatedCost).toBeNull();
    expect(stop.coords).toEqual({ latitude: -32.89, longitude: -68.84 });
  });

  it('retains the place identity and saved price when reopening a mixed itinerary', () => {
    const draft = createInitialDraft({ title: 'Una tarde', details: [{
      id: 9, activity: null, estimatedDuration: 60, estimatedCost: 12000,
      stop: { place, action: 'coffee', actionLabel: 'Tomar un café' },
    }] } as unknown as OwnPlanDetail);
    expect(draft.stops[0].detailId).toBe(9);
    expect(draft.stops[0].estimatedCost).toBe(12000);
    expect(composerTarget(draft.stops[0])).toEqual({ placeId: 42, action: 'coffee' });
  });
});
