"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuthenticatedImage, MediaLightbox } from "@/components/media";
import {
  ReportButton,
  useContentReporter,
  type ReportTarget,
} from "@/components/reports";
import { FEEDBACK_TAG_LABELS } from "@/components/feedback";
import { Badge, Icon, Stars } from "@/components/ui";
import { addCommunityExperienceVisit, ApiError, getCommunityExperience } from "@/lib/api";
import {
  communityExperienceRoute,
  planDetailRoute,
  ROUTES,
} from "@/lib/routes";
import type { CommunityExperience } from "@/types";
import { formatLongDate, storyOrigins } from "./format";
import { InspiredByChip } from "./InspiredByChip";
import { PersonLink } from "./Person";
import { LikeExperienceButton, SavePlanButton, SharePublicationButton } from "./PublicationActions";
import { useCommunityReturnPath } from "./useCommunityReturnPath";
import styles from "./community.module.css";

export function ExperienceDetailScreen({ id }: { id: number }) {
  const returnTo = useCommunityReturnPath();
  const [experience, setExperience] = useState<CommunityExperience | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [unavailablePhotos, setUnavailablePhotos] = useState<number[]>([]);
  const [addingVisit, setAddingVisit] = useState(false);
  const [visitError, setVisitError] = useState<string | null>(null);
  const hideUnavailablePhoto = useCallback((photoId: number) => {
    setLightboxIndex(null);
    setUnavailablePhotos((current) =>
      current.includes(photoId) ? current : [...current, photoId],
    );
  }, []);
  const hideReported = useCallback(
    ({ contentType, contentId }: ReportTarget) => {
      setLightboxIndex(null);
      setExperience((current) =>
        current
          ? contentType === "experience_comment"
            ? { ...current, comment: null }
            : {
                ...current,
                photos: current.photos.filter(
                  (photo) => photo.id !== contentId,
                ),
              }
          : null,
      );
    },
    [],
  );
  const reporter = useContentReporter(hideReported);
  const addVisit = useCallback(async () => {
    if (!experience || addingVisit) return;
    setAddingVisit(true);
    setVisitError(null);
    try {
      const result = await addCommunityExperienceVisit(experience.id);
      setExperience((current) => current ? { ...current, visitCount: result.visitCount } : current);
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : null;
      setVisitError(
        apiError?.code === "NO_UNCOUNTED_COMPLETED_OUTING"
          ? "Todavía no hay otra salida completada para sumar. Cuando completes este plan, vas a poder registrarla acá."
          : apiError?.code === "EXPERIENCE_VISIT_LIMIT_REACHED"
            ? "Esta experiencia ya alcanzó el máximo de 100 salidas registradas."
            : "No pudimos guardar esta salida. Probá de nuevo.",
      );
    } finally {
      setAddingVisit(false);
    }
  }, [addingVisit, experience]);
  useEffect(() => {
    let active = true;
    void getCommunityExperience(id)
      .then((item) => {
        if (active) setExperience(item);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [id]);
  if (!experience && !failed)
    return (
      <div className={styles.page}>
        <div
          className={styles.profileSkeleton}
          role="status"
          aria-label="Abriendo esta experiencia"
        >
          <span />
          <span />
        </div>
      </div>
    );
  if (failed || !experience)
    return (
      <div className={styles.page}>
        <div className={styles.state}>
          <h1 className={styles.stateTitle}>
            Esta experiencia ya no está disponible
          </h1>
          <p>Puede que su autor la haya hecho privada.</p>
          <Link className={styles.textButton} href={ROUTES.community}>
            Volver a la comunidad
          </Link>
        </div>
      </div>
    );
  const { livedFrom, inspiredBy } = storyOrigins(experience);
  const sourcePlan = livedFrom ?? inspiredBy;
  const author = experience.author.username
    ? `@${experience.author.username}`
    : experience.author.alias;
  const title = sourcePlan?.title ?? `Una salida de ${author}`;
  const photos = experience.photos.filter(
    (photo) => !unavailablePhotos.includes(photo.id),
  );
  return (
    <div className={styles.page}>
      <Link href={returnTo} className={styles.backLink}>
        <Icon name="arrow-left" size={16} />
        Volver a la comunidad
      </Link>
      <article
        className={`${styles.detail} ${!photos.length && !experience.comment ? styles.detailTextOnly : ""}`}
      >
        {photos.length ? (
          <div
            className={`${styles.gallery} ${photos.length === 1 ? styles.galleryOnly : ""}`}
            data-count={photos.length}
          >
            {photos.map((photo, index) => (
              <button
                className={styles.galleryPhoto}
                type="button"
                key={photo.id}
                onClick={() => setLightboxIndex(index)}
                aria-label={`Ver foto ${index + 1} de ${photos.length}`}
              >
                <AuthenticatedImage
                  url={photo.url}
                  alt={`Foto ${index + 1} de la salida de ${author}`}
                  width={1000}
                  height={760}
                  onUnavailable={() => hideUnavailablePhoto(photo.id)}
                />
              </button>
            ))}
          </div>
        ) : experience.comment ? (
          <div className={styles.noPhotos}>
            <blockquote>“{experience.comment}”</blockquote>
          </div>
        ) : null}
        <div className={styles.story}>
          {experience.author.username ? (
            <PersonLink
              username={experience.author.username}
              avatarUrl={experience.author.avatarUrl}
              size={48}
              note="compartió su experiencia"
            />
          ) : (
            <span>{author}</span>
          )}
          <h1 className={styles.storyHeading}>{title}</h1>
          {unavailablePhotos.length ? (
            <p className={styles.sidebarNote} role="status">
              {photos.length
                ? "Algunas fotos no están disponibles. Podés ver las demás."
                : "Las fotos no están disponibles en este momento."}
            </p>
          ) : null}
          <div className={styles.storyMeta}>
            <Stars rating={experience.rating} size={18} />
            {experience.completedAt ? (
              <time dateTime={experience.completedAt}>
                {formatLongDate(experience.completedAt)}
              </time>
            ) : null}
            <Badge variant="success">Experiencia</Badge>
          </div>
          {!experience.isOwn && (experience.visitCount ?? 1) > 1 ? (
            <p className={styles.repeatCount}>La hizo {experience.visitCount} veces</p>
          ) : null}
          {experience.comment ? (
            <div>
              {photos.length ? (
                <blockquote className={styles.storyQuote}>
                  {experience.comment}
                </blockquote>
              ) : null}
              <ReportButton
                isOwn={experience.isOwn}
                label={`Denunciar comentario de ${author}`}
                onRequest={() =>
                  reporter.request({
                    contentType: "experience_comment",
                    contentId: experience.id,
                    title: "Denunciar comentario",
                  })
                }
              />
            </div>
          ) : null}
          {experience.tags.length ? (
            <div className={styles.tags}>
              {experience.tags.map((tag) => (
                <Badge variant="tag" key={tag}>
                  {FEEDBACK_TAG_LABELS[tag]}
                </Badge>
              ))}
            </div>
          ) : null}
          {inspiredBy ? (
            <InspiredByChip
              plan={inspiredBy}
              creatorUsername={inspiredBy.creatorUsername}
              returnTo={ROUTES.community}
            />
          ) : null}
          {sourcePlan ? (
            <section className={styles.sourcePlanContext}>
              <h2>¿Te dieron ganas de hacerlo?</h2>
              <p>
                Descubrí el recorrido y sus experiencias, o armá tu propia
                versión.
              </p>
              <div className={styles.actionRow}>
                <Link
                  className={styles.primaryAction}
                  href={planDetailRoute(sourcePlan.id, ROUTES.community)}
                >
                  Ver plan
                </Link>
                <Link className={styles.textButton} href={`${ROUTES.createPlan}?inspiredBy=${sourcePlan.id}`}>
                  Hacer una versión
                </Link>
              </div>
              <SavePlanButton id={sourcePlan.id} title={sourcePlan.title} />
              {experience.isOwn ? (
                <div className={styles.repeatPanel}>
                  <p className={styles.repeatCount}>Salidas registradas: {experience.visitCount ?? 1} de 100</p>
                  {(experience.visitCount ?? 1) < 100 ? (
                    <button className={styles.repeatAction} type="button" disabled={addingVisit} onClick={() => void addVisit()}>
                      {addingVisit ? "Sumando salida…" : "Sumar otra salida completada"}
                    </button>
                  ) : null}
                  {visitError ? <p className={styles.repeatError} role="alert">{visitError}</p> : null}
                </div>
              ) : null}
            </section>
          ) : (
            <p className={styles.sidebarNote}>
              El plan de origen ya no es pública o esta experiencia se compartió
              sin publicar un plan. La experiencia sigue siendo de quien la
              vivió.
            </p>
          )}
          <div className={styles.actions}>
            <LikeExperienceButton
              id={experience.id}
              title={title}
              initialCount={experience.likeCount ?? 0}
              initiallyLiked={experience.likedByViewer ?? false}
              isOwn={experience.isOwn}
            />
            <SharePublicationButton
              path={communityExperienceRoute(id)}
              title={title}
            />
          </div>
        </div>
      </article>
      {reporter.element}
      {lightboxIndex !== null && photos.length ? (
        <MediaLightbox
          images={photos}
          index={lightboxIndex}
          resourceName={`Experiencia de ${author}`}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          renderActions={(photo) => (
            <ReportButton
              tone="overlay"
              isOwn={experience.isOwn}
              label={`Denunciar foto de ${author}`}
              onRequest={() => {
                setLightboxIndex(null);
                reporter.request({
                  contentType: "experience_photo",
                  contentId: photo.id,
                  title: "Denunciar foto",
                });
              }}
            />
          )}
        />
      ) : null}
    </div>
  );
}
