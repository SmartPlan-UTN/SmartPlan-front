import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaGalleryManager } from './MediaGalleryManager';

const listMedia = vi.hoisted(() => vi.fn());
const uploadMedia = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api/media', () => ({
  listMedia,
  uploadMedia,
  updateMedia: vi.fn(),
  deleteMedia: vi.fn(),
  downloadMedia: vi.fn().mockRejectedValue(new Error('image unavailable')),
}));

describe('MediaGalleryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let nextPreview = 0;
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => `blob:preview-${++nextPreview}`) });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  });

  it('preserves a saved feedback and identifies a photo that failed to upload', async () => {
    listMedia.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 3, url: '/api/media/feedback/3', isPrimary: true, displayOrder: 0, createdAt: '2026-09-30' }]);
    uploadMedia.mockRejectedValueOnce(new Error('S3 unavailable')).mockResolvedValueOnce({ id: 3 });
    render(<MediaGalleryManager target="feedback" resourceId={7} resourceName="experiencia" />);

    const input = await screen.findByLabelText('Agregar imágenes');
    await userEvent.upload(input, [
      new File(['first'], 'fallo.png', { type: 'image/png' }),
      new File(['second'], 'bien.png', { type: 'image/png' }),
    ]);

    expect(await screen.findByRole('alert')).toHaveTextContent('fallo.png');
    expect(screen.getByText('Imágenes (1/5)')).toBeInTheDocument();
    expect(uploadMedia).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2));
  });

  it('disables adding after the five-photo feedback limit', async () => {
    listMedia.mockResolvedValue(Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      url: `/api/media/feedback/${index + 1}`,
      isPrimary: index === 0,
      displayOrder: index,
      createdAt: '2026-09-30',
    })));
    render(<MediaGalleryManager target="feedback" resourceId={7} resourceName="experiencia" />);
    expect(await screen.findByText('Imágenes (5/5)')).toBeInTheDocument();
    expect(screen.getByLabelText('Agregar imágenes')).toBeDisabled();
  });
});
