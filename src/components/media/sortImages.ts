import type { MediaImage } from '@/types';

/** Chosen order, optionally leading with the cover for read-only mosaics. */
export function sortImages(images: MediaImage[], primaryFirst = false): MediaImage[] {
  return [...images].sort((a, b) => {
    if (primaryFirst && a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.displayOrder - b.displayOrder || a.id - b.id;
  });
}
