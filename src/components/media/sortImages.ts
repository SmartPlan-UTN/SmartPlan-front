import type { MediaImage } from '@/types';

/** The order the person chose, then upload order for ties. */
export function sortImages(images: MediaImage[]): MediaImage[] {
  return [...images].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
}
