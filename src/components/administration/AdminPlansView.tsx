"use client";

import { useEffect, useState } from "react";

import { Pagination } from "@/components/explore";
import { Button, ConfirmationDialog, Icon, Select } from "@/components/ui";
import { useDebouncedValue } from "@/hooks";
import { ApiError, deleteAdminPlan, listAdminPlans, updateAdminPlan } from "@/lib/api";
import { formatArs, formatDuration } from "@/lib/utils";
import type { AdminPlan, AdminPlansResult, PlanKind, PlanStatusKey, PlanVisibility, UpdateAdminPlanInput } from "@/types";

import { AdminPlanDialog } from "./AdminPlanDialog";
import styles from "./AdminManagement.module.css";
import {
  PLAN_KIND_COPY,
  PLAN_KIND_OPTIONS,
  PLAN_STATUS_COPY,
  PLAN_STATUS_OPTIONS,
  PLAN_VISIBILITY_LABEL,
  PLAN_VISIBILITY_OPTIONS,
  explorePresence,
} from "./planAdminPresentation";

type StatusFilter = "" | PlanStatusKey;
type KindFilter = "" | PlanKind;
type VisibilityFilter = "" | PlanVisibility;

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "", label: "Estado: Todos" },
  ...PLAN_STATUS_OPTIONS,
];

const KIND_FILTER_OPTIONS: Array<{ value: KindFilter; label: string }> = [
  { value: "", label: "Origen: Todos" },
  ...PLAN_KIND_OPTIONS,
];

const VISIBILITY_FILTER_OPTIONS: Array<{ value: VisibilityFilter; label: string }> = [
  { value: "", label: "Visibilidad: Todas" },
  ...PLAN_VISIBILITY_OPTIONS,
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

export function AdminPlansView() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminPlansResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadSequence, setReloadSequence] = useState(0);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [deleting, setDeleting] = useState<AdminPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAdminPlans({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      kind: kindFilter || undefined,
      visibility: visibilityFilter || undefined,
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
  }, [debouncedSearch, statusFilter, kindFilter, visibilityFilter, page, reloadSequence]);

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
        <div className={styles.selectFilter}><Select aria-label="Filtrar por origen" value={kindFilter} options={KIND_FILTER_OPTIONS} onChange={(value) => { setKindFilter(value); setPage(1); }} /></div>
        <div className={styles.selectFilter}><Select aria-label="Filtrar por visibilidad" value={visibilityFilter} options={VISIBILITY_FILTER_OPTIONS} onChange={(value) => { setVisibilityFilter(value); setPage(1); }} /></div>
      </div>
      <details className={styles.legend}>
        <summary><Icon name="info" size={16} />¿Qué significa cada estado y por qué un plan no aparece en Explorar?</summary>
        <div className={styles.legendBody}>
          <p>El <strong>estado</strong> indica en qué momento está el plan; la <strong>visibilidad</strong> es una decisión de su autor. Son independientes: completar un plan no lo publica.</p>
          <dl className={styles.legendList}>
            {PLAN_STATUS_OPTIONS.map((option) => <div key={option.value}><dt>{option.label}</dt><dd>{PLAN_STATUS_COPY[option.value].description}</dd></div>)}
          </dl>
          <p>En <strong>Explorar &gt; Planes</strong> solo aparecen los planes creados por una persona, públicos y no cancelados. Los resultados generados y las salidas son personales y nunca se publican automáticamente.</p>
        </div>
      </details>
      <div className={styles.tableCard}>
        {loadError && !result ? <div className={styles.state} role="alert"><span className={styles.stateIcon}><Icon name="triangle-alert" size={24} /></span><strong>No pudimos cargar los planes</strong><p>{loadError}</p><Button size="sm" variant="ghostLight" onClick={() => setReloadSequence((current) => current + 1)}>Reintentar</Button></div>
        : loading && !result ? <div className={styles.state} role="status"><Icon name="loader-circle" className="sp-spin" size={28} /><p>Cargando planes...</p></div>
        : plans.length === 0 ? <div className={styles.state}><span className={styles.stateIcon}><Icon name="search" size={24} /></span><strong>Sin resultados</strong><p>Probá ajustar la búsqueda o los filtros.</p></div>
        : <><div className={`${styles.tableScroll} ${loading ? styles.tableLoading : ""}`}><table className={styles.table}><thead><tr><th>Plan</th><th>Propietario</th><th>Estado</th><th>Origen y visibilidad</th><th>Personas</th><th>Actividades</th><th>Costo / duración</th><th>Acciones</th></tr></thead><tbody>{plans.map((plan) => <tr key={plan.id}>
          <td><span className={styles.entityName}>{plan.title}</span><span className={styles.secondary}>#{plan.id}</span></td>
          <td><span className={styles.entityName}>{plan.owner.name} {plan.owner.lastName}</span><span className={styles.secondary}>{plan.owner.email}</span></td>
          <td><span className={styles.status} title={PLAN_STATUS_COPY[plan.status.key].description}>{PLAN_STATUS_COPY[plan.status.key].label}</span></td>
          <td><PlanVisibilityCell plan={plan} /></td><td>{plan.peopleCount}</td><td>{plan.activityCount}</td><td>{formatArs(plan.estimatedTotalCost)}<span className={styles.secondary}>{formatDuration(plan.estimatedTotalDuration)}</span></td>
          <td><span className={styles.actions}><button className={styles.iconButton} type="button" aria-label={`Editar ${plan.title}`} onClick={() => { setActionError(null); setEditing(plan); }}><Icon name="pencil" size={16} /></button><button className={`${styles.iconButton} ${styles.dangerButton}`} type="button" aria-label={`Eliminar ${plan.title}`} onClick={() => { setActionError(null); setDeleting(plan); }}><Icon name="trash-2" size={16} /></button></span></td>
        </tr>)}</tbody></table></div></>}
      </div>
      {result && result.pagination.total > 0 ? <div className={styles.paginationArea}><p>Mostrando {firstVisible}–{lastVisible} de {result.pagination.total} planes</p><Pagination page={result.pagination.page} totalPages={result.pagination.totalPages} disabled={loading} onPageChange={setPage} /></div> : null}
      {editing ? <AdminPlanDialog plan={editing} saving={saving} error={actionError} onClose={() => { if (!saving) setEditing(null); }} onSave={savePlan} /> : null}
      {deleting ? <ConfirmationDialog title="Eliminar plan" confirmLabel="Eliminar" confirmingLabel="Eliminando..." isConfirming={saving} error={actionError} onCancel={() => { if (!saving) setDeleting(null); }} onConfirm={() => void confirmDelete()}><p>¿Querés eliminar <strong>{deleting.title}</strong>? El registro se conservará para auditoría.</p></ConfirmationDialog> : null}
    </section>
  );
}

function PlanVisibilityCell({ plan }: { plan: AdminPlan }) {
  const presence = explorePresence(plan);
  return (
    <>
      <span className={styles.entityName} title={PLAN_KIND_COPY[plan.kind].description}>{PLAN_KIND_COPY[plan.kind].label}</span>
      <span className={styles.secondary}>
        {PLAN_VISIBILITY_LABEL[plan.visibility]} · <span className={presence.visible ? styles.exploreVisible : undefined}>{presence.visible ? presence.reason : `No se ve en Explorar. ${presence.reason}`}</span>
      </span>
    </>
  );
}
