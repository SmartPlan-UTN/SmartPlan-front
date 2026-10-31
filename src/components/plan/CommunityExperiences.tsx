"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";

import { FEEDBACK_TAG_LABELS, FEEDBACK_TAG_ORDER, ratingLabel } from "@/components/feedback";
import { AuthenticatedImage, MediaLightbox } from "@/components/media";
import { ReportButton, useContentReporter, type ReportTarget } from "@/components/reports";
import { Badge, Button, Icon, Stars } from "@/components/ui";
import { PersonAvatar } from "../community/Person";
import { useSession } from "@/lib/auth";
import { getPlanExperiences } from "@/lib/api";
import type { CommunityExperience, CommunityExperiencesSummary, MediaImage } from "@/types";

import { COMMUNITY_COPY } from "./communityContent";
import { formatLongDate } from "../community/format";
import { communityCreatorRoute } from "@/lib/routes";
import { LikeExperienceButton } from "../community/PublicationActions";
import styles from "./community.module.css";

export interface CommunityExperiencesProps {
  planId: number;
  planTitle: string;
}

const PAGE_SIZE = 6;
/**
 * Photos in the wall before "+N". The summary carries only the latest ones,
 * so "+N" counts what the lightbox can still show, not every photo.
 */
const WALL_VISIBLE = 7;
const CARD_PHOTOS_VISIBLE = 4;

interface Lightbox {
  images: MediaImage[];
  index: number;
  name: string;
  /** Whose photos they are, for the report flag's name. */
  owner: string;
  /** Whether the viewer took this photo, so it cannot be reported. */
  isOwn: (image: MediaImage) => boolean;
}

/** How the report dialog names a photo of the community. */
const PHOTO_REPORT_TITLE = "Denunciar foto";

/**
 * "Experiencias de la comunidad" (#106): what people who actually did the
 * plan shared — stars, highlights, a comment and, above all, their photos,
 * as social proof to decide whether the plan is worth it. Only shared
 * experiences ever reach this section.
 *
 * Anyone but its author can report a comment or a photo (#156): it leaves
 * the view at once, the comment alone or the photo alone, while the rest of
 * the experience and its score stay.
 */
export function CommunityExperiences(props: CommunityExperiencesProps) {
  const { status, user } = useSession();
  if (status === "loading") return <p role="status">Cargando experiencias…</p>;
  return <CommunityExperiencesBody key={`${props.planId}:${user?.id ?? status}`} {...props} />;
}

function CommunityExperiencesBody({ planId, planTitle }: CommunityExperiencesProps) {
  const headingId = useId();
  const [summary, setSummary] = useState<CommunityExperiencesSummary | null>(null);
  const [items, setItems] = useState<CommunityExperience[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [lightbox, setLightbox] = useState<Lightbox | null>(null);

  const hideReported = useCallback(({ contentType, contentId }: ReportTarget) => {
    if (contentType === "experience_comment") {
      setItems((current) =>
        current.map((item) => (item.id === contentId ? { ...item, comment: null } : item)),
      );
      return;
    }
    const withoutPhoto = <T extends MediaImage>(photos: T[]) =>
      photos.filter((photo) => photo.id !== contentId);
    setItems((current) => current.map((item) => ({ ...item, photos: withoutPhoto(item.photos) })));
    setSummary((current) => current && {
      ...current,
      photos: withoutPhoto(current.photos),
      // The summary count covers every shared photo, while its gallery only
      // keeps the latest twelve. A reported photo can be outside that window.
      photoCount: Math.max(0, current.photoCount - 1),
    });
  }, []);
  const reporter = useContentReporter(hideReported);

  function reportPhoto(photoId: number) {
    setLightbox(null);
    reporter.request({ contentType: "experience_photo", contentId: photoId, title: PHOTO_REPORT_TITLE });
  }

  useEffect(() => {
    let active = true;
    getPlanExperiences(planId, { page: 1, limit: PAGE_SIZE })
      .then((result) => {
        if (!active) return;
        setSummary(result.summary);
        setItems(result.data);
        setPage(1);
        setTotalPages(result.pagination.totalPages);
        setState("ready");
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [planId, retryToken]);

  async function loadMore() {
    setLoadingMore(true);
    setMoreError(false);
    try {
      const result = await getPlanExperiences(planId, { page: page + 1, limit: PAGE_SIZE });
      // A new experience shared meanwhile shifts the pages: skip repeats.
      setItems((current) => [
        ...current,
        ...result.data.filter((item) => !current.some((known) => known.id === item.id)),
      ]);
      setPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const heading = (
    <header className={styles.header}>
      <p className={styles.kicker}>{COMMUNITY_COPY.kicker}</p>
      <h2 id={headingId} className={styles.title}>
        {COMMUNITY_COPY.title}
      </h2>
    </header>
  );

  if (state === "loading") {
    return (
      <section id="community-experiences" className={styles.community} aria-labelledby={headingId} aria-busy="true">
        {heading}
        <div className={styles.wallSkeleton} role="status" aria-label={COMMUNITY_COPY.loading} />
      </section>
    );
  }

  if (state === "error" || summary === null) {
    return (
      <section id="community-experiences" className={styles.community} aria-labelledby={headingId}>
        {heading}
        <div className={styles.error} role="alert">
          <p>{COMMUNITY_COPY.error}</p>
          <Button
            variant="ghostLight"
            size="sm"
            onClick={() => {
              setState("loading");
              setRetryToken((token) => token + 1);
            }}
          >
            {COMMUNITY_COPY.retry}
          </Button>
        </div>
      </section>
    );
  }

  if (summary.experienceCount === 0) {
    return (
      <section id="community-experiences" className={styles.community} aria-labelledby={headingId}>
        {heading}
        <div className={styles.empty}>
          <Icon name="camera" size={22} aria-hidden="true" className={styles.emptyIcon} />
          <div>
            <p className={styles.emptyTitle}>{COMMUNITY_COPY.empty.title}</p>
            <p className={styles.emptyBody}>{COMMUNITY_COPY.empty.body}</p>
          </div>
        </div>
      </section>
    );
  }

  const wall = summary.photos.slice(0, WALL_VISIBLE);
  const hiddenInWall = summary.photos.length - wall.length;

  return (
    <section id="community-experiences" className={styles.community} aria-labelledby={headingId}>
      {heading}

      <div className={styles.summary}>
        <span className={styles.score}>{summary.averageRating.toFixed(1)}</span>
        <div className={styles.summaryDetail}>
          <Stars rating={summary.averageRating} size={16} />
          <span className={styles.summaryCounts}>
            {COMMUNITY_COPY.counts(summary.experienceCount, summary.photoCount)}
          </span>
        </div>
      </div>

      {wall.length > 0 ? (
        <ul className={styles.wall} data-count={wall.length} aria-label={COMMUNITY_COPY.wallLabel(planTitle)}>
          {wall.map((photo, index) => (
            <li key={photo.id} className={styles.wallItem}>
              <button
                type="button"
                className={styles.photoButton}
                onClick={() =>
                  setLightbox({
                    images: summary.photos,
                    index,
                    name: COMMUNITY_COPY.wallLabel(planTitle),
                    owner: COMMUNITY_COPY.wallOwner,
                    isOwn: (image) =>
                      summary.photos.find((photo) => photo.id === image.id)?.isOwn ?? true,
                  })
                }
                aria-label={COMMUNITY_COPY.viewPhoto(index + 1, summary.photos.length)}
              >
                <AuthenticatedImage
                  url={photo.url}
                  alt=""
                  width={index === 0 ? 960 : 480}
                  height={index === 0 ? 720 : 360}
                  className={styles.photo}
                />
                {hiddenInWall > 0 && index === wall.length - 1 ? (
                  <span className={styles.moreOverlay} aria-hidden="true">
                    +{hiddenInWall}
                  </span>
                ) : null}
              </button>
              <span className={styles.photoReport}>
                <ReportButton
                  tone="overlay"
                  isOwn={photo.isOwn}
                  label={COMMUNITY_COPY.reportPhoto(index + 1, COMMUNITY_COPY.wallOwner)}
                  onRequest={() => reportPhoto(photo.id)}
                />
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <ul className={styles.list} aria-label={COMMUNITY_COPY.listLabel}>
        {items.map((experience) => (
          <li key={experience.id}>
            <ExperienceCard
              experience={experience}
              onOpenPhoto={(index) =>
                setLightbox({
                  images: experience.photos,
                  index,
                  name: COMMUNITY_COPY.photosBy(experience.author.alias),
                  owner: experience.author.alias,
                  isOwn: () => experience.isOwn,
                })
              }
              onReportComment={() =>
                reporter.request({
                  contentType: "experience_comment",
                  contentId: experience.id,
                  title: "Denunciar comentario",
                })
              }
              onReportPhoto={reportPhoto}
            />
          </li>
        ))}
      </ul>

      {page < totalPages ? (
        <div className={styles.more}>
          {moreError ? (
            <p className={styles.moreError} role="alert">
              {COMMUNITY_COPY.moreError}
            </p>
          ) : null}
          <Button variant="ghostLight" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore ? COMMUNITY_COPY.loadingMore : COMMUNITY_COPY.loadMore}
          </Button>
        </div>
      ) : null}

      {lightbox ? (
        <MediaLightbox
          images={lightbox.images}
          index={lightbox.index}
          resourceName={lightbox.name}
          onIndexChange={(index) => setLightbox({ ...lightbox, index })}
          onClose={() => setLightbox(null)}
          renderActions={(image) => (
            <ReportButton
              tone="overlay"
              isOwn={lightbox.isOwn(image)}
              label={COMMUNITY_COPY.reportPhoto(lightbox.index + 1, lightbox.owner)}
              onRequest={() => reportPhoto(image.id)}
            />
          )}
        />
      ) : null}
      {reporter.element}
    </section>
  );
}

function ExperienceCard({
  experience,
  onOpenPhoto,
  onReportComment,
  onReportPhoto,
}: {
  experience: CommunityExperience;
  onOpenPhoto: (index: number) => void;
  onReportComment: () => void;
  onReportPhoto: (photoId: number) => void;
}) {
  const tags = FEEDBACK_TAG_ORDER.filter((tag) => experience.tags.includes(tag));
  const photos = experience.photos.slice(0, CARD_PHOTOS_VISIBLE);
  const hiddenPhotos = experience.photos.length - photos.length;

  return (
    <article className={styles.card} aria-label={COMMUNITY_COPY.cardLabel(experience.author.alias)}>
      <header className={styles.cardHeader}>
        {/* The same person looks the same here as on their profile and in the feed. */}
        <PersonAvatar username={experience.author.username ?? "viajero"} avatarUrl={experience.author.avatarUrl} size={40} />
        <div className={styles.cardAuthor}>
          {experience.author.username ? (
            <Link className={styles.authorName} href={communityCreatorRoute(experience.author.username)}>
              @{experience.author.username}
            </Link>
          ) : (
            <span className={styles.authorName}>{experience.author.alias}</span>
          )}
          {experience.completedAt ? (
            <span className={styles.cardDate}>
              {COMMUNITY_COPY.doneIn(formatLongDate(experience.completedAt))}
            </span>
          ) : null}
          {(experience.visitCount ?? 1) > 1 ? (
            <span className={styles.cardDate}>La hizo {experience.visitCount} veces</span>
          ) : null}
        </div>
      </header>

      <div className={styles.cardRating}>
        <Stars rating={experience.rating} size={15} />
        <span>{ratingLabel(experience.rating)}</span>
      </div>

      {tags.length > 0 ? (
        <div className={styles.cardTags}>
          {tags.map((tag) => (
            <Badge key={tag} variant="tag">
              {FEEDBACK_TAG_LABELS[tag]}
            </Badge>
          ))}
        </div>
      ) : null}

      {experience.comment ? (
        <div className={styles.cardCommentRow}>
          <p className={styles.cardComment}>“{experience.comment}”</p>
          <ReportButton
            isOwn={experience.isOwn}
            label={COMMUNITY_COPY.reportComment(experience.author.alias)}
            onRequest={onReportComment}
          />
        </div>
      ) : null}

      {photos.length > 0 ? (
        <ul className={styles.cardPhotos} aria-label={COMMUNITY_COPY.photosBy(experience.author.alias)}>
          {photos.map((photo, index) => (
            <li key={photo.id} className={styles.cardPhoto}>
              <button
                type="button"
                className={styles.photoButton}
                onClick={() => onOpenPhoto(index)}
                aria-label={COMMUNITY_COPY.viewPhoto(index + 1, experience.photos.length)}
              >
                <AuthenticatedImage url={photo.url} alt="" width={240} height={240} className={styles.photo} />
                {hiddenPhotos > 0 && index === photos.length - 1 ? (
                  <span className={styles.moreOverlay} aria-hidden="true">
                    +{hiddenPhotos}
                  </span>
                ) : null}
              </button>
              <span className={styles.photoReport}>
                <ReportButton
                  tone="overlay"
                  isOwn={experience.isOwn}
                  label={COMMUNITY_COPY.reportPhoto(index + 1, experience.author.alias)}
                  onRequest={() => onReportPhoto(photo.id)}
                />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <LikeExperienceButton
        id={experience.id}
        title={COMMUNITY_COPY.cardLabel(experience.author.alias)}
        initialCount={experience.likeCount ?? 0}
        initiallyLiked={experience.likedByViewer ?? false}
        isOwn={experience.isOwn}
      />
    </article>
  );
}
