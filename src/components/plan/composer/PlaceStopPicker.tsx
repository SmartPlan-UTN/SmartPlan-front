"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { getPlaceDetail, listPlaces } from '@/lib/api';
import { placeDetailRoute } from '@/lib/routes';
import type { PlaceOption } from '@/types';
import { placeComposerStop, type ComposerStop } from './draft';
import styles from './PlaceStopPicker.module.css';

/** Official intrinsic actions come from the API's taxonomy, never guessed here. */
export function PlaceStopPicker({ stops, disabled, onAdd }: {
  stops: ComposerStop[];
  disabled: boolean;
  onAdd: (stop: ComposerStop) => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PlaceOption[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<number | null>(null);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current += 1; controller.current?.abort(); }, []);

  async function find() {
    const query = search.trim();
    if (query.length < 2 || busy || disabled) return;
    const id = ++request.current;
    controller.current?.abort();
    controller.current = new AbortController();
    setBusy(true); setError(null); setUnavailable(null);
    try {
      const response = await listPlaces({ search: query, scope: 'plannable', limit: 6 }, { signal: controller.current.signal });
      if (request.current === id) setResults(response.data);
    } catch {
      if (request.current === id) setError('No pudimos buscar lugares. Probá de nuevo.');
    } finally { if (request.current === id) setBusy(false); }
  }

  async function add(place: PlaceOption) {
    if (busy || disabled) return;
    const id = ++request.current;
    setBusy(true); setError(null); setUnavailable(null);
    try {
      const detail = await getPlaceDetail(place.id);
      if (request.current !== id) return;
      const action = detail.actions?.[0];
      if (!action) { setUnavailable(place.id); return; }
      onAdd(placeComposerStop({
        id: place.id, name: place.name,
        latitude: detail.summary?.latitude ?? null,
        longitude: detail.summary?.longitude ?? null,
      }, action));
    } catch {
      if (request.current === id) setError('No pudimos comprobar ese lugar. Volvé a intentarlo.');
    } finally { if (request.current === id) setBusy(false); }
  }

  return <details className={styles.panel}>
    <summary>Sumar un restaurante, café u otro lugar</summary>
    <p>Elegí el lugar. Revisá después su horario y el presupuesto en tu recorrido.</p>
    <div className={styles.search}>
      <label className={styles.field}>Nombre o zona
        <input value={search} onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void find(); } }}
          disabled={disabled || busy} placeholder="Por ejemplo, un café en Godoy Cruz" />
      </label>
      <Button onClick={() => void find()} disabled={disabled || busy || search.trim().length < 2}>Buscar lugares</Button>
    </div>
    <div aria-live="polite">
      {busy ? <p>Buscando opciones…</p> : null}
      {error ? <p role="status">{error}</p> : null}
      {results?.length === 0 ? <p>No encontramos lugares con ese nombre o zona.</p> : null}
    </div>
    {results?.length ? <ul className={styles.results}>{results.map((place) => {
      const added = stops.some((stop) => stop.placeTarget?.placeId === place.id);
      return <li key={place.id}>
        <div><strong>{place.name}</strong><span>{[place.address, place.department.name].filter(Boolean).join(' · ')}</span>
          {unavailable === place.id ? <p>Este lugar necesita una experiencia específica. <Link href={placeDetailRoute(place.id)}>Ver qué ofrece</Link></p> : null}
        </div>
        <Button size="sm" variant="ghostLight" disabled={disabled || busy || added} onClick={() => void add(place)}>
          {added ? 'En tu recorrido' : 'Sumar lugar'}
        </Button>
      </li>;
    })}</ul> : null}
  </details>;
}
