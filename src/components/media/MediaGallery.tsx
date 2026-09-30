'use client';

import { useEffect, useState } from 'react';
import { listMedia } from '@/lib/api/media';
import type { MediaImage, MediaTarget } from '@/types';
import { AuthenticatedImage } from './AuthenticatedImage';
import styles from './media.module.css';

interface MediaGalleryProps {
  target: MediaTarget;
  resourceId: number;
  resourceName: string;
  refreshKey?: number;
}

export function MediaGallery({ target, resourceId, resourceName, refreshKey = 0 }: MediaGalleryProps) {
  const [images, setImages] = useState<MediaImage[]>([]);
  const [index, setIndex] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    listMedia(target, resourceId).then((data) => {
      if (!active) return;
      setImages([...data].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id));
      setIndex(0);
      setState('ready');
    }).catch(() => {
      if (active) setState('error');
    });
    return () => { active = false; };
  }, [target, resourceId, refreshKey]);

  if (state === 'loading') return <div className={styles.skeleton} role="status">Cargando imágenes…</div>;
  if (state === 'error') return <p role="alert">No pudimos cargar las imágenes.</p>;
  if (images.length === 0) return <div className={styles.placeholder}>Sin imágenes disponibles</div>;
  const selected = images[index] ?? images[0];
  return (
    <div className={styles.gallery} aria-label={`Imágenes de ${resourceName}`} tabIndex={images.length > 1 ? 0 : undefined} onKeyDown={(event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); setIndex((index + images.length - 1) % images.length); }
      if (event.key === 'ArrowRight') { event.preventDefault(); setIndex((index + 1) % images.length); }
    }}>
      <AuthenticatedImage url={selected.url} alt={`${resourceName}, imagen ${index + 1} de ${images.length}`} width={960} height={540} className={styles.galleryImage} />
      {images.length > 1 ? (
        <div className={styles.controls}>
          <button type="button" onClick={() => setIndex((index + images.length - 1) % images.length)} aria-label="Imagen anterior">Anterior</button>
          <span aria-live="polite">{index + 1} / {images.length}</span>
          <button type="button" onClick={() => setIndex((index + 1) % images.length)} aria-label="Imagen siguiente">Siguiente</button>
        </div>
      ) : null}
    </div>
  );
}
