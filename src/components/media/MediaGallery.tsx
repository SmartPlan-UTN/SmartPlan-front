'use client';

import { useEffect, useState } from 'react';

import { listMedia } from '@/lib/api/media';
import type { MediaImage, MediaTarget } from '@/types';

import { AuthenticatedImage } from './AuthenticatedImage';
import { MediaLightbox } from './MediaLightbox';
import { sortImages } from './sortImages';
import styles from './media.module.css';

interface MediaGalleryProps {
  target: MediaTarget;
  resourceId: number;
  resourceName: string;
  refreshKey?: number;
  /**
   * `mosaic`: the cover large with up to four photos beside it (a plan, an
   * activity). `strip`: small square thumbnails in a row (under a rating).
   */
  variant?: 'mosaic' | 'strip';
}

const MOSAIC_VISIBLE = 5;
const STRIP_VISIBLE = 6;

/**
 * Read-only photos of a resource. Draws nothing while there are none — an
 * empty box saying so adds noise to a page — and opens any photo full size.
 */
export function MediaGallery({ target, resourceId, resourceName, refreshKey = 0, variant = 'mosaic' }: MediaGalleryProps) {
  const [images, setImages] = useState<MediaImage[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    listMedia(target, resourceId)
      .then((data) => {
        if (!active) return;
        setImages(sortImages(data));
        setState('ready');
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, [target, resourceId, refreshKey]);

  if (state === 'loading') {
    return <div className={variant === 'strip' ? styles.stripSkeleton : styles.mosaicSkeleton} role="status" aria-label="Cargando fotos" />;
  }
  if (state === 'error' || images.length === 0) return null;

  const limit = variant === 'strip' ? STRIP_VISIBLE : MOSAIC_VISIBLE;
  const visible = images.slice(0, limit);
  const hidden = images.length - visible.length;

  return (
    <>
      <ul
        className={variant === 'strip' ? styles.strip : styles.mosaic}
        data-count={Math.min(visible.length, limit)}
        aria-label={`Fotos de ${resourceName}`}
      >
        {visible.map((image, index) => (
          <li key={image.id} className={styles.mosaicItem}>
            <button
              type="button"
              className={styles.photoButton}
              onClick={() => setOpen(index)}
              aria-label={`Ver foto ${index + 1} de ${images.length}`}
            >
              <AuthenticatedImage
                url={image.url}
                alt=""
                width={index === 0 && variant === 'mosaic' ? 960 : 320}
                height={index === 0 && variant === 'mosaic' ? 720 : 240}
                className={styles.photo}
              />
              {hidden > 0 && index === visible.length - 1 ? (
                <span className={styles.moreOverlay} aria-hidden="true">+{hidden}</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {open !== null ? (
        <MediaLightbox
          images={images}
          index={open}
          resourceName={resourceName}
          onIndexChange={setOpen}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}
