"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Pagination } from "@/components/explore";
import { AuthenticatedImage, MediaGallery, MediaLightbox } from "@/components/media";
import {
  Badge,
  Button,
  ConfirmationDialog,
  Icon,
  Select,
  Stars,
  UserAvatar,
} from "@/components/ui";
import {
  ApiError,
  getContentReport,
  getContentReportCounts,
  listContentReports,
  resolveContentReport,
} from "@/lib/api";
import { moderationErrorMessage } from "@/lib/contentReports";
import { activityDetailRoute, planDetailRoute } from "@/lib/routes";
import { formatRelativeTime } from "@/lib/utils";
import {
  REPORT_REASON_LABELS,
  type ContentReportCounts,
  type ContentReportDetail,
  type ContentReportItem,
  type ContentReportsQuery,
  type ContentReportsResult,
  type ContentReportSummary,
  type ReportableContentType,
} from "@/types";

import { ReasonDialog } from "./ReasonDialog";
import styles from "./AdminReports.module.css";
import shared from "./AdminManagement.module.css";

const PAGE_SIZE = 20;

type Tab = ReportableContentType | "all";

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "rating", label: "Valoraciones" },
  { value: "experience_comment", label: "Comentarios" },
  { value: "experience_photo", label: "Fotos" },
];

type Sort = "oldest" | "most-reported";

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: "oldest", label: "Más antiguas primero" },
  { value: "most-reported", label: "Más denunciadas primero" },
];

const SORT_QUERY: Record<Sort, Pick<ContentReportsQuery, "sortBy" | "direction">> = {
  oldest: { sortBy: "firstReportedAt", direction: "asc" },
  "most-reported": { sortBy: "reportCount", direction: "desc" },
};

const TYPE_COPY: Record<
  ReportableContentType,
  { label: string; removeNote: string; removedLabel: string }
> = {
  rating: {
    label: "Valoración",
    removeNote:
      "La valoración deja de mostrarse y de contar en el promedio de la actividad. Su autor recibe una notificación con este motivo.",
    removedLabel: "la valoración",
  },
  experience_comment: {
    label: "Comentario de experiencia",
    removeNote:
      "El comentario deja de mostrarse en la comunidad; el resto de la experiencia sigue visible. Su autor recibe una notificación con este motivo.",
    removedLabel: "el comentario",
  },
  experience_photo: {
    label: "Foto de experiencia",
    removeNote:
      "La foto deja de mostrarse en la comunidad. Su autor recibe una notificación con este motivo.",
    removedLabel: "la foto",
  },
};

const EMPTY_COPY: Record<Tab, string> = {
  all: "No hay contenido denunciado esperando una decisión.",
  rating: "No hay valoraciones denunciadas.",
  experience_comment: "No hay comentarios denunciados.",
  experience_photo: "No hay fotos denunciadas.",
};

type LoadState =
  | { key: string; phase: "loading" }
  | { key: string; phase: "success"; result: ContentReportsResult }
  | { key: string; phase: "error"; message: string };

/**
 * PAN 20 — reported content (#156). Content is published at once and a
 * user's report hides it; here an administrator reads what was reported and
 * why, and keeps it or removes it. Content kept before and reported again
 * stays visible meanwhile, and carries a "Revisado antes" mark.
 */
export function AdminReportsView() {
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<Sort>("oldest");
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<ContentReportCounts | null>(null);
  const [reloadSequence, setReloadSequence] = useState(0);
  const [keeping, setKeeping] = useState<ContentReportSummary | null>(null);
  const [removing, setRemoving] = useState<ContentReportSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const requestKey = `${tab}:${sort}:${page}:${reloadSequence}`;
  const [loadState, setLoadState] = useState<LoadState>({ key: requestKey, phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    const key = requestKey;
    setLoadState({ key, phase: "loading" });
    listContentReports({
      ...(tab === "all" ? {} : { type: tab }),
      ...SORT_QUERY[sort],
      page,
      limit: PAGE_SIZE,
    })
      .then((result) => {
        if (!cancelled) setLoadState({ key, phase: "success", result });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadState({
            key,
            phase: "error",
            message: moderationErrorMessage(error, "No pudimos cargar las denuncias."),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tab, sort, page, requestKey]);

  // A decision empties a tab and "Todas" alike, so every badge reloads.
  useEffect(() => {
    let cancelled = false;
    getContentReportCounts()
      .then((data) => {
        if (!cancelled) setCounts(data);
      })
      .catch(() => {
        // A failed counter is a missing badge, not a broken screen.
        if (!cancelled) setCounts(null);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadSequence]);

  const currentLoadState: LoadState =
    loadState.key === requestKey ? loadState : { key: requestKey, phase: "loading" };
  const loading = currentLoadState.phase === "loading";
  const loadError = currentLoadState.phase === "error" ? currentLoadState.message : null;
  const result = currentLoadState.phase === "success" ? currentLoadState.result : null;
  const items = result?.data ?? [];

  function reloadAfterDecision() {
    // The decided content leaves the queue: an emptied last page would
    // otherwise show nothing instead of the previous page.
    if (items.length === 1 && page > 1) setPage((current) => current - 1);
    setReloadSequence((current) => current + 1);
  }

  async function decide(
    item: ContentReportSummary,
    input: Parameters<typeof resolveContentReport>[2],
    fallback: string,
  ) {
    setSaving(true);
    setActionError(null);
    try {
      await resolveContentReport(item.contentType, item.contentId, input);
      setKeeping(null);
      setRemoving(null);
      reloadAfterDecision();
    } catch (error) {
      setActionError(moderationErrorMessage(error, fallback));
      // Another administrator already decided: the queue no longer has it.
      if (error instanceof ApiError && error.status === 404) reloadAfterDecision();
    } finally {
      setSaving(false);
    }
  }

  function closeDialogs() {
    if (saving) return;
    setKeeping(null);
    setRemoving(null);
    setActionError(null);
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
            <Icon name="flag" size={14} />
            Moderación
          </p>
          <h1 className={`sp-h2 ${shared.title}`}>Denuncias</h1>
          <p className={`sp-body ${shared.subtitle}`}>
            Revisá el contenido que denunciaron los usuarios y decidí si se queda o se elimina.
          </p>
        </div>
        <div>
          <Select<Sort>
            aria-label="Ordenar denuncias"
            value={sort}
            options={SORTS}
            onChange={(value) => {
              setSort(value);
              setPage(1);
            }}
          />
        </div>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Tipo de contenido">
        {TABS.map((option) => {
          const active = option.value === tab;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${styles.tab} ${active ? styles.tabActive : ""}`}
              onClick={() => {
                setTab(option.value);
                setPage(1);
                setActionError(null);
              }}
            >
              {option.label}
              {counts ? <span className={styles.tabCount}>{counts[option.value]}</span> : null}
            </button>
          );
        })}
      </div>

      {actionError && !keeping && !removing ? (
        <p className={shared.formError} role="alert">
          {actionError}
        </p>
      ) : null}

      {loadError ? (
        <div className={shared.state} role="alert">
          <span className={shared.stateIcon}>
            <Icon name="triangle-alert" size={24} />
          </span>
          <strong>No pudimos cargar las denuncias</strong>
          <p>{loadError}</p>
          <Button
            size="sm"
            variant="ghostLight"
            onClick={() => setReloadSequence((current) => current + 1)}
          >
            Reintentar
          </Button>
        </div>
      ) : loading ? (
        <div className={shared.state} role="status">
          <Icon name="loader-circle" className="sp-spin" size={28} />
          <p>Cargando denuncias...</p>
        </div>
      ) : items.length === 0 ? (
        <div className={shared.state}>
          <span className={styles.emptyIcon}>
            <Icon name="circle-check" size={26} />
          </span>
          <strong>Todo al día</strong>
          <p>{EMPTY_COPY[tab]}</p>
        </div>
      ) : (
        <div className={styles.feed}>
          {items.map((item) => (
            <ReportCard
              key={`${item.contentType}:${item.contentId}`}
              item={item}
              saving={saving}
              onKeep={() => {
                setActionError(null);
                setKeeping(item);
              }}
              onRemove={() => {
                setActionError(null);
                setRemoving(item);
              }}
            />
          ))}
        </div>
      )}

      {result && result.pagination.total > 0 ? (
        <div className={shared.paginationArea}>
          <p>
            Mostrando {firstVisible}–{lastVisible} de {result.pagination.total} contenidos
            denunciados
          </p>
          <Pagination
            page={result.pagination.page}
            totalPages={result.pagination.totalPages}
            disabled={loading}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      {keeping ? (
        <ConfirmationDialog
          title={keeping.content ? "Dejar publicado" : "Cerrar denuncias"}
          confirmLabel={keeping.content ? "Dejar" : "Cerrar"}
          confirmingLabel="Guardando..."
          isConfirming={saving}
          error={actionError}
          onCancel={closeDialogs}
          onConfirm={() =>
            void decide(keeping, { decision: "keep" }, "No pudimos guardar la decisión.")
          }
        >
          {keeping.content
            ? "Vuelve a mostrarse para todos y queda marcado como revisado: una nueva denuncia ya no lo va a ocultar. Su autor no recibe ningún aviso."
            : "El contenido ya no existe. Se cierran sus denuncias sin más."}
        </ConfirmationDialog>
      ) : null}

      {removing?.content ? (
        <ReasonDialog
          title="Eliminar contenido"
          subtitle={`${TYPE_COPY[removing.contentType].label} de ${removing.content.author.name} ${removing.content.author.lastName}, sobre ${removing.content.context.title}`}
          placeholder={`Por qué se elimina ${TYPE_COPY[removing.contentType].removedLabel}.`}
          note={TYPE_COPY[removing.contentType].removeNote}
          confirmLabel="Eliminar"
          confirmingLabel="Eliminando..."
          saving={saving}
          error={actionError}
          onClose={closeDialogs}
          onConfirm={(reason) =>
            decide(removing, { decision: "remove", reason }, "No pudimos eliminar el contenido.")
          }
        />
      ) : null}
    </section>
  );
}

/** Who made a report: a user, a deleted account or the old moderation. */
function reporterLabel({ system, reporter }: ContentReportItem): string {
  if (system) return "Moderación automática anterior";
  return reporter ? `${reporter.name} ${reporter.lastName}` : "Cuenta eliminada";
}

function ReportCard({
  item,
  saving,
  onKeep,
  onRemove,
}: {
  item: ContentReportSummary;
  saving: boolean;
  onKeep: () => void;
  onRemove: () => void;
}) {
  const { content } = item;
  const [detail, setDetail] = useState<ContentReportDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const typeCopy = TYPE_COPY[item.contentType];
  const authorName = content ? `${content.author.name} ${content.author.lastName}` : null;

  async function toggleDetail() {
    if (detailOpen) {
      setDetailOpen(false);
      return;
    }
    setDetailOpen(true);
    if (detail) return;
    setDetailError(null);
    try {
      setDetail(await getContentReport(item.contentType, item.contentId));
    } catch (error) {
      setDetailError(moderationErrorMessage(error, "No pudimos cargar las denuncias."));
    }
  }

  return (
    <article className={styles.card} aria-label={`${typeCopy.label} denunciada`}>
      {content ? (
        <UserAvatar
          name={content.author.name}
          lastName={content.author.lastName}
          userId={content.author.id}
        />
      ) : (
        <span className={shared.stateIcon} aria-hidden="true">
          <Icon name="trash-2" size={20} />
        </span>
      )}
      <div className={styles.body}>
        <div className={styles.identity}>
          <span className={styles.authorName}>{authorName ?? "Contenido eliminado"}</span>
          <span className={styles.dot} aria-hidden="true" />
          <span className={styles.timestamp}>{typeCopy.label}</span>
          <span className={styles.dot} aria-hidden="true" />
          <time className={styles.timestamp} dateTime={item.firstReportedAt}>
            Primera denuncia {formatRelativeTime(item.firstReportedAt).toLowerCase()}
          </time>
        </div>

        {content ? (
          <>
            <div className={styles.context}>
              <Link
                className={styles.contextChip}
                href={
                  content.context.kind === "activity"
                    ? activityDetailRoute(content.context.id)
                    : planDetailRoute(content.context.id)
                }
              >
                <Icon name={content.context.kind === "activity" ? "map-pin" : "map"} size={13} />
                {content.context.title}
              </Link>
              {content.score !== null ? <Stars rating={content.score} size={17} /> : null}
            </div>
            {content.imageUrl ? (
              <button
                type="button"
                className={styles.photoButton}
                aria-label={`Ver en grande la foto de ${authorName}`}
                onClick={() => setPhotoOpen(true)}
              >
                <AuthenticatedImage
                  url={content.imageUrl}
                  alt=""
                  width={640}
                  height={480}
                  className={styles.photo}
                />
              </button>
            ) : content.text ? (
              <p className={styles.comment}>{content.text}</p>
            ) : (
              <p className={styles.noComment}>Sin comentario: solo puntuación.</p>
            )}
            {content.type === "rating" ? (
              <MediaGallery
                target="rating"
                resourceId={content.id}
                resourceName={`valoración de ${authorName}`}
                variant="strip"
              />
            ) : null}
          </>
        ) : (
          <p className={styles.noComment}>Su autor lo borró después de la denuncia.</p>
        )}

        <div className={styles.badges}>
          <Badge variant="warn">
            {item.reportCount === 1 ? "1 denuncia" : `${item.reportCount} denuncias`}
          </Badge>
          {item.previouslyKept ? <Badge variant="dark">Revisado antes · sigue visible</Badge> : null}
        </div>

        <button
          type="button"
          className={styles.detailToggle}
          aria-expanded={detailOpen}
          onClick={() => void toggleDetail()}
        >
          {detailOpen ? "Ocultar denuncias" : "Ver denuncias"}
        </button>
        {detailOpen ? (
          detailError ? (
            <p className={styles.detailError} role="alert">
              {detailError}
            </p>
          ) : detail ? (
            <ul className={styles.reports} aria-label="Denuncias recibidas">
              {detail.reports.map((report) => (
                <li key={report.id} className={styles.reportItem}>
                  <span>
                    <span className={styles.reportReason}>{REPORT_REASON_LABELS[report.reason]}</span>
                    {" · "}
                    {reporterLabel(report)}
                    {" · "}
                    <time dateTime={report.createdAt}>{formatRelativeTime(report.createdAt)}</time>
                  </span>
                  {report.detail ? <p className={styles.reportDetail}>{report.detail}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.timestamp} role="status">
              Cargando denuncias...
            </p>
          )
        ) : null}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.keep}`}
          disabled={saving}
          aria-label={
            content
              ? `Dejar publicado: ${typeCopy.label.toLowerCase()} de ${authorName}`
              : "Cerrar denuncias de contenido eliminado"
          }
          onClick={onKeep}
        >
          <Icon name="check" size={15} />
          {content ? "Dejar" : "Cerrar"}
        </button>
        {content ? (
          <button
            type="button"
            className={`${styles.actionButton} ${styles.remove}`}
            disabled={saving}
            aria-label={`Eliminar: ${typeCopy.label.toLowerCase()} de ${authorName}`}
            onClick={onRemove}
          >
            <Icon name="trash-2" size={15} />
            Eliminar
          </button>
        ) : null}
      </div>

      {photoOpen && content?.imageUrl ? (
        <MediaLightbox
          images={[
            {
              id: content.id,
              url: content.imageUrl,
              isPrimary: false,
              displayOrder: 0,
              createdAt: content.createdAt,
            },
          ]}
          index={0}
          resourceName={`foto de ${authorName}`}
          onIndexChange={() => undefined}
          onClose={() => setPhotoOpen(false)}
        />
      ) : null}
    </article>
  );
}
