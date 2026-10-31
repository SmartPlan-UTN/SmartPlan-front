import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MenuContributionForm } from './MenuContributionForm';

const { submitMenuContribution, submitMenuContributionPhoto } = vi.hoisted(() => ({ submitMenuContribution: vi.fn(), submitMenuContributionPhoto: vi.fn() }));
vi.mock('@/lib/api/menu-contributions', () => ({ submitMenuContribution, submitMenuContributionPhoto }));
const session = vi.hoisted(() => ({ status: 'authenticated' }));
vi.mock('@/lib/auth', () => ({ useSession: () => session }));

describe('MenuContributionForm', () => {
  beforeEach(() => { submitMenuContribution.mockReset(); submitMenuContributionPhoto.mockReset(); session.status = 'authenticated'; });

  it('asks for a session before offering the form', () => {
    session.status = 'unauthenticated';
    render(<MenuContributionForm placeId={42} placeName="Anna Bistró" />);
    expect(screen.queryByRole('button', { name: /aportar carta/i })).toBeNull();
    expect(screen.getByRole('link', { name: /iniciá sesión/i })).toHaveAttribute('href', expect.stringContaining('/login'));
  });

  it('does not offer a link or text next to a photo, which would be dropped', () => {
    render(<MenuContributionForm placeId={42} placeName="Anna Bistró" />);
    fireEvent.click(screen.getByRole('button', { name: /aportar carta/i }));
    const photo = new File([new Uint8Array([1, 2, 3])], 'menu.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText(/foto del menú/i), { target: { files: [photo] } });
    expect(screen.getByLabelText(/enlace público/i)).toBeDisabled();
    expect(screen.getByLabelText(/texto del menú/i)).toBeDisabled();
  });

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
