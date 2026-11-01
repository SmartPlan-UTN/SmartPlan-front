"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { OccasionPills } from "@/components/activity";
import { Pagination } from "@/components/explore";
import { Badge, Button, ConfirmationDialog, Icon, Select } from "@/components/ui";
import { useSession } from "@/lib/auth";
import {
  ApiError,
  approveCatalogCandidate,
  bulkApproveCatalogCandidates,
  discardCatalogCandidate,
  getCatalogCandidate,
  getCatalogCandidateCounts,
  listCatalogCandidates,
  listCities,
  listDepartments,
} from "@/lib/api";
import { activityDetailRoute } from "@/lib/routes";
import { formatDuration, formatPrice, formatRelativeTime } from "@/lib/utils";
import type {
  CandidateEntityType,
  CandidateOrigin,
  CandidateStatus,
  CatalogCandidateCounts,
  CatalogCandidateDetail,
  CatalogCandidatePrice,
  CatalogCandidatesResult,
  CatalogCandidateSummary,
  LocationOption,
} from "@/types";
import type { Price } from "@/types/pricing";

import { CatalogCandidateDialog, candidateErrorMessage } from "./CatalogCandidateDialog";
import { ReasonDialog } from "./ReasonDialog";
import shared from "./AdminManagement.module.css";
import reports from "./AdminReports.module.css";
import styles from "./AdminCatalogCandidates.module.css";

const PAGE_SIZE = 20;

const TABS: Array<{ value: CandidateStatus; label: string }> = [
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Aprobados" },
  { value: "discarded", label: "Descartados" },
];

const ORIGIN_LABELS: Record<CandidateOrigin, string> = {
  initial_load: "Carga inicial",
  monthly_refresh: "Proceso mensual",
  manual: "Carga manual",
};

const ORIGIN_OPTIONS: Array<{ value: CandidateOrigin | "all"; label: string }> = [
  { value: "all", label: "Todos los orígenes" },
  { value: "initial_load", label: "Carga inicial" },
  { value: "monthly_refresh", label: "Proceso mensual" },
  { value: "manual", label: "Carga manual" },
];

const TYPE_OPTIONS: Array<{ value: CandidateEntityType | "all"; label: string }> = [
  { value: "all", label: "Actividades y lugares" },
  { value: "activity", label: "Actividades" },
  { value: "place", label: "Lugares nuevos" },
];

const EMPTY_COPY: Record<CandidateStatus, string> = {
  pending: "No hay propuestas esperando revisión con estos filtros.",
  approved: "Todavía no se aprobó ninguna propuesta con estos filtros.",
  discarded: "No hay propuestas descartadas con estos filtros.",
};

const SOURCE_LABELS: Record<string, string> = {
  OFFICIAL: "fuente oficial",
  CURATED: "curado por SmartPlan",
};

type LoadState =
  | { key: string; phase: "loading" }
  | { key: string; phase: "success"; result: CatalogCandidatesResult }
  | { key: string; phase: "error" };

function candidatePriceLabel(price: CatalogCandidatePrice | null): string {
  if (!price || price.kind === "UNKNOWN") return "Precio sin confirmar";
  return formatPrice(
    {
      estimatedCost: price.min,
      price: { ...price, currency: "ARS", confidence: "HIGH", stale: false } as Price,
    },
    { withUnit: true },
  );
}

function priceSourceLabel(price: CatalogCandidatePrice | null): string | null {
  if (!price || price.kind === "UNKNOWN") return null;
  const parts = [price.source ? (SOURCE_LABELS[price.source] ?? price.source) : null];
  if (price.verifiedAt)
    parts.push(
      `verificado el ${new Intl.DateTimeFormat("es-AR", { timeZone: "UTC" }).format(new Date(price.verifiedAt))}`,
    );
  return parts.filter(Boolean).join(" · ") || null;
}

const people = (count: number) => `${count} ${count === 1 ? "persona" : "personas"}`;

function peopleLabel({ minPeople, maxPeople }: CatalogCandidateSummary): string | null {
  if (minPeople && maxPeople)
    return minPeople === maxPeople ? people(minPeople) : `${minPeople} a ${people(maxPeople)}`;
  if (maxPeople) return `Hasta ${people(maxPeople)}`;
  if (minPeople) return `Desde ${people(minPeople)}`;
  return null;
}

/** Back warnings, said plainly next to the candidate (never only on hover). */
function noteLabel(note: string): string {
  if (note === "source_unverified") return "Fuente sin verificar";
  if (note === "unsourced") return "Sin fuente";
  if (note.startsWith("possible_duplicate_of:"))
    return `Posible duplicado de ${note.slice("possible_duplicate_of:".length)}`;
  return note;
}

const FIELD_LABELS: Record<string, string> = {
  name: "nombre",
  description: "descripción",
  durationMinutes: "duración",
  price: "precio",
  occasions: "ocasiones",
  minPeople: "mínimo de personas",
  maxPeople: "máximo de personas",
  minAge: "edad mínima",
  places: "lugar",
  type: "tipo",
  categories: "categorías",
  materials: "materiales",
};

/**
 * "Candidatos del catálogo" (RF44, CU50): activities and places proposed by
 * the initial load and the monthly refresh wait here until a person
 * approves, edits or discards them. Approving runs the catalog import, so
 * nothing enters the catalog without the same checks as a reviewed package.
 */
export function AdminCatalogCandidatesView() {
  const { user } = useSession();
  const allowed = user?.permissions.includes("catalog.review") ?? false;
  const [status, setStatus] = useState<CandidateStatus>("pending");
  const [origin, setOrigin] = useState<CandidateOrigin | "all">("all");
  const [entityType, setEntityType] = useState<CandidateEntityType | "all">("all");
  const [department, setDepartment] = useState("all");
  const [departments, setDepartments] = useState<LocationOption[]>([]);
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<CatalogCandidateCounts | null>(null);
  const [reloadSequence, setReloadSequence] = useState(0);
  const [selected, setSelected] = useState<CatalogCandidateSummary[]>([]);
  const [editing, setEditing] = useState<CatalogCandidateDetail | null>(null);
  const [discarding, setDiscarding] = useState<CatalogCandidateSummary | null>(null);
  const [duplicate, setDuplicate] = useState<{ candidate: CatalogCandidateSummary; slugs: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requestKey = `${status}:${origin}:${entityType}:${department}:${page}:${reloadSequence}`;
  const [loadState, setLoadState] = useState<LoadState>({ key: requestKey, phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    listCities()
      .then(async (cities) => {
        const lists = await Promise.all(cities.data.map((city) => listDepartments(city.id)));
        if (!cancelled)
          setDepartments(
            lists.flatMap((list) => list.data).sort((a, b) => a.name.localeCompare(b.name)),
          );
      })
      .catch(() => {
        // Without departments the filter just offers "all".
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    const key = requestKey;
    setLoadState({ key, phase: "loading" });
    listCatalogCandidates({
      status,
      ...(origin === "all" ? {} : { origin }),
      ...(entityType === "all" ? {} : { entityType }),
      ...(department === "all" ? {} : { idDepartment: Number(department) }),
      sortBy: "placeName",
      direction: "asc",
      page,
      limit: PAGE_SIZE,
    })
      .then((result) => {
        if (!cancelled) setLoadState({ key, phase: "success", result });
      })
      .catch(() => {
        if (!cancelled) setLoadState({ key, phase: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [allowed, status, origin, entityType, department, page, requestKey]);

  // A decision moves a candidate between tabs, so every badge reloads.
  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    getCatalogCandidateCounts()
      .then((data) => {
        if (!cancelled) setCounts(data);
      })
      .catch(() => {
        if (!cancelled) setCounts(null);
      });
    return () => {
      cancelled = true;
    };
  }, [allowed, reloadSequence]);

  const current: LoadState =
    loadState.key === requestKey ? loadState : { key: requestKey, phase: "loading" };
  const loading = current.phase === "loading";
  const result = current.phase === "success" ? current.result : null;
  const items = result?.data ?? [];
  const selectedPlaceId = selected[0]?.place?.id ?? null;

  function reload(decided = 1) {
    // Decided candidates leave the tab: an emptied last page goes back one.
    if (items.length <= decided && page > 1) setPage((value) => value - 1);
    setSelected([]);
    setReloadSequence((value) => value + 1);
  }

  function resetPaging() {
    setPage(1);
    setSelected([]);
  }

  async function approve(candidate: CatalogCandidateSummary, force = false) {
    setSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      await approveCatalogCandidate(candidate.id, force);
      setDuplicate(null);
      setNotice(`Aprobado: ${candidate.name}.`);
      reload();
    } catch (error) {
      if (error instanceof ApiError && error.code === "CANDIDATE_POSSIBLE_DUPLICATE") {
        const slugs = Array.isArray(error.data?.duplicates)
          ? (error.data.duplicates as unknown[]).map(String)
          : [];
        setDuplicate({ candidate, slugs });
      } else if (error instanceof ApiError && error.code === "CANDIDATE_NOT_PENDING") {
        setActionError("Otra persona ya revisó este candidato.");
        reload();
      } else if (error instanceof ApiError && error.status === 400) {
        const raw = Array.isArray(error.data?.errors) ? (error.data.errors as Array<{ messages?: string[] }>) : [];
        const messages = raw.flatMap((entry) => entry.messages ?? []).map(candidateErrorMessage);
        setActionError(
          `No se puede aprobar todavía: ${messages.join(" ") || "revisá los datos."} Editalo y probá de nuevo.`,
        );
        setDuplicate(null);
      } else {
        setActionError("No pudimos aprobar el candidato. Probá de nuevo.");
        setDuplicate(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function approveSelected() {
    setSaving(true);
    setActionError(null);
    setNotice(null);
    try {
      const { results } = await bulkApproveCatalogCandidates(selected.map((item) => item.id));
      const approved = results.filter((entry) => entry.status === "approved").length;
      const duplicates = results.filter((entry) => entry.status === "possible_duplicate").length;
      const invalid = results.filter((entry) => entry.status === "invalid").length;
      const parts = [`${approved} aprobados`];
      if (duplicates) parts.push(`${duplicates} posibles duplicados para revisar uno por uno`);
      if (invalid) parts.push(`${invalid} con datos para corregir`);
      setNotice(`${parts.join(", ")}.`);
      reload(approved);
    } catch {
      setActionError("No pudimos aprobar los seleccionados. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function discard(candidate: CatalogCandidateSummary, reason: string) {
    setSaving(true);
    setActionError(null);
    try {
      await discardCatalogCandidate(candidate.id, reason);
      setDiscarding(null);
      setNotice(`Descartado: ${candidate.name}.`);
      reload();
    } catch (error) {
      setActionError(
        error instanceof ApiError && error.code === "CANDIDATE_NOT_PENDING"
          ? "Otra persona ya revisó este candidato."
          : "No pudimos descartar el candidato.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function openEditor(candidate: CatalogCandidateSummary) {
    setActionError(null);
    try {
      setEditing(await getCatalogCandidate(candidate.id));
    } catch {
      setActionError("No pudimos abrir el candidato.");
    }
  }

  function toggleSelected(candidate: CatalogCandidateSummary) {
    setSelected((list) =>
      list.some((item) => item.id === candidate.id)
        ? list.filter((item) => item.id !== candidate.id)
        : [...list, candidate],
    );
  }

  if (!allowed) {
    return (
      <section className={shared.screen}>
        <div className={shared.state} role="alert">
          <span className={shared.stateIcon}>
            <Icon name="lock" size={24} />
          </span>
          <strong>Sin acceso a la cola</strong>
          <p>Revisar candidatos del catálogo requiere el permiso «catalog.review».</p>
        </div>
      </section>
    );
  }

  const firstVisible =
    result && result.pagination.total > 0
      ? (result.pagination.page - 1) * result.pagination.limit + 1
      : 0;
  const lastVisible = result ? firstVisible + result.data.length - 1 : 0;

  return (
    <section className={shared.screen} aria-busy={loading}>
      <header className={shared.headerRow}>
        <div>
          <p className={shared.eyebrow}>
            <Icon name="list-checks" size={14} />
            Catálogo
          </p>
          <h1 className={`sp-h2 ${shared.title}`}>Candidatos del catálogo</h1>
          <p className={`sp-body ${shared.subtitle}`}>
            Actividades y lugares propuestos por la carga inicial y el proceso mensual. Nada entra
            al catálogo sin pasar por acá.
          </p>
        </div>
      </header>

      <div className={reports.tabs} role="tablist" aria-label="Estado de los candidatos">
        {TABS.map((option) => {
          const active = option.value === status;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${reports.tab} ${active ? reports.tabActive : ""}`}
              onClick={() => {
                setStatus(option.value);
                resetPaging();
                setActionError(null);
                setNotice(null);
              }}
            >
              {option.label}
              {counts ? <span className={reports.tabCount}>{counts.byStatus[option.value]}</span> : null}
            </button>
          );
        })}
      </div>

      <div className={styles.filters}>
        <Select
          aria-label="Origen"
          value={origin}
          options={ORIGIN_OPTIONS}
          onChange={(value) => {
            setOrigin(value);
            resetPaging();
          }}
        />
        <Select
          aria-label="Departamento"
          value={department}
          options={[
            { value: "all", label: "Todos los departamentos" },
            ...departments.map((option) => ({ value: String(option.id), label: option.name })),
          ]}
          onChange={(value) => {
            setDepartment(value);
            resetPaging();
          }}
        />
        <Select
          aria-label="Tipo"
          value={entityType}
          options={TYPE_OPTIONS}
          onChange={(value) => {
            setEntityType(value);
            resetPaging();
          }}
        />
      </div>

      {status === "pending" && selected.length > 0 ? (
        <div className={styles.bulkBar} role="region" aria-label="Aprobación en lote">
          <span>
            <strong>{selected.length}</strong> seleccionados de {selected[0]?.place?.name ?? "este lugar"}
          </span>
          <Button size="sm" variant="ghostLight" disabled={saving} onClick={() => setSelected([])}>
            Limpiar
          </Button>
          <Button size="sm" variant="primary" disabled={saving} onClick={() => void approveSelected()}>
            {saving ? "Aprobando..." : "Aprobar seleccionados"}
          </Button>
        </div>
      ) : null}

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      {actionError && !discarding && !duplicate ? (
        <p className={shared.formError} role="alert">
          {actionError}
        </p>
      ) : null}

      {current.phase === "error" ? (
        <div className={shared.state} role="alert">
          <span className={shared.stateIcon}>
            <Icon name="triangle-alert" size={24} />
          </span>
          <strong>No pudimos cargar los candidatos</strong>
          <p>Revisá la conexión y probá de nuevo.</p>
          <Button size="sm" variant="ghostLight" onClick={() => setReloadSequence((value) => value + 1)}>
            Reintentar
          </Button>
        </div>
      ) : loading ? (
        <div className={shared.state} role="status">
          <Icon name="loader-circle" className="sp-spin" size={28} />
          <p>Cargando candidatos...</p>
        </div>
      ) : items.length === 0 ? (
        <div className={shared.state}>
          <span className={reports.emptyIcon}>
            <Icon name="circle-check" size={26} />
          </span>
          <strong>{status === "pending" ? "Todo revisado" : "Sin resultados"}</strong>
          <p>{EMPTY_COPY[status]}</p>
        </div>
      ) : (
        <div className={reports.feed}>
          {items.map((candidate) => {
            const selectable =
              status === "pending" && candidate.entityType === "activity" && candidate.place !== null;
            const otherPlace =
              selectedPlaceId !== null && candidate.place?.id !== selectedPlaceId;
            return (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                saving={saving}
                selectable={selectable}
                selectDisabled={otherPlace}
                selected={selected.some((item) => item.id === candidate.id)}
                onToggleSelected={() => toggleSelected(candidate)}
                onApprove={() => void approve(candidate)}
                onEdit={() => void openEditor(candidate)}
                onDiscard={() => {
                  setActionError(null);
                  setDiscarding(candidate);
                }}
              />
            );
          })}
        </div>
      )}

      {result && result.pagination.total > 0 ? (
        <div className={shared.paginationArea}>
          <p>
            Mostrando {firstVisible}–{lastVisible} de {result.pagination.total} candidatos
          </p>
          <Pagination
            page={result.pagination.page}
            totalPages={result.pagination.totalPages}
            disabled={loading}
            onPageChange={(value) => {
              setPage(value);
              setSelected([]);
            }}
          />
        </div>
      ) : null}

      {editing ? (
        <CatalogCandidateDialog
          candidate={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setNotice(`Guardado: ${saved.name}. Sigue pendiente hasta aprobarlo.`);
            setReloadSequence((value) => value + 1);
          }}
        />
      ) : null}

      {discarding ? (
        <ReasonDialog
          title="Descartar candidato"
          subtitle={`${discarding.name}${discarding.place ? ` · ${discarding.place.name}` : ""}`}
          placeholder="Por qué no entra al catálogo (por ejemplo: el lugar no ofrece esto)."
          note="La propuesta no vuelve a aparecer en el proceso mensual. El motivo queda registrado."
          reasonLabel="Motivo del descarte"
          confirmLabel="Descartar"
          confirmingLabel="Descartando..."
          saving={saving}
          error={actionError}
          onClose={() => {
            if (saving) return;
            setDiscarding(null);
            setActionError(null);
          }}
          onConfirm={(reason) => discard(discarding, reason)}
        />
      ) : null}

      {duplicate ? (
        <ConfirmationDialog
          title="Posible duplicado"
          confirmLabel="Aprobar igual"
          confirmVariant="primary"
          confirmingLabel="Aprobando..."
          isConfirming={saving}
          error={actionError}
          onCancel={() => {
            if (!saving) setDuplicate(null);
          }}
          onConfirm={() => void approve(duplicate.candidate, true)}
        >
          {`El catálogo ya tiene algo muy parecido${duplicate.slugs.length ? ` (${duplicate.slugs.join(", ")})` : ""}. Aprobalo igual solo si es una actividad distinta.`}
        </ConfirmationDialog>
      ) : null}
    </section>
  );
}

function CandidateCard({
  candidate,
  saving,
  selectable,
  selectDisabled,
  selected,
  onToggleSelected,
  onApprove,
  onEdit,
  onDiscard,
}: {
  candidate: CatalogCandidateSummary;
  saving: boolean;
  selectable: boolean;
  selectDisabled: boolean;
  selected: boolean;
  onToggleSelected: () => void;
  onApprove: () => void;
  onEdit: () => void;
  onDiscard: () => void;
}) {
  const [detail, setDetail] = useState<CatalogCandidateDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const pending = candidate.status === "pending";
  const people = peopleLabel(candidate);
  const sourceLabel = priceSourceLabel(candidate.price);

  async function toggleDetail() {
    if (detailOpen) {
      setDetailOpen(false);
      return;
    }
    setDetailOpen(true);
    if (detail) return;
    setDetailError(false);
    try {
      setDetail(await getCatalogCandidate(candidate.id));
    } catch {
      setDetailError(true);
    }
  }

  return (
    <article className={`${reports.card} ${styles.card}`} aria-label={`Candidato: ${candidate.name}`}>
      {selectable ? (
        <label className={styles.select} title={selectDisabled ? "Solo se aprueban juntos candidatos del mismo lugar" : undefined}>
          <input
            type="checkbox"
            checked={selected}
            disabled={selectDisabled || saving}
            onChange={onToggleSelected}
            aria-label={`Seleccionar ${candidate.name}`}
          />
        </label>
      ) : null}
      <div className={reports.body}>
        <div className={reports.identity}>
          <span className={reports.timestamp}>
            {candidate.entityType === "activity" ? "Actividad" : "Lugar nuevo"}
          </span>
          <span className={reports.dot} aria-hidden="true" />
          <span className={reports.timestamp}>{ORIGIN_LABELS[candidate.origin]}</span>
          <span className={reports.dot} aria-hidden="true" />
          <time className={reports.timestamp} dateTime={candidate.createdAt}>
            Propuesto {formatRelativeTime(candidate.createdAt).toLowerCase()}
          </time>
        </div>
        <h2 className={styles.name}>{candidate.name}</h2>
        {candidate.place ? (
          <p className={styles.place}>
            <Icon name="map-pin" size={13} />
            {candidate.place.name}
            {candidate.place.departmentName ? ` · ${candidate.place.departmentName}` : ""}
          </p>
        ) : null}
        {candidate.description ? <p className={reports.comment}>{candidate.description}</p> : null}

        {candidate.entityType === "activity" ? (
          <dl className={styles.facts}>
            <div>
              <dt>Precio</dt>
              <dd>
                {candidatePriceLabel(candidate.price)}
                {sourceLabel ? <span className={styles.factNote}> · {sourceLabel}</span> : null}
              </dd>
            </div>
            {candidate.durationMinutes ? (
              <div>
                <dt>Duración</dt>
                <dd>{formatDuration(candidate.durationMinutes)}</dd>
              </div>
            ) : null}
            {people ? (
              <div>
                <dt>Personas</dt>
                <dd>{people}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {candidate.occasions.length > 0 ? (
          <OccasionPills occasions={candidate.occasions} />
        ) : candidate.entityType === "activity" ? (
          <p className={styles.factNote}>Sin ocasiones: no se va a recomendar sola.</p>
        ) : null}

        {candidate.notes.length > 0 ? (
          <div className={reports.badges}>
            {candidate.notes.map((note) => (
              <Badge key={note} variant="warn">
                {noteLabel(note)}
              </Badge>
            ))}
          </div>
        ) : null}

        {candidate.sourceRefs.length > 0 ? (
          <ul className={styles.sources} aria-label="Fuentes">
            {candidate.sourceRefs.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer noopener">
                  {source.url.replace(/^https?:\/\//, "").slice(0, 60)}
                  <Icon name="external-link" size={12} />
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        {candidate.status === "discarded" && candidate.discardReason ? (
          <p className={styles.reason}>Motivo: {candidate.discardReason}</p>
        ) : null}
        {candidate.status === "approved" && candidate.appliedEntityId && candidate.entityType === "activity" ? (
          <Link className={styles.appliedLink} href={activityDetailRoute(candidate.appliedEntityId)}>
            Ver la actividad publicada
          </Link>
        ) : null}

        <button
          type="button"
          className={reports.detailToggle}
          aria-expanded={detailOpen}
          onClick={() => void toggleDetail()}
        >
          {detailOpen ? "Ocultar detalle" : "Ver detalle y lo que ya ofrece el lugar"}
        </button>
        {detailOpen ? (
          detailError ? (
            <p className={reports.detailError} role="alert">
              No pudimos cargar el detalle.
            </p>
          ) : detail ? (
            <div className={styles.detail}>
              <p>
                <strong>Cambios sobre la propuesta: </strong>
                {detail.changedFields.length
                  ? detail.changedFields.map((field) => FIELD_LABELS[field] ?? field).join(", ")
                  : "ninguno, está como se propuso."}
              </p>
              {detail.model ? <p>Propuesto por: {detail.model}</p> : null}
              {detail.place ? (
                detail.existingActivities.length ? (
                  <>
                    <p>
                      <strong>Lo que ya ofrece {detail.place.name}:</strong>
                    </p>
                    <ul className={styles.existing}>
                      {detail.existingActivities.map((activity) => (
                        <li key={activity.id}>
                          <Link href={activityDetailRoute(activity.id)}>{activity.name}</Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>{detail.place.name} todavía no tiene actividades publicadas: no se muestra en Explorar.</p>
                )
              ) : null}
            </div>
          ) : (
            <p className={reports.timestamp} role="status">
              Cargando detalle...
            </p>
          )
        ) : null}
      </div>

      {pending ? (
        <div className={styles.actions}>
          <Button size="sm" variant="primary" disabled={saving} onClick={onApprove} aria-label={`Aprobar ${candidate.name}`}>
            <Icon name="check" size={15} />
            Aprobar
          </Button>
          <Button size="sm" variant="ghostLight" disabled={saving} onClick={onEdit} aria-label={`Editar ${candidate.name}`}>
            <Icon name="pencil" size={15} />
            Editar
          </Button>
          <Button size="sm" variant="ghostLight" disabled={saving} onClick={onDiscard} aria-label={`Descartar ${candidate.name}`}>
            <Icon name="x" size={15} />
            Descartar
          </Button>
        </div>
      ) : null}
    </article>
  );
}
