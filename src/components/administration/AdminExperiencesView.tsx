"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Pagination } from "@/components/explore";
import { AuthenticatedImage, MediaLightbox } from "@/components/media";
import { Button, Icon, Stars, UserAvatar } from "@/components/ui";
import {
  ApiError,
  getAdminExperienceCounts,
  listAdminExperiences,
  moderateAdminExperienceComment,
  moderateAdminExperiencePhoto,
} from "@/lib/api";
import { planDetailRoute } from "@/lib/routes";
import { formatRelativeTime } from "@/lib/utils";
import type {
  AdminExperience,
  AdminExperienceCounts,
  AdminExperiencePhoto,
  AdminExperiencesResult,
  CommunityContentStatus,
  ExperienceModerationQueue,
  ModerateExperienceContentInput,
} from "@/types";

import { RatingRejectionDialog } from "./RatingRejectionDialog";
import ratingStyles from "./AdminRatings.module.css";
import styles from "./AdminExperiences.module.css";
import shared from "./AdminManagement.module.css";

const PAGE_SIZE = 20;

type LoadState =
  | { key: string; phase: "loading" }
  | { key: string; phase: "success"; result: AdminExperiencesResult }
  | { key: string; phase: "error"; message: string };

/** What the rejection dialog is about to take down. */
type Rejecting =
  | { kind: "comment"; experience: AdminExperience }
  | { kind: "photo"; experience: AdminExperience; photo: AdminExperiencePhoto };

/**
 * Shared content is public the moment it is shared, so there is no
 * "pending" queue: "Sin revisar" is what is already public and nobody has
 * looked at yet, "Rechazadas" what was taken down.
 */
const TABS: Array<{ status: ExperienceModerationQueue; label: string }> = [
  { status: "unreviewed", label: "Sin revisar" },
  { status: "rejected", label: "Rechazadas" },
];

const EMPTY_COPY: Record<ExperienceModerationQueue, string> = {
  unreviewed: "Revisaste todo lo que se compartió.",
  rejected: "No quitaste nada de la comunidad.",
};

const STATUS_LABEL: Record<CommunityContentStatus, string> = {
  unreviewed: "Publicado · sin revisar",
  approved: "Publicado · revisado",
  rejected: "Quitado de la comunidad",
};

function readableError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.code === "EXPERIENCE_NOT_FOUND") return "La experiencia ya no existe.";
    if (error.code === "EXPERIENCE_PHOTO_NOT_FOUND") return "La foto ya no existe.";
    if (error.isForbidden) return "No tenés permisos para moderar experiencias.";
    if (error.isNetworkError) return "No pudimos conectarnos con el servidor.";
    return error.message;
  }
  return fallback;
}

/**
 * Moderation of community experiences (#106). Everything here is already
 * public: confirming it only takes it out of "Sin revisar", while rejecting
 * hides it from the community and notifies the author with the reason. The
 * author keeps the photo or comment in their outing either way.
 */
export function AdminExperiencesView() {
  const [status, setStatus] = useState<ExperienceModerationQueue>("unreviewed");
  const [page, setPage] = useState(1);
  const [counts, setCounts] = useState<AdminExperienceCounts | null>(null);
  const [reloadSequence, setReloadSequence] = useState(0);
  const [rejecting, setRejecting] = useState<Rejecting | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ photos: AdminExperiencePhoto[]; index: number } | null>(null);
  const requestKey = `${status}:${page}:${reloadSequence}`;
  const [loadState, setLoadState] = useState<LoadState>({ key: requestKey, phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    const key = requestKey;
    setLoadState({ key, phase: "loading" });
    listAdminExperiences({ status, page, limit: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        // Moderating the last item of a page can empty it; step back.
        if (data.data.length === 0 && page > 1) {
          setPage(Math.max(1, Math.min(page - 1, data.pagination.totalPages)));
          return;
        }
        setLoadState({ key, phase: "success", result: data });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadState({
            key,
            phase: "error",
            message: readableError(error, "No pudimos cargar las experiencias."),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status, page, requestKey]);

  useEffect(() => {
    let cancelled = false;
    getAdminExperienceCounts()
      .then((data) => {
        if (!cancelled) setCounts(data);
      })
      .catch(() => {
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
  const experiences = result?.data ?? [];

  async function moderate(
    target: Rejecting,
    input: ModerateExperienceContentInput,
    fallback: string,
  ): Promise<boolean> {
    setSaving(true);
    setActionError(null);
    try {
      if (target.kind === "comment") {
        await moderateAdminExperienceComment(target.experience.id, input);
      } else {
        await moderateAdminExperiencePhoto(target.experience.id, target.photo.id, input);
      }
      setReloadSequence((current) => current + 1);
      return true;
    } catch (error) {
      setActionError(readableError(error, fallback));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function reject(reason: string) {
    if (!rejecting) return;
    const done = await moderate(
      rejecting,
      { status: "rejected", reason },
      "No pudimos quitar el contenido.",
    );
    if (done) setRejecting(null);
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
            <Icon name="users" size={14} />
            Moderación
          </p>
          <h1 className={`sp-h2 ${shared.title}`}>Experiencias de la comunidad</h1>
          <p className={`sp-body ${shared.subtitle}`}>
            Lo que se comparte se publica al instante. Revisalo y quitá lo que no cumpla las
            normas: a la persona le avisamos el motivo.
          </p>
        </div>
      </header>

      <div className={ratingStyles.tabs} role="tablist" aria-label="Estado de moderación">
        {TABS.map((tab) => {
          const active = tab.status === status;
          return (
            <button
              key={tab.status}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${ratingStyles.tab} ${active ? ratingStyles.tabActive : ""}`}
              onClick={() => {
                setStatus(tab.status);
                setPage(1);
                setActionError(null);
              }}
            >
              {tab.label}
              {counts ? <span className={ratingStyles.tabCount}>{counts[tab.status]}</span> : null}
            </button>
          );
        })}
      </div>

      {actionError && !rejecting ? (
        <p className={shared.formError} role="alert">
          {actionError}
        </p>
      ) : null}

      {loadError ? (
        <div className={shared.state} role="alert">
          <span className={shared.stateIcon}>
            <Icon name="triangle-alert" size={24} />
          </span>
          <strong>No pudimos cargar las experiencias</strong>
          <p>{loadError}</p>
          <Button size="sm" variant="ghostLight" onClick={() => setReloadSequence((current) => current + 1)}>
            Reintentar
          </Button>
        </div>
      ) : loading ? (
        <div className={shared.state} role="status">
          <Icon name="loader-circle" className="sp-spin" size={28} />
          <p>Cargando experiencias...</p>
        </div>
      ) : experiences.length === 0 ? (
        <div className={shared.state}>
          <span className={ratingStyles.emptyIcon}>
            <Icon name="circle-check" size={26} />
          </span>
          <strong>Todo al día</strong>
          <p>{EMPTY_COPY[status]}</p>
        </div>
      ) : (
        <div className={ratingStyles.feed}>
          {experiences.map((experience) => {
            const fullName = `${experience.author.name} ${experience.author.lastName}`;
            return (
              <article key={experience.id} className={ratingStyles.card}>
                <UserAvatar
                  name={experience.author.name}
                  lastName={experience.author.lastName}
                  userId={experience.author.id}
                />
                <div className={ratingStyles.body}>
                  <div className={ratingStyles.identity}>
                    <span className={ratingStyles.authorName}>{fullName}</span>
                    {experience.sharedAt ? (
                      <>
                        <span className={ratingStyles.dot} aria-hidden="true" />
                        <time className={ratingStyles.timestamp} dateTime={experience.sharedAt}>
                          Compartida {formatRelativeTime(experience.sharedAt)}
                        </time>
                      </>
                    ) : null}
                    {experience.shared ? null : (
                      <span className={styles.privateBadge}>
                        <Icon name="lock" size={12} aria-hidden="true" />
                        Ahora privada
                      </span>
                    )}
                  </div>
                  <div className={ratingStyles.context}>
                    {experience.plan ? (
                      <Link className={ratingStyles.contextChip} href={planDetailRoute(experience.plan.id)}>
                        <Icon name="map" size={13} />
                        {experience.plan.title}
                      </Link>
                    ) : null}
                    <Stars rating={experience.rating} size={17} />
                  </div>

                  {experience.comment && experience.commentStatus ? (
                    <div className={styles.item} data-status={experience.commentStatus}>
                      <p className={ratingStyles.comment}>{experience.comment}</p>
                      <div className={styles.itemFooter}>
                        <span className={styles.status}>{STATUS_LABEL[experience.commentStatus]}</span>
                        <ModerationActions
                          status={experience.commentStatus}
                          subject={`el comentario de ${fullName}`}
                          saving={saving}
                          onApprove={() =>
                            void moderate(
                              { kind: "comment", experience },
                              { status: "approved" },
                              "No pudimos confirmar el comentario.",
                            )
                          }
                          onReject={() => {
                            setActionError(null);
                            setRejecting({ kind: "comment", experience });
                          }}
                        />
                      </div>
                      {experience.commentModerationReason ? (
                        <p className={ratingStyles.reason}>
                          <Icon name="triangle-alert" size={16} />
                          {experience.commentModerationReason}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className={ratingStyles.noComment}>Sin comentario.</p>
                  )}

                  {experience.photos.length > 0 ? (
                    <ul className={styles.photos} aria-label={`Fotos de ${fullName}`}>
                      {experience.photos.map((photo, index) => (
                        <li key={photo.id} className={styles.photoItem} data-status={photo.communityStatus}>
                          <button
                            type="button"
                            className={styles.photoButton}
                            onClick={() => setLightbox({ photos: experience.photos, index })}
                            aria-label={`Ver foto ${index + 1} de ${experience.photos.length}`}
                          >
                            <AuthenticatedImage url={photo.url} alt="" width={240} height={240} className={styles.photo} />
                          </button>
                          <span className={styles.status}>{STATUS_LABEL[photo.communityStatus]}</span>
                          <ModerationActions
                            status={photo.communityStatus}
                            subject={`la foto ${index + 1} de ${fullName}`}
                            saving={saving}
                            compact
                            onApprove={() =>
                              void moderate(
                                { kind: "photo", experience, photo },
                                { status: "approved" },
                                "No pudimos confirmar la foto.",
                              )
                            }
                            onReject={() => {
                              setActionError(null);
                              setRejecting({ kind: "photo", experience, photo });
                            }}
                          />
                          {photo.communityReason ? (
                            <span className={styles.photoReason}>{photo.communityReason}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {result && result.pagination.total > 0 ? (
        <div className={shared.paginationArea}>
          <p>
            Mostrando {firstVisible}–{lastVisible} de {result.pagination.total} experiencias
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
          title={rejecting.kind === "comment" ? "Quitar comentario" : "Quitar foto"}
          subtitle={`De ${rejecting.experience.author.name} ${rejecting.experience.author.lastName}${
            rejecting.experience.plan ? `, sobre ${rejecting.experience.plan.title}` : ""
          }`}
          placeholder={
            rejecting.kind === "comment"
              ? "Por qué este comentario no se muestra."
              : "Por qué esta foto no se muestra."
          }
          note="Deja de verse en la comunidad y le avisamos a la persona con este motivo. Ella lo sigue teniendo en su salida."
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

      {lightbox ? (
        <MediaLightbox
          images={lightbox.photos}
          index={lightbox.index}
          resourceName="experiencia"
          onIndexChange={(index) => setLightbox({ ...lightbox, index })}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </section>
  );
}

function ModerationActions({
  status,
  subject,
  saving,
  compact = false,
  onApprove,
  onReject,
}: {
  status: CommunityContentStatus;
  subject: string;
  saving: boolean;
  compact?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className={styles.itemActions}>
      {status === "approved" ? null : (
        <button
          type="button"
          className={`${ratingStyles.actionButton} ${ratingStyles.approve}`}
          disabled={saving}
          aria-label={`${status === "rejected" ? "Volver a publicar" : "Confirmar"} ${subject}`}
          title={compact ? (status === "rejected" ? "Volver a publicar" : "Está bien") : undefined}
          onClick={onApprove}
        >
          <Icon name="check" size={15} />
          {compact ? null : status === "rejected" ? "Volver a publicar" : "Está bien"}
        </button>
      )}
      {status === "rejected" ? null : (
        <button
          type="button"
          className={`${ratingStyles.actionButton} ${ratingStyles.reject}`}
          disabled={saving}
          aria-label={`Quitar ${subject}`}
          title={compact ? "Quitar" : undefined}
          onClick={onReject}
        >
          <Icon name="eye-off" size={15} />
          {compact ? null : "Quitar"}
        </button>
      )}
    </div>
  );
}
