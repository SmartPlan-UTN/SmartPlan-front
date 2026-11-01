import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlanDetailResult } from '@/types';
import { PlanRefinementActions, RefinementChips } from './PlanRefinementActions';

const plan: Pick<PlanDetailResult, 'id' | 'details'> = {
  id: 42,
  details: ['A', 'B', 'C'].map((label, index) => ({
    id: index + 1, order: index + 1, estimatedCost: null, estimatedDuration: 60, activity: null,
    stop: { kind: 'PLACE_ACTION', label, action: 'meal', actionLabel: null, activityId: null, place: null,
      startMinute: null, legTravelMinutes: null, legDistanceMeters: null, estimateBasis: null },
  })),
};

describe('plan refinement actions', () => {
  it('sends only the selected stop index when changing B in A → B → C', async () => {
    const onRefine = vi.fn();
    const user = userEvent.setup();
    render(<PlanRefinementActions plan={plan} busy={false} onRefine={onRefine} />);
    await user.click(screen.getByText('Cambiar una parada'));
    await user.click(screen.getByRole('button', { name: 'Cambiar B' }));
    expect(onRefine).toHaveBeenCalledWith({ planId: 42, action: 'SWAP_STOP', stopIndex: 1 });
  });

  it('disables changes while submitting and does not remove the only stop', async () => {
    const user = userEvent.setup();
    render(<PlanRefinementActions plan={{ ...plan, details: plan.details.slice(0, 1) }} busy onRefine={vi.fn()} />);
    await user.click(screen.getByText('Cambiar una parada'));
    expect(screen.getByRole('button', { name: 'Cambiar A' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Más barato' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Quitar A' })).not.toBeInTheDocument();
  });

  it('offers a game at home only on a free plan that does not end there', async () => {
    const onRefine = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<RefinementChips plan={plan} busy={false} onRefine={onRefine} />);
    expect(screen.queryByRole('button', { name: 'Sumar un juego en casa' })).not.toBeInTheDocument();
    rerender(<RefinementChips plan={plan} busy={false} onRefine={onRefine} canAddHomeGame />);
    await user.click(screen.getByRole('button', { name: 'Sumar un juego en casa' }));
    expect(onRefine).toHaveBeenCalledWith({ planId: 42, action: 'ADD_HOME_GAME' });
    const atHome = {
      ...plan,
      details: plan.details.map((detail) => ({
        ...detail,
        stop: { ...detail.stop!, place: { kind: 'home', atHome: true } as never },
      })),
    };
    rerender(<RefinementChips plan={atHome} busy={false} onRefine={onRefine} canAddHomeGame />);
    expect(screen.queryByRole('button', { name: 'Sumar un juego en casa' })).not.toBeInTheDocument();
  });
});
