"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Pagination } from "@/components/explore";
import { Button, Icon, Stars } from "@/components/ui";
import {
  ApiError,
  getAdminRatingCounts,
  listAdminRatings,
  moderateAdminRating,
} from "@/lib/api";
import { activityDetailRoute, planDetailRoute } from "@/lib/routes";
import { formatRelativeTime } from "@/lib/utils";
import type {
  AdminRating,
  AdminRatingCounts,
  AdminRatingsResult,
  RatingModerationStatus,
} from "@/types";

import { RatingRejectionDialog } from "./RatingRejectionDialog";
import { UserAvatar } from "./UserAvatar";
import styles from "./AdminRatings.module.css";
import shared from "./AdminManagement.module.css";

const PAGE_SIZE = 20;

type RatingsLoadState =
  | { key: string; phase: "loading" }
  | { key: string; phase: "success"; result: AdminRatingsResult }
  | { key: string; phase: "error"; message: string };

/**
 * The prototype's third tab is "Ocultas", but the domain has three moderation
 * states, not four: `SmartPlan-back`'s `RatingModerationStatus` is
 * `pending | approved | rejected`, and a rejected rating is exactly what the
 * prototype called hidden — it stops being public without the record being
 * deleted. The tab is labelled for the state that actually exists.
 */
const TABS: Array<{ status: RatingModerationStatus; label: string }> = [
  { status: "pending", label: "Pendientes" },
  { status: "approved", label: "Aprobadas" },
  { status: "rejected", label: "Rechazadas" },
];

const EMPTY_COPY: Record<RatingModerationStatus, string> = {
  pending: "No hay valoraciones esperando revisión.",
  approved: "Todavía no aprobaste ninguna valoración.",
  rejected: "No rechazaste ninguna valoración.",
};

function readableError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.code === "RATING_NOT_FOUND") return "La valoración ya no existe.";
    if (error.isForbidden) return "No tenés permisos para moderar valoraciones.";
    if (error.isNetworkError) return "No pudimos conectarnos con el servidor.";
    return error.message;
  }
  return fallback;
}

/**
 * PAN 20 — the moderation tray (CU55).
 *
 * Approving publishes the comment and counts it toward the activity's public
 * average (CU45); rejecting takes it out of both, keeping the record and the
 * reason. Deleting a rating outright is CU56 and deliberately absent here.
 */
export function AdminRatingsView() {
  const [status, setStatus] = useState<RatingModerationStatus>("pending");
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<AdminRatingCounts | null>(null);
  const [reloadSequence, setReloadSequence] = useState(0);
  const [rejecting, setRejecting] = useState<AdminRating | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const requestKey = `${status}:${page}:${reloadSequence}`;
  const [loadState, setLoadState] = useState<RatingsLoadState>({
    key: requestKey,
    phase: "loading",
  });

  useEffect(() => {
    let cancelled = false;
    const key = requestKey;
    setLoadState({ key, phase: "loading" });
    listAdminRatings({
      status,
      page,
      limit: PAGE_SIZE,
      sortBy: "createdAt",
      direction: "desc",
    })
      .then((data) => {
        if (cancelled) return;
        setLoadState({ key, phase: "success", result: data });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadState({
            key,
            phase: "error",
            message: readableError(error, "No pudimos cargar las valoraciones."),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status, page, requestKey]);

  // The counters ride along with the listing rather than in it: a moderation
  // moves a rating between two tabs, so the badge of the tab it left is as
  // stale as the one it joined.
  useEffect(() => {
    let cancelled = false;
    getAdminRatingCounts()
      .then((data) => {
        if (!cancelled) setCounts(data);
      })
      .catch(() => {
        // A failed counter is a missing badge, not a broken screen: the
        // listing below carries its own error state.
        if (!cancelled) setCounts(null);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadSequence]);

  function reloadAfterModeration() {
    // The moderated rating leaves the current tab, so an emptied last page
    // would otherwise show "Sin resultados" instead of the previous page.
    if (result?.data.length === 1 && page > 1) setPage((current) => current - 1);
    setReloadSequence((current) => current + 1);
  }

  async function approve(rating: AdminRating) {
    setSaving(true);
    setActionError(null);
    try {
      await moderateAdminRating(rating.id, { status: "approved" });
      reloadAfterModeration();
    } catch (error) {
      setActionError(readableError(error, "No pudimos aprobar la valoración."));
    } finally {
      setSaving(false);
    }
  }

  async function reject(reason: string) {
    if (!rejecting) return;
    setSaving(true);
    setActionError(null);
    try {
      await moderateAdminRating(rejecting.id, { status: "rejected", reason });
      setRejecting(null);
      reloadAfterModeration();
    } catch (error) {
      setActionError(readableError(error, "No pudimos rechazar la valoración."));
    } finally {
      setSaving(false);
    }
  }

  // State from a prior tab, page, or reload never belongs to the active
  // request. Treat the render before its effect runs as loading as well, so
  // stale cards cannot remain actionable under a newly selected tab.
  const currentLoadState: RatingsLoadState =
    loadState.key === requestKey ? loadState : { key: requestKey, phase: "loading" };
  const loading = currentLoadState.phase === "loading";
  const loadError = currentLoadState.phase === "error" ? currentLoadState.message : null;
  const result = currentLoadState.phase === "success" ? currentLoadState.result : null;
  const ratings = result?.data ?? [];
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
            <Icon name="message-circle" size={14} />
            Moderación
          </p>
          <h1 className={`sp-h2 ${shared.title}`}>Moderación de Valoraciones</h1>
          <p className={`sp-body ${shared.subtitle}`}>
            Aprobá o rechazá los comentarios que los usuarios dejan sobre las actividades.
          </p>
        </div>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Estado de moderación">
        {TABS.map((tab) => {
          const active = tab.status === status;
          return (
            <button
              key={tab.status}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${styles.tab} ${active ? styles.tabActive : ""}`}
              onClick={() => {
                setStatus(tab.status);
                setPage(1);
                setActionError(null);
              }}
            >
              {tab.label}
              {counts ? <span className={styles.tabCount}>{counts[tab.status]}</span> : null}
            </button>
          );
        })}
      </div>

      {actionError ? (
        <p className={shared.formError} role="alert">
          {actionError}
        </p>
      ) : null}

      {loadError ? (
        <div className={shared.state} role="alert">
          <span className={shared.stateIcon}>
            <Icon name="triangle-alert" size={24} />
          </span>
          <strong>No pudimos cargar las valoraciones</strong>
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
          <p>Cargando valoraciones...</p>
        </div>
      ) : ratings.length === 0 ? (
        <div className={shared.state}>
          <span className={styles.emptyIcon}>
            <Icon name="circle-check" size={26} />
          </span>
          <strong>Todo al día</strong>
          <p>{EMPTY_COPY[status]}</p>
        </div>
      ) : (
        <div className={`${styles.feed} ${loading ? styles.feedLoading : ""}`}>
          {ratings.map((rating) => (
            <article key={rating.id} className={styles.card}>
              <UserAvatar
                name={rating.author.name}
                lastName={rating.author.lastName}
                userId={rating.author.id}
              />
              <div className={styles.body}>
                <div className={styles.identity}>
                  <span className={styles.authorName}>
                    {rating.author.name} {rating.author.lastName}
                  </span>
                  <span className={styles.dot} aria-hidden="true" />
                  <time className={styles.timestamp} dateTime={rating.createdAt}>
                    {formatRelativeTime(rating.createdAt)}
                  </time>
                </div>
                <div className={styles.context}>
                  <Link className={styles.contextChip} href={activityDetailRoute(rating.activityId)}>
                    <Icon name="map-pin" size={13} />
                    {rating.activity.name}
                  </Link>
                  <Link className={styles.contextChip} href={planDetailRoute(rating.planId)}>
                    <Icon name="map" size={13} />
                    {rating.plan.title}
                  </Link>
                  <Stars rating={rating.score} size={17} />
                </div>
                {rating.comment ? (
                  <p className={styles.comment}>{rating.comment}</p>
                ) : (
                  <p className={styles.noComment}>Sin comentario: solo puntuación.</p>
                )}
                {rating.moderationReason ? (
                  <p className={styles.reason}>
                    <Icon name="triangle-alert" size={16} />
                    {rating.moderationReason}
                  </p>
                ) : null}
              </div>
              <div className={styles.actions}>
                {rating.moderationStatus === "approved" ? null : (
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.approve}`}
                    disabled={saving}
                    aria-label={`Aprobar la valoración de ${rating.author.name} ${rating.author.lastName}`}
                    onClick={() => void approve(rating)}
                  >
                    <Icon name="check" size={15} />
                    Aprobar
                  </button>
                )}
                {rating.moderationStatus === "rejected" ? null : (
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.reject}`}
                    disabled={saving}
                    aria-label={`Rechazar la valoración de ${rating.author.name} ${rating.author.lastName}`}
                    onClick={() => {
                      setActionError(null);
                      setRejecting(rating);
                    }}
                  >
                    <Icon name="eye-off" size={15} />
                    Rechazar
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {result && result.pagination.total > 0 ? (
        <div className={shared.paginationArea}>
          <p>
            Mostrando {firstVisible}–{lastVisible} de {result.pagination.total} valoraciones
          </p>
          <Pagination
            page={result.pagination.page}
            totalPages={result.pagination.totalPages}
            disabled={loading}
            onPageChange={setPage}
          />
        </div>
      ) : null}

      {rejecting ? (
        <RatingRejectionDialog
          rating={rejecting}
          saving={saving}
          error={actionError}
          onClose={() => {
            if (!saving) {
              setRejecting(null);
              setActionError(null);
            }
          }}
          onConfirm={reject}
        />
      ) : null}
    </section>
  );
}
