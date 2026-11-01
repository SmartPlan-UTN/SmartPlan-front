import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getOuting } from '@/lib/api';
import { outingDetail } from '@/test/fixtures/outings';
import { StopFeedbackFields } from './StopFeedbackFields';

vi.mock('@/lib/api', () => ({ getOuting: vi.fn() }));

describe('optional stop feedback', () => {
  it('loads only on request and sends the outing detail id with explicit signals', async () => {
    vi.mocked(getOuting).mockResolvedValue(outingDetail({ details: [{
      id: 71, order: 1, estimatedCost: null, estimatedDuration: 90, activity: null,
      stop: { kind: 'PLACE_ACTION', label: 'Cena', action: 'meal', actionLabel: null, activityId: null, place: null, startMinute: null, legTravelMinutes: null, legDistanceMeters: null, estimateBasis: null },
    }] }));
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StopFeedbackFields outingId={40} disabled={false} onChange={onChange} onInvalidChange={vi.fn()} />);
    expect(getOuting).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByText('Cómo salió cada parada (opcional)'));
    await user.click(await screen.findByRole('button', { name: 'Cómo salió Cena' }));
    await user.click(screen.getByRole('option', { name: 'La salteamos' }));
    expect(onChange).toHaveBeenLastCalledWith([{ detailId: 71, status: 'SKIPPED' }]);
    await user.click(screen.getByRole('button', { name: 'Reportar un dato de Cena' }));
    await user.click(screen.getByRole('option', { name: 'El lugar estaba cerrado' }));
    expect(onChange).toHaveBeenLastCalledWith([{ detailId: 71, status: 'SKIPPED', report: 'CLOSED' }]);
    expect(onChange.mock.calls.every(([values]) => values.every((value: { amount?: number }) => value.amount === undefined))).toBe(true);
  });

  it('reopens a collapsed section and focuses the invalid amount when a submit is blocked', async () => {
    vi.mocked(getOuting).mockResolvedValue(outingDetail({ details: [{
      id: 71, order: 1, estimatedCost: null, estimatedDuration: 90, activity: null,
      stop: { kind: 'PLACE_ACTION', label: 'Cena', action: 'meal', actionLabel: null, activityId: null, place: null, startMinute: null, legTravelMinutes: null, legDistanceMeters: null, estimateBasis: null },
    }] }));
    const user = userEvent.setup();
    const props = { outingId: 40, disabled: false, onChange: vi.fn(), onInvalidChange: vi.fn() };
    const { container, rerender } = render(<StopFeedbackFields {...props} />);
    const summary = screen.getByText('Cómo salió cada parada (opcional)');
    await user.click(summary);
    await user.type(await screen.findByLabelText(/Gasto del grupo/), 'abc');
    expect(props.onInvalidChange).toHaveBeenLastCalledWith(true);
    await user.click(summary);
    const details = container.querySelector('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);

    rerender(<StopFeedbackFields {...props} revealInvalid={1} />);
    expect(details.open).toBe(true);
    await waitFor(() => expect(screen.getByLabelText(/Gasto del grupo/)).toHaveFocus());
  });
});
