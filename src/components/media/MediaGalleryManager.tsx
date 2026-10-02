'use client';

import Image from 'next/image';
import { useEffect, useId, useState, type DragEvent } from 'react';

import { Icon } from '@/components/ui';
import { deleteMedia, listMedia, updateMedia, uploadMedia } from '@/lib/api/media';
import type { MediaImage, MediaTarget } from '@/types';

import { AuthenticatedImage } from './AuthenticatedImage';
import { MediaLightbox } from './MediaLightbox';
import { sortImages } from './sortImages';
import styles from './media.module.css';

interface MediaGalleryManagerProps {
  target: MediaTarget;
  resourceId: number;
  resourceName: string;
  onChanged?: () => void;
  /** Reload photos when another manager changed the same resource. */
  refreshKey?: number;
  /** Heading of the section; defaults to one that fits the target. */
  title?: string;
  /** One line under the heading; defaults to one that fits the target. */
  description?: string;
  /**
   * `section`: a full block with heading (a page). `embedded`: no heading or
   * frame, regular size, for a step that already asks the question (a
   * dialog). `compact`: no heading and small photos, for a row of a list.
   */
  variant?: 'section' | 'embedded' | 'compact';
}

const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ACCEPT_ATTRIBUTE = 'image/jpeg,image/png,image/webp';
const MAX_SIZE = 5 * 1024 * 1024;
const FORMAT_HINT = 'JPG, PNG o WebP · hasta 5 MB';

/** Targets whose first photo stands for them (a cover) elsewhere. */
const HAS_COVER: ReadonlySet<MediaTarget> = new Set(['plan', 'activity', 'place']);

const DEFAULT_COPY: Record<MediaTarget, { title: string; description: string }> = {
  plan: {
    title: 'Fotos de tu salida',
    description: 'Guardá cómo estuvo. La portada es la que se ve en Mis salidas.',
  },
  rating: {
    title: 'Fotos de tu valoración',
    description: 'Mostrales a otras personas cómo es la actividad.',
  },
  feedback: { title: 'Fotos de tu experiencia', description: 'Sumá las fotos que quieras recordar.' },
  activity: { title: 'Fotos de la actividad', description: 'La portada es la primera que se ve.' },
  place: { title: 'Fotos del lugar', description: 'La portada es la primera que se ve.' },
};

export function mediaLimit(target: MediaTarget): number {
  return target === 'rating' || target === 'feedback' ? 5 : 10;
}

type Preview = { name: string; url: string };

/**
 * Add, order, pick the cover of, and remove the photos of a resource
 * (SmartPlan-back media galleries). Photos are optional everywhere, so the
 * empty state invites rather than reports: "Sumá fotos si querés".
 */
export function MediaGalleryManager({
  target,
  resourceId,
  resourceName,
  onChanged,
  refreshKey = 0,
  title,
  description,
  variant = 'section',
}: MediaGalleryManagerProps) {
  const inputId = useId();
  const headingId = useId();
  const [images, setImages] = useState<MediaImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [dragging, setDragging] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const limit = mediaLimit(target);
  const copy = DEFAULT_COPY[target];
  const hasCover = HAS_COVER.has(target);
  const full = images.length >= limit;
  const compact = variant === 'compact';
  const headed = variant === 'section';

  async function refresh() {
    setImages(sortImages(await listMedia(target, resourceId)));
    onChanged?.();
  }

  useEffect(() => {
    let active = true;
    listMedia(target, resourceId)
      .then((data) => {
        if (active) setImages(sortImages(data));
      })
      .catch(() => {
        if (active) setError('No pudimos cargar las fotos.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [target, resourceId, refreshKey]);

  async function addFiles(files: File[]) {
    if (files.length === 0 || busy) return;
    const localPreviews = files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    setPreviews(localPreviews);
    setError(null);
    setBusy(true);
    let uploaded = 0;
    const failures: string[] = [];
    try {
      for (const file of files) {
        if (images.length + uploaded >= limit) {
          failures.push(`${file.name} (ya hay ${limit})`);
          continue;
        }
        if (!ACCEPTED.has(file.type) || file.size > MAX_SIZE) {
          failures.push(`${file.name} (usá ${FORMAT_HINT})`);
          continue;
        }
        try {
          setProgress(0);
          await uploadMedia(target, resourceId, file, setProgress);
          uploaded += 1;
        } catch {
          failures.push(file.name);
        }
      }
      await refresh();
      if (failures.length > 0) {
        setError(`No se pudieron subir: ${failures.join(', ')}. Las demás quedaron guardadas.`);
      }
    } catch {
      setError('No pudimos actualizar las fotos.');
    } finally {
      localPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
      setPreviews([]);
      setBusy(false);
      setProgress(0);
    }
  }

  async function change(image: MediaImage, changes: { isPrimary?: boolean; displayOrder?: number }) {
    setError(null);
    setBusy(true);
    try {
      await updateMedia(target, resourceId, image.id, changes);
      await refresh();
    } catch {
      setError('No pudimos cambiar la foto.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(image: MediaImage) {
    setError(null);
    setBusy(true);
    try {
      await deleteMedia(target, resourceId, image.id);
      setConfirmingDelete(null);
      await refresh();
    } catch {
      setError('No pudimos eliminar la foto.');
    } finally {
      setBusy(false);
    }
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    if (full || busy) return;
    void addFiles(Array.from(event.dataTransfer.files));
  }

  const dropHandlers = {
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (full || busy) return;
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop,
  };

  const fileInput = (
    <input
      id={inputId}
      className={styles.fileInput}
      type="file"
      accept={ACCEPT_ATTRIBUTE}
      multiple
      disabled={busy || full}
      aria-label="Agregar fotos"
      onChange={(event) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        void addFiles(files);
      }}
    />
  );

  const isEmpty = !loading && images.length === 0 && previews.length === 0;
  const rootClass = [
    styles.manager,
    compact ? styles.managerCompact : '',
    variant === 'embedded' ? styles.managerEmbedded : '',
    dragging ? styles.managerDragging : '',
  ].filter(Boolean).join(' ');

  return (
    <section
      className={rootClass}
      aria-labelledby={headed ? headingId : undefined}
      aria-label={headed ? undefined : `Fotos de ${resourceName}`}
      aria-busy={busy || loading}
      {...dropHandlers}
    >
      {headed ? (
        <header className={styles.managerHeader}>
          <div>
            <h3 id={headingId} className={styles.managerTitle}>
              <Icon name="camera" size={18} aria-hidden="true" />
              {title ?? copy.title}
            </h3>
            <p className={styles.managerDescription}>{description ?? copy.description}</p>
          </div>
          {images.length > 0 ? (
            <span className={styles.managerCount}>{images.length} de {limit}</span>
          ) : null}
        </header>
      ) : null}

      {loading ? (
        <div className={styles.managerGrid} aria-hidden="true">
          <span className={styles.tileSkeleton} />
          <span className={styles.tileSkeleton} />
        </div>
      ) : isEmpty ? (
        <label htmlFor={inputId} className={compact ? styles.emptyDropCompact : styles.emptyDrop}>
          {fileInput}
          <span className={styles.emptyDropIcon} aria-hidden="true">
            <Icon name="image-plus" size={compact ? 18 : 24} />
          </span>
          <span className={styles.emptyDropText}>
            <span className={styles.emptyDropTitle}>
              {compact ? 'Agregar fotos' : headed ? 'Sumá fotos si querés' : 'Elegir fotos'}
            </span>
            <span className={styles.emptyDropHint}>
              {compact ? FORMAT_HINT : `Arrastralas acá o elegilas · ${FORMAT_HINT}`}
            </span>
          </span>
        </label>
      ) : (
        <ul className={styles.managerGrid}>
          {images.map((image, index) => (
            <li key={image.id} className={styles.tile}>
              <button
                type="button"
                className={styles.photoButton}
                onClick={() => setOpen(index)}
                aria-label={`Ver foto ${index + 1} de ${images.length}`}
              >
                <AuthenticatedImage url={image.url} alt="" width={320} height={240} className={styles.photo} />
              </button>

              {hasCover && image.isPrimary ? (
                <span className={styles.coverBadge}>
                  <Icon name="star" size={11} aria-hidden="true" />
                  Portada
                </span>
              ) : null}

              {image.communityHidden ? (
                <span className={styles.hiddenBadge} title="La moderación la quitó de la comunidad. Sigue guardada en tu salida.">
                  <Icon name="eye-off" size={11} aria-hidden="true" />
                  No visible en la comunidad
                </span>
              ) : null}

              {confirmingDelete === image.id ? (
                <div className={styles.confirmDelete} role="group" aria-label="Confirmar eliminación">
                  <span>¿Eliminar esta foto?</span>
                  <div className={styles.confirmDeleteActions}>
                    <button type="button" className={styles.confirmYes} disabled={busy} onClick={() => void remove(image)}>
                      Eliminar
                    </button>
                    <button type="button" className={styles.confirmNo} disabled={busy} onClick={() => setConfirmingDelete(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.tileActions}>
                  {hasCover && !image.isPrimary ? (
                    <button type="button" className={styles.tileAction} disabled={busy} onClick={() => void change(image, { isPrimary: true })} aria-label="Usar como portada" title="Usar como portada">
                      <Icon name="star" size={14} aria-hidden="true" />
                    </button>
                  ) : null}
                  {images.length > 1 ? (
                    <>
                      <button type="button" className={styles.tileAction} disabled={busy || index === 0} onClick={() => void change(image, { displayOrder: index - 1 })} aria-label="Mover antes" title="Mover antes">
                        <Icon name="chevron-left" size={14} aria-hidden="true" />
                      </button>
                      <button type="button" className={styles.tileAction} disabled={busy || index === images.length - 1} onClick={() => void change(image, { displayOrder: index + 1 })} aria-label="Mover después" title="Mover después">
                        <Icon name="chevron-right" size={14} aria-hidden="true" />
                      </button>
                    </>
                  ) : null}
                  <button type="button" className={`${styles.tileAction} ${styles.tileActionDanger}`} disabled={busy} onClick={() => setConfirmingDelete(image.id)} aria-label="Eliminar foto" title="Eliminar">
                    <Icon name="trash-2" size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          ))}

          {previews.map((preview) => (
            <li key={preview.url} className={`${styles.tile} ${styles.tileUploading}`}>
              <Image unoptimized src={preview.url} alt={`Subiendo ${preview.name}`} width={320} height={240} className={styles.photo} />
              <span className={styles.uploadOverlay} aria-hidden="true">
                <Icon name="loader-circle" size={20} className={styles.spin} />
              </span>
              {progress > 0 ? <span className={styles.uploadBar} style={{ width: `${progress}%` }} /> : null}
            </li>
          ))}

          {!full ? (
            <li className={styles.addTileItem}>
              <label htmlFor={inputId} className={styles.addTile} aria-disabled={busy || undefined}>
                {fileInput}
                <Icon name="image-plus" size={compact ? 18 : 22} aria-hidden="true" />
                <span>Agregar</span>
              </label>
            </li>
          ) : null}
        </ul>
      )}

      {busy && previews.length > 0 ? (
        <p className="sp-sr-only" role="status">Subiendo fotos… {progress}%</p>
      ) : null}
      {error ? (
        <p className={styles.managerError} role="alert">
          <Icon name="circle-alert" size={15} aria-hidden="true" />
          {error}
        </p>
      ) : null}
      {full && headed ? <p className={styles.managerFull}>Llegaste al máximo de {limit} fotos.</p> : null}

      {open !== null ? (
        <MediaLightbox images={images} index={open} resourceName={resourceName} onIndexChange={setOpen} onClose={() => setOpen(null)} />
      ) : null}
    </section>
  );
}
