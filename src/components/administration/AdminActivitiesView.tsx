"use client";

import { useEffect, useState } from "react";

import { Pagination } from "@/components/explore";
import { Button, ConfirmationDialog, Icon, Select } from "@/components/ui";
import { useDebouncedValue } from "@/hooks";
import {
  ApiError,
  createAdminActivity,
  deleteAdminActivity,
  listAdminActivities,
  listCategories,
  listPlaces,
  updateAdminActivity,
} from "@/lib/api";
import { formatArs, formatDuration, googleMapsUrl } from "@/lib/utils";
import type {
  AdminActivitiesResult,
  AdminActivity,
  AdminActivityInput,
  CategoryOption,
  PlaceOption,
} from "@/types";

import { AdminActivityDialog } from "./AdminActivityDialog";
import styles from "./AdminManagement.module.css";

const PAGE_SIZE = 20;

async function loadAllCategories(): Promise<CategoryOption[]> {
  const items: CategoryOption[] = [];
  let page = 1;
  while (true) {
    const result = await listCategories({ page, limit: 100 });
    items.push(...result.data);
    if (page >= result.pagination.totalPages) return items;
    page += 1;
  }
}

async function loadAllPlaces(): Promise<PlaceOption[]> {
  const items: PlaceOption[] = [];
  let page = 1;
  while (true) {
    const result = await listPlaces({ page, limit: 100 });
    items.push(...result.data);
    if (page >= result.pagination.totalPages) return items;
    page += 1;
  }
}

function readableError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.code === "ACTIVITY_NOT_FOUND") return "La actividad ya no existe.";
    if (error.code === "PLACE_NOT_FOUND") return "Uno de los lugares seleccionados ya no está disponible.";
    if (error.code === "CATEGORY_NOT_FOUND") return "Una de las categorías seleccionadas ya no está disponible.";
    if (error.isForbidden) return "No tenés permisos para realizar esta acción.";
    if (error.isNetworkError) return "No pudimos conectarnos con el servidor.";
    return error.message;
  }
  return fallback;
}

export function AdminActivitiesView() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const debouncedType = useDebouncedValue(typeFilter.trim(), 400);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminActivitiesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadSequence, setReloadSequence] = useState(0);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminActivity | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<AdminActivity | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    Promise.all([loadAllCategories(), loadAllPlaces()])
      .then(([loadedCategories, loadedPlaces]) => {
        if (cancelled) return;
        setCategories(loadedCategories);
        setPlaces(loadedPlaces);
        setCatalogError(null);
      })
      .catch((error: unknown) => {
        if (!cancelled) setCatalogError(readableError(error, "No pudimos cargar categorías y lugares."));
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => { cancelled = true; };
  }, [reloadSequence]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAdminActivities({
      search: debouncedSearch || undefined,
      type: debouncedType || undefined,
      categoryId: categoryFilter ? Number(categoryFilter) : undefined,
      page,
      limit: PAGE_SIZE,
      sortBy: "createdAt",
      direction: "desc",
    })
      .then((data) => {
        if (!cancelled) {
          setResult(data);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(readableError(error, "No pudimos cargar las actividades."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedSearch, debouncedType, categoryFilter, page, reloadSequence]);

  async function saveActivity(input: AdminActivityInput) {
    setSaving(true);
    setActionError(null);
    try {
      if (editing) await updateAdminActivity(editing.id, input);
      else await createAdminActivity(input);
      setEditing(undefined);
      setReloadSequence((current) => current + 1);
    } catch (error) {
      setActionError(readableError(error, "No pudimos guardar la actividad."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    setActionError(null);
    try {
      await deleteAdminActivity(deleting.id);
      setDeleting(null);
      if (result?.data.length === 1 && page > 1) setPage((current) => current - 1);
      else setReloadSequence((current) => current + 1);
    } catch (error) {
      setActionError(readableError(error, "No pudimos eliminar la actividad."));
    } finally {
      setSaving(false);
    }
  }

  const activities = result?.data ?? [];
  const firstVisible = result && result.pagination.total > 0
    ? (result.pagination.page - 1) * result.pagination.limit + 1
    : 0;
  const lastVisible = result ? firstVisible + result.data.length - 1 : 0;
  const categoryOptions = [
    { value: "", label: "Categoría: Todas" },
    ...categories.map((category) => ({ value: String(category.id), label: category.name })),
  ];

  return (
    <section className={styles.screen} aria-busy={loading}>
      <header className={styles.headerRow}>
        <div>
          <p className={styles.eyebrow}><Icon name="sparkles" size={14} />Catálogo</p>
          <h1 className={`sp-h2 ${styles.title}`}>Administración de Actividades</h1>
          <p className={`sp-body ${styles.subtitle}`}>Gestioná experiencias, categorías y lugares asociados.</p>
        </div>
        <Button disabled={catalogLoading || Boolean(catalogError)} onClick={() => { setActionError(null); setEditing(null); }}>
          <Icon name="plus" size={17} /> Nueva actividad
        </Button>
      </header>

      {catalogError ? <div className={styles.inlineError} role="alert">{catalogError} <Button size="sm" variant="ghostEmber" onClick={() => setReloadSequence((current) => current + 1)}>Reintentar catálogos</Button></div> : null}

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <span className="sp-sr-only">Buscar actividades</span><Icon name="search" size={17} />
          <input value={search} placeholder="Buscar por nombre o descripción..." onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </label>
        <input className={styles.filterInput} aria-label="Filtrar por tipo" value={typeFilter} placeholder="Tipo de salida" onChange={(event) => { setTypeFilter(event.target.value); setPage(1); }} />
        <div className={styles.selectFilter}>
          <Select aria-label="Filtrar por categoría" value={categoryFilter} options={categoryOptions} onChange={(value) => { setCategoryFilter(value); setPage(1); }} />
        </div>
      </div>

      <div className={styles.tableCard}>
        {loadError && !result ? (
          <div className={styles.state} role="alert"><span className={styles.stateIcon}><Icon name="triangle-alert" size={24} /></span><strong>No pudimos cargar las actividades</strong><p>{loadError}</p><Button size="sm" variant="ghostLight" onClick={() => setReloadSequence((current) => current + 1)}>Reintentar</Button></div>
        ) : loading && !result ? (
          <div className={styles.state} role="status"><Icon name="loader-circle" className="sp-spin" size={28} /><p>Cargando actividades...</p></div>
        ) : activities.length === 0 ? (
          <div className={styles.state}><span className={styles.stateIcon}><Icon name="search" size={24} /></span><strong>Sin resultados</strong><p>Probá ajustar los filtros o creá una actividad.</p></div>
        ) : (
          <>
            {loadError ? <div className={styles.inlineError} role="alert">No pudimos actualizar los resultados.</div> : null}
            <div className={`${styles.tableScroll} ${loading ? styles.tableLoading : ""}`}>
              <table className={styles.table}>
                <thead><tr><th>Actividad</th><th>Categorías</th><th>Lugares</th><th>Costo</th><th>Duración</th><th>Acciones</th></tr></thead>
                <tbody>{activities.map((activity) => (
                  <tr key={activity.id}>
                    <td><span className={styles.entityName}>{activity.name}</span><span className={styles.secondary}>{activity.type || "Sin tipo"}</span></td>
                    <td><span className={styles.tags}>{activity.categories.length ? activity.categories.map((category) => <span className={styles.tag} key={category.id}>{category.name}</span>) : <span className={styles.secondary}>Sin categorías</span>}</span></td>
                    <td><span className={styles.tags}>{activity.places.length ? activity.places.map((place) => <a className={styles.placeLink} key={place.id} href={googleMapsUrl(null, null, place.address)} target="_blank" rel="noreferrer"><Icon name="map-pin" size={13} />{place.name}</a>) : <span className={styles.secondary}>Sin ubicación</span>}</span></td>
                    <td>{formatArs(activity.estimatedCost)}</td><td>{formatDuration(activity.estimatedDuration)}</td>
                    <td><span className={styles.actions}><button className={styles.iconButton} type="button" aria-label={`Editar ${activity.name}`} disabled={catalogLoading || Boolean(catalogError)} onClick={() => { setActionError(null); setEditing(activity); }}><Icon name="pencil" size={16} /></button><button className={`${styles.iconButton} ${styles.dangerButton}`} type="button" aria-label={`Eliminar ${activity.name}`} onClick={() => { setActionError(null); setDeleting(activity); }}><Icon name="trash-2" size={16} /></button></span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {result && result.pagination.total > 0 ? <div className={styles.paginationArea}><p>Mostrando {firstVisible}–{lastVisible} de {result.pagination.total} actividades</p><Pagination page={result.pagination.page} totalPages={result.pagination.totalPages} disabled={loading} onPageChange={setPage} /></div> : null}

      {editing !== undefined ? <AdminActivityDialog activity={editing} categories={categories} places={places} saving={saving} error={actionError} onClose={() => { if (!saving) setEditing(undefined); }} onSave={saveActivity} /> : null}
      {deleting ? <ConfirmationDialog title="Eliminar actividad" confirmLabel="Eliminar" confirmingLabel="Eliminando..." isConfirming={saving} error={actionError} onCancel={() => { if (!saving) setDeleting(null); }} onConfirm={() => void confirmDelete()}><p>¿Querés eliminar <strong>{deleting.name}</strong>? Sus referencias históricas se conservarán.</p></ConfirmationDialog> : null}
    </section>
  );
}
