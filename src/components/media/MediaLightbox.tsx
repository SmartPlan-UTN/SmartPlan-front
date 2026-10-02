'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Icon } from '@/components/ui';
import type { MediaImage } from '@/types';

import { AuthenticatedImage } from './AuthenticatedImage';
import styles from './media.module.css';

interface MediaLightboxProps {
  images: MediaImage[];
  index: number;
  resourceName: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/**
 * A photo at full size over a dark backdrop. Arrows (and ← →) move between
 * photos, Escape or the backdrop closes it, and focus returns to the photo
 * that opened it.
 */
export function MediaLightbox({ images, index, resourceName, onIndexChange, onClose }: MediaLightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const total = images.length;
  const image = images[index] ?? images[0];

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (total > 1 && event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        onIndexChange((index + total - 1) % total);
        return;
      }
      if (total > 1 && event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        onIndexChange((index + 1) % total);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
      if (focusable.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      const current = focusable.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.shiftKey
        ? (current <= 0 ? focusable.length - 1 : current - 1)
        : (current + 1) % focusable.length;
      focusable[next].focus();
    }
    // Capture before a parent dialog's document listener sees Escape or Tab.
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [index, total, onClose, onIndexChange]);

  if (!image) return null;

  return createPortal(
    <div
      ref={dialogRef}
      className={styles.lightbox}
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${resourceName}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button ref={closeRef} type="button" className={styles.lightboxClose} onClick={onClose} aria-label="Cerrar">
        <Icon name="x" size={22} aria-hidden="true" />
      </button>

      <figure className={styles.lightboxFigure}>
        <AuthenticatedImage
          key={image.id}
          url={image.url}
          alt={`${resourceName}, foto ${index + 1} de ${total}`}
          width={1600}
          height={1200}
          className={styles.lightboxImage}
        />
        {total > 1 ? (
          <figcaption className={styles.lightboxCount} aria-live="polite">
            {index + 1} / {total}
          </figcaption>
        ) : null}
      </figure>

      {total > 1 ? (
        <>
          <button
            type="button"
            className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
            onClick={() => onIndexChange((index + total - 1) % total)}
            aria-label="Foto anterior"
          >
            <Icon name="chevron-left" size={26} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${styles.lightboxNav} ${styles.lightboxNext}`}
            onClick={() => onIndexChange((index + 1) % total)}
            aria-label="Foto siguiente"
          >
            <Icon name="chevron-right" size={26} aria-hidden="true" />
          </button>
        </>
      ) : null}
    </div>,
    document.body,
  );
}
