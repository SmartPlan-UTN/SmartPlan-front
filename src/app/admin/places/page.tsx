'use client';

import { useEffect, useState } from 'react';
import { MediaGalleryManager } from '@/components/media';
import { listPlaces } from '@/lib/api';
import type { PlaceOption } from '@/types';
import styles from './places.module.css';

export default function AdminPlacesPage() {
  const [search, setSearch] = useState('');
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [selected, setSelected] = useState<PlaceOption | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listPlaces({ search: search || undefined, page, limit: 20 })
      .then((result) => {
        if (!active) return;
        setPlaces(result.data);
        setHasMore(page < result.pagination.totalPages);
        setError(null);
      })
      .catch(() => { if (active) setError('No pudimos cargar los lugares.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, page]);

  return (
    <section className={styles.page}>
      <h1>Lugares</h1>
      <p>Seleccioná un lugar registrado para gestionar sus imágenes.</p>
      <label>Buscar lugar
        <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); setLoading(true); }} />
      </label>
      {loading ? <p role="status">Cargando lugares…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!loading && !error && places.length === 0 ? <p>No encontramos lugares.</p> : null}
      <ul className={styles.list}>
        {places.map((place) => (
          <li key={place.id}>
            <button type="button" aria-pressed={selected?.id === place.id} onClick={() => setSelected(place)}>
              <strong>{place.name}</strong><span>{place.address}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.pagination}>
        <button type="button" disabled={page === 1 || loading} onClick={() => { setPage(page - 1); setLoading(true); }}>Anterior</button>
        <span>Página {page}</span>
        <button type="button" disabled={!hasMore || loading} onClick={() => { setPage(page + 1); setLoading(true); }}>Siguiente</button>
      </div>
      {selected ? <MediaGalleryManager key={selected.id} target="place" resourceId={selected.id} resourceName={selected.name} /> : null}
    </section>
  );
}
