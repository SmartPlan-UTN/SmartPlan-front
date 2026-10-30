"use client";

import Link from "next/link";
import { Badge, Icon, Stars } from "@/components/ui";
import { FEEDBACK_TAG_LABELS } from "@/components/feedback";
import {
  communityExperienceRoute,
  planDetailRoute,
  ROUTES,
} from "@/lib/routes";
import { formatDuration } from "@/lib/utils";
import type { CommunityExperience, CommunityPlan } from "@/types";
import {
  formatLongDate,
  planCostLabel,
  pluralize,
  storyOrigins,
} from "./format";
import { InspiredByChip } from "./InspiredByChip";
import { LazyImage } from "./LazyImage";
import { PersonLink } from "./Person";
import { LikeExperienceButton, SavePlanButton, SharePublicationButton } from "./PublicationActions";
import styles from "./cards.module.css";

export type CardLayout = "card" | "wide";

export function RoutePreview({ stops, maxStops = 4 }: { stops: string[]; maxStops?: number }) {
  return (
    <div className={styles.routeFallback} data-route-preview>
      <span className={styles.routeLabel}>
        <Icon name="route" size={17} />
        El recorrido
      </span>
      {stops.length ? (
        <ol className={styles.routePreview} aria-label="Recorrido">
          {stops.slice(0, maxStops).map((stop, index) => (
            <li key={`${index}-${stop}`}>
              <span>{index + 1}</span>
              {stop}
            </li>
          ))}
          {stops.length > maxStops ? (
            <li className={styles.routeMore}>
              Y {stops.length - maxStops} paradas más
            </li>
          ) : null}
        </ol>
      ) : (
        <p>Un plan para tu próxima salida.</p>
      )}
    </div>
  );
}

export function PlanCard({
  plan,
  layout = "card",
}: {
  plan: CommunityPlan;
  layout?: CardLayout;
}) {
  const route = planDetailRoute(plan.id, ROUTES.community);
  const lived = plan.experienceCount ?? 0;
  return (
    <article
      className={`${styles.card} ${layout === "wide" ? styles.wide : ""}`}
    >
      <header className={styles.publicationHead}>
        {plan.authorUsername ? (
          <PersonLink
            username={plan.authorUsername}
            avatarUrl={plan.authorAvatarUrl}
            size={40}
            note="compartió un plan"
          />
        ) : (
          <span className={styles.unknownAuthor}>Un plan de la comunidad</span>
        )}
        <Badge variant="tag">Plan</Badge>
      </header>
      <div className={styles.cover}>
        {plan.imageUrl ? (
          <LazyImage
            url={plan.imageUrl}
            alt=""
            width={960}
            height={600}
            attribution="compact"
            fallback={<RoutePreview stops={plan.stops ?? []} maxStops={2} />}
          />
        ) : (
          <RoutePreview stops={plan.stops ?? []} maxStops={2} />
        )}
      </div>
      <div className={styles.body}>
        <h2 className={styles.title}>
          <Link href={route}>{plan.title}</Link>
        </h2>
        {plan.description ? (
          <p className={styles.excerpt}>{plan.description}</p>
        ) : null}
        <div className={styles.meta}>
          <span>
            <Icon name="clock" size={15} />
            {formatDuration(plan.estimatedTotalDuration)}
          </span>
          {plan.peopleCount ? (
            <span>
              <Icon name="users" size={15} />
              {plan.peopleCount}{" "}
              {plan.peopleCount === 1 ? "persona" : "personas"}
            </span>
          ) : null}
          <span>{planCostLabel(plan)}</span>
        </div>
        {plan.inspiredBy ? (
          <InspiredByChip
            plan={plan.inspiredBy}
            creatorUsername={plan.inspiredBy.creatorUsername}
            returnTo={ROUTES.community}
          />
        ) : null}
        <Link
          className={styles.reviewSummary}
          href={`${route}#community-experiences`}
          aria-label={lived > 0
            ? `Ver ${lived} reseñas compartidas de este plan`
            : "Todavía no hay reseñas compartidas de este plan"}
        >
          {lived > 0 && plan.sharedAverageRating !== null && plan.sharedAverageRating !== undefined ? (
            <>
              <Stars rating={plan.sharedAverageRating} size={15} />
              <strong>{plan.sharedAverageRating.toFixed(1)} / 5</strong>
            </>
          ) : <span className={styles.noReviews}>Todavía sin reseñas</span>}
          {lived > 0 ? (
            <>
              <span>{pluralize(lived, "reseña", "reseñas")}</span>
              <Icon name="arrow-right" size={14} />
            </>
          ) : null}
        </Link>
        <div className={styles.actions}>
          <SavePlanButton id={plan.id} title={plan.title} />
          <SharePublicationButton
            path={planDetailRoute(plan.id)}
            title={plan.title}
          />
          <Link className={styles.openAction} href={route}>
            Ver plan <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function StoryCard({
  story,
  layout = "card",
}: {
  story: CommunityExperience;
  layout?: CardLayout;
}) {
  const { livedFrom, inspiredBy } = storyOrigins(story);
  const title = (livedFrom ?? inspiredBy)?.title ?? "Una salida para recordar";
  const author = story.author.username;
  return (
    <article
      className={`${styles.card} ${styles.story} ${layout === "wide" ? styles.wide : ""}`}
    >
      <header className={styles.publicationHead}>
        {author ? (
          <PersonLink
            username={author}
            avatarUrl={story.author.avatarUrl}
            size={40}
            note={
              story.completedAt
                ? `Salió el ${formatLongDate(story.completedAt)}`
                : "compartió una experiencia"
            }
          />
        ) : (
          <span className={styles.unknownAuthor}>{story.author.alias}</span>
        )}
        <Badge variant="success">Experiencia</Badge>
      </header>
      {story.photos[0] ? (
        <Link
          className={styles.cover}
          href={communityExperienceRoute(story.id)}
          aria-label={`Ver las fotos de ${author ? `@${author}` : story.author.alias}`}
        >
          <LazyImage
            url={story.photos[0].url}
            alt="Una foto de esta salida"
            width={960}
            height={720}
            loadingFallback={null}
            fallback={
              <span className={styles.unavailablePhoto} data-unavailable-photo>
                <Icon name="camera" size={17} />
                Esta foto no está disponible. Ver la experiencia
                <Icon name="arrow-right" size={16} />
              </span>
            }
          />
          <span className={styles.photoCount}>
            <Icon name="camera" size={14} />
            {story.photos.length}
          </span>
        </Link>
      ) : null}
      <div className={styles.body}>
        <h2 className={styles.storyTitle}>
          <Link href={communityExperienceRoute(story.id)}>{title}</Link>
        </h2>
        <Stars rating={story.rating} size={16} />
        {(story.visitCount ?? 1) > 1 ? (
          <span className={styles.reviewCount}>La hizo {story.visitCount} veces</span>
        ) : null}
        {story.comment ? (
          <blockquote className={styles.quote}>{story.comment}</blockquote>
        ) : (
          <p className={styles.excerpt}>
            Una experiencia compartida, en sus propias estrellas.
          </p>
        )}
        {story.tags.length ? (
          <div className={styles.tags}>
            {story.tags.map((tag) => (
              <Badge variant="tag" key={tag}>
                {FEEDBACK_TAG_LABELS[tag]}
              </Badge>
            ))}
          </div>
        ) : null}
        {livedFrom ? (
          <InspiredByChip
            plan={livedFrom}
            creatorUsername={livedFrom.creatorUsername}
            label="Vivida desde"
            returnTo={ROUTES.community}
          />
        ) : null}
        {inspiredBy ? (
          <InspiredByChip
            plan={inspiredBy}
            creatorUsername={inspiredBy.creatorUsername}
            returnTo={ROUTES.community}
          />
        ) : null}
        <div className={styles.actions}>
          <LikeExperienceButton
            id={story.id}
            title={title}
            initialCount={story.likeCount ?? 0}
            initiallyLiked={story.likedByViewer ?? false}
            isOwn={story.isOwn}
          />
          <SharePublicationButton
            path={communityExperienceRoute(story.id)}
            title={title}
          />
          <Link
            className={styles.openAction}
            href={communityExperienceRoute(story.id)}
          >
            Ver experiencia <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
