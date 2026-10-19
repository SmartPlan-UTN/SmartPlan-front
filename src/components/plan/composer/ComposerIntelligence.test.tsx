import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkPlanComposer } from '@/lib/api';
import type { ComposerCheckResult } from '@/types';
import { ComposerIntelligence } from './ComposerIntelligence';
import type { ComposerStop } from './draft';

vi.mock('@/lib/api', () => ({ checkPlanComposer: vi.fn() }));
const stops: ComposerStop[] = [{
  estimatedCost: null, estimatedDuration: 90,
  activity: { id: 7, name: 'Cena', description: '', estimatedCost: null, estimatedDuration: 90, type: null, averageRating: 0, ratingCount: 0, distanceKm: null, categories: [] },
}];
const result: ComposerCheckResult = {
  stops: [{ index: 0, name: 'Cena', startTime: '19:00', endTime: '20:30', travelMinutesFromPrevious: null, hours: 'UNKNOWN', closesAt: null }],
  totals: { min: 20000, max: null, unpriced: 1, completeness: 'PARTIAL' },
  budget: { status: 'UNCERTAIN', remaining: 30000 },
  issues: [{ kind: 'HOURS_UNKNOWN', stopIndex: 0, message: 'Horario sin confirmar.', actions: ['CHANGE_TIME'] }], continuations: [],
};
beforeEach(() => { vi.mocked(checkPlanComposer).mockReset().mockResolvedValue(result); });

describe('composer intelligence', () => {
  it('opens an explicit cheaper search without changing stops automatically', async () => {
    vi.mocked(checkPlanComposer).mockResolvedValue({ ...result, issues: [{ kind: 'OVER_BUDGET', stopIndex: null, message: 'Supera el presupuesto.', actions: ['CHEAPER'] }] });
    const onFindCheaper = vi.fn();
    const user = userEvent.setup();
    render(<ComposerIntelligence stops={stops} peopleCount={2} onFindCheaper={onFindCheaper} />);
    await user.click(screen.getByText('Comprobar un horario'));
    await user.type(screen.getByLabelText('Día'), '2026-10-18');
    await user.click(await screen.findByRole('button', { name: 'Buscar opciones más baratas' }));
    expect(onFindCheaper).toHaveBeenCalledOnce();
    expect(stops[0].activity.id).toBe(7);
  });
  it('checks the real stops and does not show a remaining budget when a price is unknown', async () => {
    const user = userEvent.setup();
    render(<ComposerIntelligence stops={stops} peopleCount={2} />);
    expect(checkPlanComposer).not.toHaveBeenCalled();
    await user.click(screen.getByText('Comprobar un horario'));
    await user.type(screen.getByLabelText('Día'), '2026-10-18');
    await waitFor(() => expect(checkPlanComposer).toHaveBeenCalled());
    expect(vi.mocked(checkPlanComposer).mock.calls.at(-1)?.[0]).toMatchObject({ date: '2026-10-18', peopleCount: 2, stops: [{ activityId: 7, durationMinutes: 90 }] });
    expect(await screen.findByText('Falta confirmar el precio de una parada.')).toBeInTheDocument();
    expect(screen.queryByText(/Te quedarían/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cambiar horario' }));
    expect(screen.getByLabelText('Hora de salida')).toHaveFocus();
  });
});
