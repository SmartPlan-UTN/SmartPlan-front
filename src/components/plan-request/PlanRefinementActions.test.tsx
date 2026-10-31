import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PlanDetailResult } from '@/types';
import { PlanRefinementActions } from './PlanRefinementActions';

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
});
