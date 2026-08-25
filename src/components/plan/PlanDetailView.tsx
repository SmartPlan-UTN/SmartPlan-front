"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import { Badge, Button, Divider, FloatingBackLink, Icon, Stars } from "@/components/ui";
import { useDetailFetch } from "@/hooks";
import { getPlan } from "@/lib/api";
import { activityDetailRoute, ROUTES } from "@/lib/routes";
import { formatArs, formatDuration, googleMapsUrl } from "@/lib/utils";
import type { PlanDetailResult, PlanItineraryItem } from "@/types";

import styles from "./plan.module.css";
import activityStyles from "../activity/activity.module.css";

export interface PlanDetailViewProps {
  planId: number;
}

const GENERIC_ERROR = "No pudimos cargar el plan. Intentá de nuevo.";

function ItineraryStep({
  detail,
  isFirst,
  isLast,
}: {
  detail: PlanItineraryItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { activity } = detail;
  const location = activity.locations[0] ?? null;
  const categoryLabel =
    activity.categories.length > 0
      ? activity.categories.map((category) => category.name).join(" · ")
      : null;

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

      {/* The whole card is a target — matches PlanDetail.jsx's
          card-wide onClick — via a stretched `Link` overlay instead of a
          click handler on a `<div>`, so it stays keyboard- and
          screen-reader-accessible. "Ver en mapa", a real external link,
          sits above the overlay so it keeps its own click. */}
      <div className={styles.stepCard}>
        <Link
          href={activityDetailRoute(activity.id)}
          className={styles.stepStretchedLink}
          aria-label={`Ver ${activity.name}`}
        />

        <div>
          <div className={styles.stepBadgeRow}>
            {categoryLabel ? <Badge variant="tag">{categoryLabel}</Badge> : null}
            <span className={styles.stepRating}>
              <Stars rating={activity.averageRating} size={11} />
              <span>{activity.averageRating.toFixed(1)}</span>
            </span>
          </div>

          <p className={styles.stepName}>{activity.name}</p>

          <div className={styles.stepMetaRow}>
            {location ? (
              <span className={styles.stepMetaItem}>
                <Icon name="map-pin" size={13} />
                {location.place.address}
              </span>
            ) : null}
            <span className={styles.stepMetaItem}>
              <Icon name="clock" size={13} />
              {formatDuration(detail.estimatedDuration)}
            </span>
          </div>
        </div>

        <div className={styles.stepActions}>
          <p className={styles.stepCost}>{formatArs(detail.estimatedCost)}</p>

          <div className={styles.stepLinks}>
            {location ? (
              <a
                href={googleMapsUrl(
                  location.latitude,
                  location.longitude,
                  location.place.address,
                )}
                target="_blank"
                rel="noreferrer"
                className={styles.stepMapLink}
              >
                <Icon name="map-pin" size={13} aria-hidden="true" />
                Ver en mapa
              </a>
            ) : null}
            <span className={styles.stepDetailHint}>
              Ver detalle
              <Icon name="chevron-right" size={12} aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Plan detail (CU13 · PAN 17), matching
 * SmartPlanSystemDesign/v2/PlanDetail.jsx: a full-bleed dark hero, a
 * timeline itinerary, a dark cost breakdown card, and a non-sticky action
 * row (the mockup keeps it in normal flow, unlike ActivityDetail.jsx's
 * fixed one).
 *
 * The mockup's social-proof strip ("312 personas hicieron este plan · 97%
 * lo recomiendan") and per-person cost split are fabricated demo numbers
 * with no backend behind them — there's no "people who did this plan"
 * tracking or party-size field in the contract, so both are left out
 * rather than inventing data. "Lo quiero hacer" needs CU22 (out of scope
 * here), so it's disabled; "Compartir" is real — it copies the page URL.
 */
export function PlanDetailView({ planId }: PlanDetailViewProps) {
  const { data: plan, status, errorMessage } = useDetailFetch<PlanDetailResult>(
    getPlan,
    planId,
    GENERIC_ERROR,
  );
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // Clipboard access can be denied by the browser; the button just
      // stays as "Compartir" instead of throwing at the user.
    }
  }

  if (status === "loading") {
    return (
      <div className={activityStyles.stateBlock}>
        <div className={activityStyles.loadingDots}>
          <span className={activityStyles.loadingDot} />
          <span className={activityStyles.loadingDot} />
          <span className={activityStyles.loadingDot} />
        </div>
        <p className="sp-body">Cargando el plan...</p>
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className={activityStyles.stateBlock}>
        <Icon name="inbox" size={32} className={activityStyles.stateIcon} />
        <h1 className="sp-h3">No encontramos este plan</h1>
        <p className="sp-body">Puede que ya no esté disponible.</p>
        <Link href={ROUTES.explore} className={activityStyles.backLink}>
          <Icon name="arrow-left" size={14} aria-hidden="true" />
          Volver a explorar
        </Link>
      </div>
    );
  }

  if (status === "error" || plan == null) {
    return (
      <div className={activityStyles.stateBlock} role="alert">
        <Icon name="triangle-alert" size={32} className={activityStyles.errorIcon} />
        <h1 className="sp-h3">Algo salió mal</h1>
        <p className="sp-body">{errorMessage}</p>
      </div>
    );
  }

  const routeSummary = plan.details
    .map((detail) => detail.activity.name)
    .join(" → ");

  return (
    <div>
      <FloatingBackLink href={ROUTES.explore} label="Volver" heroRef={heroRef} />

      <div className={styles.hero} ref={heroRef}>
        <Icon name="route" size={110} className={styles.heroIcon} />
        <Badge variant="cost" className={styles.heroCostBadge}>
          {formatArs(plan.estimatedTotalCost)}
        </Badge>

        <div className={styles.heroTitleBlock}>
          <div className={styles.heroMetaRow}>
            <Stars rating={plan.averageRating} size={14} />
            <span>{plan.averageRating.toFixed(1)}</span>
            <span className={styles.heroMetaDot}>·</span>
            <span>{formatDuration(plan.estimatedTotalDuration)}</span>
          </div>
          <h1 className={styles.heroTitle}>{plan.title}</h1>
          {routeSummary ? (
            <div className={styles.heroLocation}>
              <Icon name="map-pin" size={14} />
              {routeSummary}
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.content}>
        {plan.description ? (
          <p className={`sp-body-lg ${activityStyles.detailDescription}`}>
            {plan.description}
          </p>
        ) : null}

        <div className={styles.section}>
          <p className={activityStyles.sectionLabel}>itinerario</p>
          {plan.details.map((detail, index) => (
            <ItineraryStep
              detail={detail}
              isFirst={index === 0}
              isLast={index === plan.details.length - 1}
              key={detail.id}
            />
          ))}
        </div>

        <div className={styles.costBox}>
          <p className={styles.costBoxLabel}>estimación de costos</p>
          <div className={styles.costBreakdown}>
            {plan.details.map((detail) => (
              <div className={styles.costRow} key={detail.id}>
                <span className={styles.costRowLabel}>{detail.activity.name}</span>
                <span className={styles.costRowValue}>
                  {formatArs(detail.estimatedCost)}
                </span>
              </div>
            ))}
          </div>
          <Divider dark />
          <div className={styles.costTotalRow}>
            <span className={styles.costRowLabel}>Total</span>
            <span className={styles.costTotalValue}>
              {formatArs(plan.estimatedTotalCost)}
            </span>
          </div>
        </div>

        <div className={styles.actionBar}>
          <Button
            variant={saved ? "secondary" : "ghostLight"}
            className={styles.actionFlex1}
            onClick={() => {
              setSaved((current) => !current);
            }}
          >
            <Icon name="bookmark" size={16} aria-hidden="true" />
            {saved ? "¡Guardado!" : "Guardar plan"}
          </Button>
          <Button
            variant="ghost"
            className={styles.actionShare}
            onClick={() => {
              void handleShare();
            }}
          >
            <Icon name="share-2" size={16} aria-hidden="true" />
            {copied ? "¡Copiado!" : "Compartir"}
          </Button>
          <Button
            variant="primary"
            className={styles.actionFlex2}
            disabled
            title="Próximamente"
          >
            Lo quiero hacer →
          </Button>
        </div>
      </div>
    </div>
  );
}
