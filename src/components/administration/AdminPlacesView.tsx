"use client";

import { useEffect, useState } from "react";

import { Pagination } from "@/components/explore";
import { Button, Icon } from "@/components/ui";
import { useDebouncedValue } from "@/hooks";
import { ApiError, listPlaces } from "@/lib/api";
import { googleMapsUrl } from "@/lib/utils";
import type { PaginatedResult, PlaceOption } from "@/types";

import { AdminPlaceImagesDialog } from "./AdminPlaceImagesDialog";
import styles from "./AdminManagement.module.css";

const PAGE_SIZE = 20;

function readableError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.isForbidden) return "No tenés permisos para realizar esta acción.";
    if (error.isNetworkError) return "No pudimos conectarnos con el servidor.";
    return error.message;
  }
  return fallback;
}

export function AdminPlacesView() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PaginatedResult<PlaceOption> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadSequence, setReloadSequence] = useState(0);
  const [managing, setManaging] = useState<PlaceOption | null>(null);
  // Loading is derived: the request is pending until its own response settles.
  const requestKey = `${debouncedSearch}|${page}|${reloadSequence}`;
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const loading = settledKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    listPlaces({ search: debouncedSearch || undefined, page, limit: PAGE_SIZE })
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(readableError(error, "No pudimos cargar los lugares."));
      })
      .finally(() => {
        if (!cancelled) setSettledKey(requestKey);
      });
    return () => { cancelled = true; };
  }, [debouncedSearch, page, reloadSequence, requestKey]);

  const places = result?.data ?? [];
  const firstVisible = result && result.pagination.total > 0
    ? (result.pagination.page - 1) * result.pagination.limit + 1
    : 0;
  const lastVisible = result ? firstVisible + result.data.length - 1 : 0;

  return (
    <section className={styles.screen} aria-busy={loading}>
      <header className={styles.headerRow}>
        <div>
          <p className={styles.eyebrow}><Icon name="map-pin" size={14} />Catálogo</p>
          <h1 className={`sp-h2 ${styles.title}`}>Administración de Lugares</h1>
          <p className={`sp-body ${styles.subtitle}`}>Consultá los lugares registrados y gestioná sus imágenes.</p>
        </div>
      </header>

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <span className="sp-sr-only">Buscar lugares</span><Icon name="search" size={17} />
          <input value={search} placeholder="Buscar por nombre, dirección o zona..." onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </label>
      </div>

      <div className={styles.tableCard}>
        {loadError && !result ? (
          <div className={styles.state} role="alert"><span className={styles.stateIcon}><Icon name="triangle-alert" size={24} /></span><strong>No pudimos cargar los lugares</strong><p>{loadError}</p><Button size="sm" variant="ghostLight" onClick={() => setReloadSequence((current) => current + 1)}>Reintentar</Button></div>
        ) : loading && !result ? (
          <div className={styles.state} role="status"><Icon name="loader-circle" className="sp-spin" size={28} /><p>Cargando lugares...</p></div>
        ) : places.length === 0 ? (
          <div className={styles.state}><span className={styles.stateIcon}><Icon name="search" size={24} /></span><strong>Sin resultados</strong><p>Probá con otro nombre, dirección o zona.</p></div>
        ) : (
          <>
            {loadError ? <div className={styles.inlineError} role="alert">No pudimos actualizar los resultados.</div> : null}
            <div className={`${styles.tableScroll} ${loading ? styles.tableLoading : ""}`}>
              <table className={styles.table}>
                <thead><tr><th>Lugar</th><th>Ubicación</th><th>Dirección</th><th className={styles.actionsHeading}>Acciones</th></tr></thead>
                <tbody>{places.map((place) => (
                  <tr key={place.id}>
                    <td><span className={styles.entityName}>{place.name}</span><span className={styles.secondary}>{place.description || "Sin descripción"}</span></td>
                    <td><span className={styles.entityName}>{place.department.name}</span><span className={styles.secondary}>{place.department.city.name}</span></td>
                    <td><a className={styles.placeLink} href={googleMapsUrl(null, null, place.address)} target="_blank" rel="noreferrer"><Icon name="map-pin" size={13} />{place.address}</a></td>
                    <td className={styles.actionsColumn}><span className={styles.actions}><button className={styles.iconButton} type="button" aria-label={`Gestionar imágenes de ${place.name}`} onClick={() => setManaging(place)}><Icon name="image-plus" size={16} /></button></span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {result && result.pagination.total > 0 ? <div className={styles.paginationArea}><p>Mostrando {firstVisible}–{lastVisible} de {result.pagination.total} lugares</p><Pagination page={result.pagination.page} totalPages={result.pagination.totalPages} disabled={loading} onPageChange={setPage} /></div> : null}

      {managing ? <AdminPlaceImagesDialog place={managing} onClose={() => setManaging(null)} /> : null}
    </section>
  );
}
