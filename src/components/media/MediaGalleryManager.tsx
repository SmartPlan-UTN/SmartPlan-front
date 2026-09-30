'use client';

import Image from 'next/image';
import { useEffect, useState, type ChangeEvent } from 'react';
import { deleteMedia, listMedia, updateMedia, uploadMedia } from '@/lib/api/media';
import type { MediaImage, MediaTarget } from '@/types';
import { AuthenticatedImage } from './AuthenticatedImage';
import styles from './media.module.css';

interface MediaGalleryManagerProps {
  target: MediaTarget;
  resourceId: number;
  resourceName: string;
  onChanged?: () => void;
}

const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE = 5 * 1024 * 1024;

export function MediaGalleryManager({ target, resourceId, resourceName, onChanged }: MediaGalleryManagerProps) {
  const [images, setImages] = useState<MediaImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [previews, setPreviews] = useState<Array<{ name: string; url: string }>>([]);
  const limit = target === 'rating' || target === 'feedback' ? 5 : 10;

  async function refresh() {
    const data = await listMedia(target, resourceId);
    setImages([...data].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id));
    onChanged?.();
  }

  useEffect(() => {
    let active = true;
    listMedia(target, resourceId).then((data) => {
      if (active) setImages([...data].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id));
    }).catch(() => {
      if (active) setError('No pudimos cargar las imágenes.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [target, resourceId]);

  async function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    const localPreviews = files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    setPreviews(localPreviews);
    setError(null);
    setBusy(true);
    let uploaded = 0;
    const failures: string[] = [];
    try {
      for (const file of files) {
        if (images.length + uploaded >= limit) {
          failures.push(`${file.name} (límite de ${limit})`);
          continue;
        }
        if (!ACCEPTED.has(file.type) || file.size > MAX_SIZE) {
          failures.push(`${file.name} (usá JPG, PNG o WebP de hasta 5 MB)`);
          continue;
        }
        try {
          await uploadMedia(target, resourceId, file, setProgress);
          uploaded += 1;
        } catch {
          failures.push(file.name);
        }
      }
      await refresh();
      if (failures.length > 0) {
        setError(`No se pudieron subir: ${failures.join(', ')}. Las imágenes guardadas permanecen.`);
      }
    } catch {
      setError('No pudimos actualizar la galería.');
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
      setError('No pudimos cambiar la imagen.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(image: MediaImage) {
    setError(null);
    setBusy(true);
    try {
      await deleteMedia(target, resourceId, image.id);
      await refresh();
    } catch {
      setError('No pudimos eliminar la imagen.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p role="status">Cargando galería…</p>;
  return (
    <section className={styles.manager} aria-label={`Galería de ${resourceName}`}>
      <div className={styles.managerHeader}>
        <strong>Imágenes ({images.length}/{limit})</strong>
        <label className={styles.addButton}>
          Agregar imágenes
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || images.length >= limit} onChange={(event) => void onFiles(event)} />
        </label>
      </div>
      {busy && progress > 0 ? <progress value={progress} max={100} aria-label="Progreso de carga" /> : null}
      {previews.length > 0 ? <div className={styles.grid} aria-label="Vista previa de imágenes seleccionadas">{previews.map((preview) => <div key={preview.url} className={styles.tile}><Image unoptimized src={preview.url} alt={`Vista previa de ${preview.name}`} width={300} height={180} /><span>{preview.name}</span></div>)}</div> : null}
      {error ? <p role="alert">{error}</p> : null}
      {images.length === 0 ? <p>Todavía no hay imágenes.</p> : null}
      <div className={styles.grid}>
        {images.map((image, index) => (
          <div key={image.id} className={styles.tile}>
            <AuthenticatedImage url={image.url} alt={`${resourceName}, imagen ${index + 1}`} width={300} height={180} />
            {image.isPrimary ? <span>Portada</span> : <button type="button" disabled={busy} onClick={() => void change(image, { isPrimary: true })}>Usar como portada</button>}
            <div className={styles.tileActions}>
              <button type="button" disabled={busy || index === 0} onClick={() => void change(image, { displayOrder: index - 1 })}>Subir orden</button>
              <button type="button" disabled={busy || index === images.length - 1} onClick={() => void change(image, { displayOrder: index + 1 })}>Bajar orden</button>
              <button type="button" disabled={busy} onClick={() => void remove(image)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
