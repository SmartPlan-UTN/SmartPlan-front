import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getPlaceDetail, listPlaces } from '@/lib/api';
import { PlaceStopPicker } from './PlaceStopPicker';

vi.mock('@/lib/api', () => ({ getPlaceDetail: vi.fn(), listPlaces: vi.fn() }));

describe('place stop picker', () => {
  it('adds only an intrinsic action confirmed by the API', async () => {
    vi.mocked(listPlaces).mockResolvedValue({ data: [{ id: 42, name: 'Café del barrio', department: { name: 'Godoy Cruz' } }], pagination: { page: 1, limit: 6, total: 1, totalPages: 1 } } as Awaited<ReturnType<typeof listPlaces>>);
    vi.mocked(getPlaceDetail).mockResolvedValue({ actions: [{ action: 'coffee', label: 'Café', durationMinutes: 60 }], summary: null } as Awaited<ReturnType<typeof getPlaceDetail>>);
    const add = vi.fn(); const user = userEvent.setup();
    render(<PlaceStopPicker stops={[]} disabled={false} onAdd={add} />);
    await user.click(screen.getByText('Sumar un restaurante, café u otro lugar'));
    await user.type(screen.getByLabelText('Nombre o zona'), 'Godoy Cruz');
    await user.click(screen.getByRole('button', { name: 'Buscar lugares' }));
    await user.click(await screen.findByRole('button', { name: 'Sumar lugar' }));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ placeTarget: { placeId: 42, action: 'coffee' }, estimatedCost: null }));
  });
});
