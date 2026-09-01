"use client";

import { useEffect, useState } from "react";

import { Pagination } from "@/components/explore";
import { Icon, LoadingDots, Stars } from "@/components/ui";
import { listRatings } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type { PublicRating } from "@/types";

import styles from "./activity.module.css";

export interface RatingsListProps {
  activityId: number;
}

type LoadStatus = "loading" | "loaded" | "error";

/**
 * CU45 - View ratings (PAN 18): the "reseñas de SmartPlan" list on the
 * Valoraciones tab, per the v2 system design's `ActivityDetail.jsx`
 * (`ReviewCard`, "Ver todas las reseñas (N)"). The mockup's own reviews are
 * three hardcoded objects, so "ver todas" there is just revealing
 * client-side array items already in memory — with a real, potentially
 * large list, the issue itself asks for real pagination instead
 * ("Paginacion"), so this reuses `Pagination` (`components/explore`), the
 * same "no design reference draws this, follow the design system" prev/
 * next control CU9/CU12's results already use for the same reason.
 *
 * Every card uses the same ember avatar treatment as `ProfileForm`'s own
 * avatar, not a color per reviewer: the mockup's varied per-review colors
 * are demo flourish with no real per-user color anywhere in the backend
 * contract, and inventing one — even deterministically — isn't worth it
 * for a detail nobody asked for.
 *
 * The prototype's star-distribution bars (5★...1★ with a percentage each)
 * and "valoraciones externas" (Google Maps/TripAdvisor) section are left
 * out: neither is in the issue's scope ("Promedio y cantidad total" is
 * the summary card above this list, already built for CU44), and neither
 * has backing data — `RatingSummaryDto` has no per-star breakdown, and
 * there's no external-ratings integration.
 */
export function RatingsList({ activityId }: RatingsListProps) {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [ratings, setRatings] = useState<PublicRating[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setStatus("loading");
      try {
        const result = await listRatings(activityId, { page });
        if (ignore) return;
        setRatings(result.data);
        setTotalPages(result.pagination.totalPages);
        setStatus("loaded");
      } catch {
        if (!ignore) {
          setStatus("error");
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [activityId, page]);

  if (status === "loading" && ratings.length === 0) {
    return (
      <div className={styles.reviewsEmptyState}>
        <LoadingDots label="Cargando reseñas..." />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={styles.reviewsEmptyState} role="alert">
        <Icon name="triangle-alert" size={32} className={styles.errorIcon} />
        <p className="sp-body">No pudimos cargar las reseñas. Intentá de nuevo.</p>
      </div>
    );
  }

  if (ratings.length === 0) {
    return (
      <div className={styles.reviewsEmptyState}>
        <Icon name="message-circle" size={32} className={styles.stateIcon} />
        <p className="sp-body">Todavía no hay reseñas para mostrar en detalle.</p>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <p className={styles.sectionLabel}>reseñas de smartplan</p>

      {ratings.map((rating) => (
        <div className={styles.reviewCard} key={rating.id}>
          <div className={styles.reviewHeader}>
            <span className={styles.reviewAvatar} aria-hidden="true">
              {rating.authorAlias[0]?.toUpperCase()}
            </span>
            <div className={styles.reviewIdentity}>
              <p className={styles.reviewAuthor}>{rating.authorAlias}</p>
              <p className={styles.reviewDate}>{formatRelativeTime(rating.createdAt)}</p>
            </div>
            <Stars rating={rating.score} size={11} />
          </div>
          {rating.comment ? <p className={styles.reviewText}>{rating.comment}</p> : null}
        </div>
      ))}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        disabled={status === "loading"}
      />
    </div>
  );
}
