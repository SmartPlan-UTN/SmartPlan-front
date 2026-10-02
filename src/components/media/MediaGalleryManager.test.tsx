import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaGallery } from './MediaGallery';
import { MediaGalleryManager } from './MediaGalleryManager';

const listMedia = vi.hoisted(() => vi.fn());
const uploadMedia = vi.hoisted(() => vi.fn());
const deleteMedia = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/media', () => ({
  listMedia,
  uploadMedia,
  updateMedia: vi.fn(),
  deleteMedia,
  downloadMedia: vi.fn().mockRejectedValue(new Error('image unavailable')),
}));

function photo(id: number, isPrimary = false) {
  return { id, url: `/api/media/plan/${id}`, isPrimary, displayOrder: id, createdAt: '2026-09-30' };
}

describe('MediaGalleryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let nextPreview = 0;
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => `blob:preview-${++nextPreview}`) });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });

  it('invites to add photos instead of reporting an empty gallery', async () => {
    listMedia.mockResolvedValue([]);
    render(<MediaGalleryManager target="plan" resourceId={7} resourceName="Tarde de vinos" />);

    expect(await screen.findByText('Sumá fotos si querés')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fotos de tu salida' })).toBeInTheDocument();
    expect(screen.getByLabelText('Agregar fotos')).toBeEnabled();
    expect(screen.queryByText(/todavía no hay/i)).not.toBeInTheDocument();
  });

  it('keeps the photos that uploaded and names the one that failed', async () => {
    listMedia.mockResolvedValueOnce([]).mockResolvedValueOnce([photo(3, true)]);
    uploadMedia.mockRejectedValueOnce(new Error('S3 unavailable')).mockResolvedValueOnce({ id: 3 });
    render(<MediaGalleryManager target="feedback" resourceId={7} resourceName="experiencia" />);

    const input = await screen.findByLabelText('Agregar fotos');
    await userEvent.upload(input, [
      new File(['first'], 'fallo.png', { type: 'image/png' }),
      new File(['second'], 'bien.png', { type: 'image/png' }),
    ]);

    expect(await screen.findByRole('alert')).toHaveTextContent('fallo.png');
    expect(screen.getByText('1 de 5')).toBeInTheDocument();
    expect(uploadMedia).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2));
  });

  it('stops offering to add once the limit is reached', async () => {
    listMedia.mockResolvedValue(Array.from({ length: 5 }, (_, index) => photo(index + 1, index === 0)));
    render(<MediaGalleryManager target="feedback" resourceId={7} resourceName="experiencia" />);

    expect(await screen.findByText('5 de 5')).toBeInTheDocument();
    expect(screen.queryByLabelText('Agregar fotos')).not.toBeInTheDocument();
    expect(screen.getByText('Llegaste al máximo de 5 fotos.')).toBeInTheDocument();
  });

  it('marks the cover and asks before deleting a photo', async () => {
    listMedia.mockResolvedValueOnce([photo(1, true), photo(2)]).mockResolvedValueOnce([photo(1, true)]);
    deleteMedia.mockResolvedValue(undefined);
    render(<MediaGalleryManager target="plan" resourceId={7} resourceName="Tarde de vinos" />);

    expect(await screen.findByText('Portada')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Usar como portada' })).toHaveLength(1);

    await userEvent.click(screen.getAllByRole('button', { name: 'Eliminar foto' })[1]);
    expect(deleteMedia).not.toHaveBeenCalled();
    const confirm = screen.getByRole('group', { name: 'Confirmar eliminación' });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Eliminar' }));

    expect(deleteMedia).toHaveBeenCalledWith('plan', 7, 2);
    await waitFor(() => expect(screen.getAllByRole('button', { name: /ver foto/i })).toHaveLength(1));
  });
});

describe('MediaGallery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('draws nothing while there are no photos', async () => {
    listMedia.mockResolvedValue([]);
    const { container } = render(<MediaGallery target="plan" resourceId={7} resourceName="Tarde de vinos" />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByText(/sin imágenes/i)).not.toBeInTheDocument();
  });

  it('opens a photo full size and moves between photos', async () => {
    listMedia.mockResolvedValue([photo(1, true), photo(2), photo(3)]);
    render(<MediaGallery target="plan" resourceId={7} resourceName="Tarde de vinos" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Ver foto 2 de 3' }));
    const dialog = screen.getByRole('dialog', { name: 'Fotos de Tarde de vinos' });
    expect(within(dialog).getByText('2 / 3')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Foto siguiente' }));
    expect(within(dialog).getByText('3 / 3')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowRight}');
    expect(within(dialog).getByText('1 / 3')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
