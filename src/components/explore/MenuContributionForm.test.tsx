import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuContributionForm } from './MenuContributionForm';

const { submitMenuContribution, submitMenuContributionPhoto } = vi.hoisted(() => ({ submitMenuContribution: vi.fn(), submitMenuContributionPhoto: vi.fn() }));
vi.mock('@/lib/api/menu-contributions', () => ({ submitMenuContribution, submitMenuContributionPhoto }));

describe('MenuContributionForm', () => {
  beforeEach(() => { submitMenuContribution.mockReset(); submitMenuContributionPhoto.mockReset(); });

  it('submits a menu for admin review and confirms that it remains pending', async () => {
    submitMenuContribution.mockResolvedValue({ id: 3 });
    render(<MenuContributionForm placeId={42} placeName="Anna Bistró" />);
    fireEvent.click(screen.getByRole('button', { name: /aportar carta/i }));
    fireEvent.change(screen.getByLabelText(/texto del menú/i), { target: { value: 'Principales\nMilanesa $12000\nBebidas\nAgua $2500' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar para revisión/i }));
    await waitFor(() => expect(submitMenuContribution).toHaveBeenCalledWith(42, expect.objectContaining({ menuText: expect.stringContaining('Milanesa') })));
    expect(await screen.findByRole('status')).toHaveTextContent(/quedó en revisión/i);
  });

  it('sends a menu photo for local reading and admin review', async () => {
    submitMenuContributionPhoto.mockResolvedValue({ id: 4, status: 'pending' });
    render(<MenuContributionForm placeId={42} placeName="Anna Bistró" />);
    fireEvent.click(screen.getByRole('button', { name: /aportar carta/i }));
    const photo = new File([new Uint8Array([1, 2, 3])], 'menu.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText(/foto del menú/i), { target: { files: [photo] } });
    fireEvent.click(screen.getByRole('button', { name: /enviar para revisión/i }));
    await waitFor(() => expect(submitMenuContributionPhoto).toHaveBeenCalledWith(42, photo));
    expect(await screen.findByRole('status')).toHaveTextContent(/quedó en revisión/i);
  });
});
