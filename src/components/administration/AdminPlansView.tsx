"use client";

import { useEffect, useState } from "react";

import { Pagination } from "@/components/explore";
import { Button, ConfirmationDialog, Icon, Select } from "@/components/ui";
import { useDebouncedValue } from "@/hooks";
import { ApiError, deleteAdminPlan, listAdminPlans, updateAdminPlan } from "@/lib/api";
import { formatArs, formatDuration } from "@/lib/utils";
import type { AdminPlan, AdminPlansResult, PlanStatusKey, UpdateAdminPlanInput } from "@/types";

import { AdminPlanDialog, PLAN_STATUS_OPTIONS } from "./AdminPlanDialog";
import { AdminReadDialog } from "./AdminReadDialog";
import styles from "./AdminManagement.module.css";

type StatusFilter = "" | PlanStatusKey;

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "", label: "Estado: Todos" },
  ...PLAN_STATUS_OPTIONS,
];

function readableError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.code === "PLAN_NOT_FOUND") return "El plan ya no existe.";
    if (error.isForbidden) return "No tenés permisos para realizar esta acción.";
    if (error.isNetworkError) return "No pudimos conectarnos con el servidor.";
    return error.message;
  }
  return fallback;
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function AdminPlansView() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminPlansResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadSequence, setReloadSequence] = useState(0);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [deleting, setDeleting] = useState<AdminPlan | null>(null);
  const [viewing, setViewing] = useState<AdminPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAdminPlans({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      page,
      limit: 20,
      sortBy: "createdAt",
      direction: "desc",
    })
      .then((data) => {
        if (!cancelled) { setResult(data); setLoadError(null); }
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(readableError(error, "No pudimos cargar los planes."));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch, statusFilter, page, reloadSequence]);

  async function savePlan(input: UpdateAdminPlanInput) {
    if (!editing) return;
    setSaving(true);
    setActionError(null);
    try {
      await updateAdminPlan(editing.id, input);
      setEditing(null);
      setReloadSequence((current) => current + 1);
    } catch (error) {
      setActionError(readableError(error, "No pudimos guardar el plan."));
    } finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setSaving(true);
    setActionError(null);
    try {
      await deleteAdminPlan(deleting.id);
      setDeleting(null);
      if (result?.data.length === 1 && page > 1) setPage((current) => current - 1);
      else setReloadSequence((current) => current + 1);
    } catch (error) {
      setActionError(readableError(error, "No pudimos eliminar el plan."));
    } finally { setSaving(false); }
  }

  const plans = result?.data ?? [];
  const firstVisible = result && result.pagination.total > 0 ? (result.pagination.page - 1) * result.pagination.limit + 1 : 0;
  const lastVisible = result ? firstVisible + result.data.length - 1 : 0;

  return (
    <section className={styles.screen} aria-busy={loading}>
      <header className={styles.headerRow}>
        <div><p className={styles.eyebrow}><Icon name="map" size={14} />Planificación</p><h1 className={`sp-h2 ${styles.title}`}>Administración de Planes</h1><p className={`sp-body ${styles.subtitle}`}>Supervisá y actualizá los planes registrados.</p></div>
      </header>
      <div className={styles.toolbar}>
        <label className={styles.searchField}><span className="sp-sr-only">Buscar planes</span><Icon name="search" size={17} /><input value={search} placeholder="Buscar por plan o propietario..." onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
        <div className={styles.selectFilter}><Select aria-label="Filtrar por estado" value={statusFilter} options={STATUS_FILTER_OPTIONS} onChange={(value) => { setStatusFilter(value); setPage(1); }} /></div>
      </div>
      <div className={styles.tableCard}>
        {loadError && !result ? <div className={styles.state} role="alert"><span className={styles.stateIcon}><Icon name="triangle-alert" size={24} /></span><strong>No pudimos cargar los planes</strong><p>{loadError}</p><Button size="sm" variant="ghostLight" onClick={() => setReloadSequence((current) => current + 1)}>Reintentar</Button></div>
        : loading && !result ? <div className={styles.state} role="status"><Icon name="loader-circle" className="sp-spin" size={28} /><p>Cargando planes...</p></div>
        : plans.length === 0 ? <div className={styles.state}><span className={styles.stateIcon}><Icon name="search" size={24} /></span><strong>Sin resultados</strong><p>Probá ajustar la búsqueda o el estado.</p></div>
        : <><div className={`${styles.tableScroll} ${loading ? styles.tableLoading : ""}`}><table className={styles.table}><thead><tr><th>Plan</th><th>Propietario</th><th>Estado</th><th>Personas</th><th>Actividades</th><th>Costo / duración</th><th className={styles.actionsHeading}>Acciones</th></tr></thead><tbody>{plans.map((plan) => <tr key={plan.id} className={styles.clickableRow} onClick={() => setViewing(plan)}>
          <td><span className={styles.entityName}>{plan.title}</span><span className={styles.secondary}>#{plan.id}</span></td>
          <td><span className={styles.entityName}>{plan.owner.name} {plan.owner.lastName}</span><span className={styles.secondary}>{plan.owner.email}</span></td>
          <td><span className={styles.status}>{plan.status.name}</span></td><td>{plan.peopleCount}</td><td>{plan.activityCount}</td><td>{formatArs(plan.estimatedTotalCost)}<span className={styles.secondary}>{formatDuration(plan.estimatedTotalDuration)}</span></td>
          <td className={styles.actionsColumn} onClick={(event) => event.stopPropagation()}><span className={styles.actions}><button className={styles.iconButton} type="button" aria-label={`Editar ${plan.title}`} onClick={() => { setActionError(null); setEditing(plan); }}><Icon name="pencil" size={16} /></button><button className={`${styles.iconButton} ${styles.dangerButton}`} type="button" aria-label={`Eliminar ${plan.title}`} onClick={() => { setActionError(null); setDeleting(plan); }}><Icon name="trash-2" size={16} /></button></span></td>
        </tr>)}</tbody></table></div></>}
      </div>
      {result && result.pagination.total > 0 ? <div className={styles.paginationArea}><p>Mostrando {firstVisible}–{lastVisible} de {result.pagination.total} planes</p><Pagination page={result.pagination.page} totalPages={result.pagination.totalPages} disabled={loading} onPageChange={setPage} /></div> : null}
      {viewing ? (
        <AdminReadDialog
          icon="route"
          eyebrow="Plan"
          title={viewing.title}
          subtitle={`#${viewing.id}`}
          onClose={() => setViewing(null)}
          fields={[
            { label: "Descripción", value: viewing.description || "Sin descripción", wide: true },
            { label: "Propietario", value: <>{viewing.owner.name} {viewing.owner.lastName}<span className={styles.secondary}>{viewing.owner.email}</span></> },
            { label: "Estado", value: <span className={styles.status}>{viewing.status.name}</span> },
            { label: "Personas", value: viewing.peopleCount },
            { label: "Actividades", value: viewing.activityCount },
            { label: "Costo estimado", value: formatArs(viewing.estimatedTotalCost) },
            { label: "Duración estimada", value: formatDuration(viewing.estimatedTotalDuration) },
            { label: "Creado", value: dateFormatter.format(new Date(viewing.createdAt)) },
            { label: "Última actualización", value: dateFormatter.format(new Date(viewing.updatedAt)) },
          ]}
          actions={<>
            <Button variant="ghostLight" onClick={() => { setActionError(null); setDeleting(viewing); setViewing(null); }}><Icon name="trash-2" size={15} /> Eliminar</Button>
            <Button onClick={() => { setActionError(null); setEditing(viewing); setViewing(null); }}><Icon name="pencil" size={15} /> Editar</Button>
          </>}
        />
      ) : null}
      {editing ? <AdminPlanDialog plan={editing} saving={saving} error={actionError} onClose={() => { if (!saving) setEditing(null); }} onSave={savePlan} /> : null}
      {deleting ? <ConfirmationDialog title="Eliminar plan" confirmLabel="Eliminar" confirmingLabel="Eliminando..." isConfirming={saving} error={actionError} onCancel={() => { if (!saving) setDeleting(null); }} onConfirm={() => void confirmDelete()}><p>¿Querés eliminar <strong>{deleting.title}</strong>? El registro se conservará para auditoría.</p></ConfirmationDialog> : null}
    </section>
  );
}
