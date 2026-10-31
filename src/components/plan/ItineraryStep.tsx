import Link from "next/link";

import { Badge, Icon } from "@/components/ui";
import { RatingBadge } from "@/components/media/RatingBadge";
import { categoryLabel as labelCategory } from "@/lib/utils/catalogLabels";
import {
  isHomeStop,
  stopCoordinates,
  stopCaveats,
  stopClock,
  stopEvidence,
  stopHref,
  stopLabel,
  stopPlace,
  stopScreening,
} from "@/lib/plans/stops";
import { AT_HOME_LABEL, formatDuration, googleMapsUrl, formatPrice, priceCaveat } from "@/lib/utils";
import type { PlanItineraryItem } from "@/types";

import styles from "./plan.module.css";

/**
 * One stop of a plan's timeline itinerary (CU13), shared by the plan detail
 * and an outing's detail (#130). A stop is a catalog activity or the
 * intrinsic action of a place ("Cena en Anna Bistró"); when the planner
 * placed it on a time, it shows the time, the leg from the previous stop,
 * the evidence behind its price and what is still unconfirmed.
 */
export function ItineraryStep({
  detail,
  isFirst,
  isLast,
  previousDetail,
}: {
  detail: PlanItineraryItem;
  isFirst: boolean;
  isLast: boolean;
  previousDetail?: PlanItineraryItem;
}) {
  const { activity } = detail;
  const atHome = isHomeStop(detail);
  const homeLegWithoutPosition =
    (atHome && !stopCoordinates(detail)) ||
    Boolean(previousDetail && isHomeStop(previousDetail) && !stopCoordinates(previousDetail));
  const place = stopPlace(detail);
  const label = stopLabel(detail);
  const href = stopHref(detail);
  const clock = stopClock(detail);
  const evidence = stopEvidence(detail);
  const caveats = stopCaveats(detail);
  const savedPriceCaveat = detail.price
    ? priceCaveat({ estimatedCost: detail.estimatedCost, price: detail.price })
    : null;
  if (savedPriceCaveat && !caveats.includes(savedPriceCaveat)) {
    caveats.push(savedPriceCaveat);
  }
  const screening = stopScreening(detail);
  const screeningUrl = screening?.bookingUrl ?? screening?.sourceUrl;
  const sourceUrl = detail.price?.sourceRef && /^https?:\/\//.test(detail.price.sourceRef)
    ? detail.price.sourceRef : null;
  const leg = detail.stop?.legTravelMinutes ?? null;
  const categoriesText =
    activity && activity.categories.length > 0
      ? activity.categories.map((category) => labelCategory(category.name)).join(" · ")
      : (place?.kindLabel ?? null);

  return (
    <div className={styles.stepRow}>
      <div className={styles.stepTimeline}>
        <span
          className={`${styles.stepLine} ${!isFirst ? styles.stepLineVisible : ""}`}
        />
        <span className={styles.stepBadge}>{detail.order}</span>
        <span
          className={`${styles.stepLine} ${!isLast ? styles.stepLineVisible : ""}`}
        />
      </div>

      {/* The whole card is a target via a stretched `Link` overlay, so it
          stays keyboard- and screen-reader-accessible. "Ver en mapa", a real
          external link, sits above the overlay so it keeps its own click. */}
      <div className={styles.stepCard}>
        {href ? (
          <Link
            href={href}
            className={styles.stepStretchedLink}
            aria-label={`Ver ${label}`}
          />
        ) : null}

        <div className={styles.stepBody}>
          <div className={styles.stepBadgeRow}>
            {clock ? <span className={styles.stepTime}>{clock}</span> : null}
            {categoriesText ? <Badge variant="tag">{categoriesText}</Badge> : null}
            {activity ? (
              <span className={styles.stepRating}>
                <RatingBadge
                  averageRating={activity.averageRating}
                  ratingCount={activity.ratingCount}
                />
              </span>
            ) : null}
          </div>

          <p className={styles.stepName}>{label}</p>

          <div className={styles.stepMetaRow}>
            {atHome || place?.address ? (
              <span className={styles.stepMetaItem}>
                <Icon name={atHome ? "house" : "map-pin"} size={13} />
                {atHome ? AT_HOME_LABEL : place?.address}
              </span>
            ) : null}
            <span className={styles.stepMetaItem}>
              <Icon name="clock" size={13} />
              {formatDuration(detail.estimatedDuration)}
            </span>
            {!isFirst && !homeLegWithoutPosition && leg != null && leg > 0 ? (
              <span className={styles.stepMetaItem}>
                <Icon name="car" size={13} />
                {`${leg} min desde la anterior`}
              </span>
            ) : null}
          </div>

          {screening ? (
            <div className={styles.stepCinemaMeta}>
              <span>
                {[
                  screening.format,
                  screening.language,
                  screening.room,
                ].filter(Boolean).join(" · ") || "Función de cine"}
                {screening.observedAt
                  ? ` · cartelera consultada ${new Intl.DateTimeFormat("es-AR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(screening.observedAt))}`
                  : " · horario publicado por el cine"}
              </span>
              {screeningUrl ? (
                <a
                  href={screeningUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.stepCinemaLink}
                >
                  Ver función y entradas
                  <Icon name="external-link" size={12} aria-hidden="true" />
                </a>
              ) : null}
            </div>
          ) : null}

          {evidence.length ? (
            <p className={styles.stepEvidence}>{evidence.join(" · ")}</p>
          ) : null}
          {caveats.length ? (
            <p className={styles.stepCaveat}>
              <Icon name="info" size={12} aria-hidden="true" />
              {caveats.join(" · ")}
            </p>
          ) : null}
        </div>

        <div className={styles.stepActions}>
          <p className={styles.stepCost}>{formatPrice(detail, { withUnit: true })}</p>

          <div className={styles.stepLinks}>
            {sourceUrl ? (
              <a href={sourceUrl} target="_blank" rel="noreferrer" className={styles.stepMapLink}>
                {atHome ? "Ver fuente de la actividad" : "Ver precio publicado"}
              </a>
            ) : null}
            {place && !atHome ? (
              <a
                href={googleMapsUrl(
                  place.latitude,
                  place.longitude,
                  [place.name, place.address].filter(Boolean).join(", "),
                  place.googlePlaceId,
                )}
                target="_blank"
                rel="noreferrer"
                className={styles.stepMapLink}
              >
                <Icon name="map-pin" size={13} aria-hidden="true" />
                Ver en mapa
              </a>
            ) : null}
            {href ? (
              <span className={styles.stepDetailHint}>
                Ver detalle
                <Icon name="chevron-right" size={12} aria-hidden="true" />
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
