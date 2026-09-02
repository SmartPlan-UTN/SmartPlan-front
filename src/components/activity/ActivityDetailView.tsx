"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import { AddToCollectionDialog } from "@/components/collection";
import { LocationPreview } from "@/components/explore";
import { AddToPlanDialog } from "@/components/plan";
import {
  Badge,
  Button,
  FloatingBackLink,
  Icon,
  LoadingDots,
  Stars,
} from "@/components/ui";
import { useDetailFetch } from "@/hooks";
import { getActivity } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { formatArs, formatDuration } from "@/lib/utils";
import type { ActivityDetailResult, RatingSummary } from "@/types";

import { ActivityRatingSection } from "./ActivityRatingSection";
import { RatingsList } from "./RatingsList";
import styles from "./activity.module.css";

export interface ActivityDetailViewProps {
  activityId: number;
}

type Tab = "info" | "ratings";

const GENERIC_ERROR = "No pudimos cargar la actividad. Intentá de nuevo.";

/**
 * Activity detail (CU14 · PAN 18), matching
 * SmartPlanSystemDesign/v2/ActivityDetail.jsx: dark hero, title block, an
 * Información/Valoraciones tab bar, a details card that shows "Sin
 * información disponible" for fields the catalog doesn't have (opening
 * hours — there's no such field in the schema), a decorative map preview
 * linking out to Google Maps, and a sticky action bar.
 *
 * "Guardar" mirrors the mockup exactly: a local, unpersisted toggle. CU15
 * (real favorites) isn't part of this delivery, so "Agregar a plan" remains
 * disabled. "Colección" opens the real CU35 selector.
 *
 * The Valoraciones tab's `ActivityRatingSection` (CU44 writing a rating,
 * CU46 editing it, CU47 deleting it — see its own doc comment for why none
 * of the three has a mockup to follow) sits above `RatingsList` (CU45,
 * reading them — real pagination, since the mockup's own "ver todas" just
 * reveals three hardcoded objects already in memory).
 *
 * `ratingSummary`/`ratingsRefreshToken` exist purely for CU47's "Recalculo
 * del promedio": the average/count shown here (both in this tab and in the
 * title block's badge, above the tabs) starts from `activity.averageRating`/
 * `ratingCount` — the snapshot `getActivity` returned on load — and is
 * replaced by `RatingsList`'s own fetch the moment it resolves, which
 * `ActivityRatingSection` forces a fresh one of after any create/edit/
 * delete. `SmartPlan-back` stays the only source of truth for the number;
 * nothing here computes it client-side.
 */
export function ActivityDetailView({ activityId }: ActivityDetailViewProps) {
  const { data: activity, status, errorMessage } = useDetailFetch<ActivityDetailResult>(
    getActivity,
    activityId,
    GENERIC_ERROR,
  );
  const [tab, setTab] = useState<Tab>("info");
  const [saved, setSaved] = useState(false);
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  // `null` until `RatingsList` fetches its own copy — see the rendering
  // below for the `activity.averageRating`/`ratingCount` fallback used
  // until then (CU47's "Recalculo del promedio").
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [ratingsRefreshToken, setRatingsRefreshToken] = useState(0);

  if (status === "loading") {
    return (
      <div className={styles.stateBlock}>
        <LoadingDots label="Cargando la actividad..." />
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className={styles.stateBlock}>
        <Icon name="inbox" size={32} className={styles.stateIcon} />
        <h1 className="sp-h3">No encontramos esta actividad</h1>
        <p className="sp-body">Puede que ya no esté disponible.</p>
        <Link href={ROUTES.explore} className={styles.backLink}>
          <Icon name="arrow-left" size={14} aria-hidden="true" />
          Volver a explorar
        </Link>
      </div>
    );
  }

  if (status === "error" || activity == null) {
    return (
      <div className={styles.stateBlock} role="alert">
        <Icon name="triangle-alert" size={32} className={styles.errorIcon} />
        <h1 className="sp-h3">Algo salió mal</h1>
        <p className="sp-body">{errorMessage}</p>
      </div>
    );
  }

  const categoryLabel =
    activity.categories.length > 0
      ? activity.categories.map((category) => category.name).join(" · ")
      : null;
  const firstLocation = activity.locations[0] ?? null;
  const displayRatingSummary: RatingSummary =
    ratingSummary ?? {
      averageRating: activity.averageRating,
      ratingCount: activity.ratingCount,
    };
  const address = firstLocation?.place.address ?? null;

  return (
    <div>
      <FloatingBackLink href={ROUTES.explore} label="Volver" heroRef={heroRef} />

      <div className={styles.hero} ref={heroRef}>
        <Icon name="route" size={90} className={styles.heroIcon} />
        <span className={styles.heroBadge}>Sin imagen disponible</span>
        <button
          type="button"
          className={styles.heroBookmark}
          aria-pressed={saved}
          aria-label={saved ? "Quitar de guardados" : "Guardar actividad"}
          onClick={() => {
            setSaved((current) => !current);
          }}
        >
          <Icon name="bookmark" size={17} className={saved ? styles.heroBookmarkSaved : undefined} />
        </button>
      </div>

      <div className={styles.titleBlock}>
        <div className={styles.badgeRow}>
          {categoryLabel ? (
            <Badge variant="tag">{categoryLabel}</Badge>
          ) : (
            <Badge variant="tag">
              <em>Sin categoría</em>
            </Badge>
          )}
          <span className={styles.ratingSummary}>
            <Stars rating={displayRatingSummary.averageRating} size={12} />
            <span className="sp-small">
              {displayRatingSummary.averageRating.toFixed(1)}
              {displayRatingSummary.ratingCount > 0
                ? ` · ${displayRatingSummary.ratingCount.toLocaleString("es-AR")} valoraciones`
                : ""}
            </span>
          </span>
        </div>

        <h1 className={styles.title}>{activity.name}</h1>

        <div className={styles.addressRow}>
          <Icon name="map-pin" size={14} className={styles.addressIcon} />
          {address ? (
            <span>{address}</span>
          ) : (
            <span className={styles.missing}>Sin información disponible</span>
          )}
        </div>
      </div>

      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tabButton} ${tab === "info" ? styles.tabButtonActive : ""}`}
          onClick={() => {
            setTab("info");
          }}
        >
          Información
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${tab === "ratings" ? styles.tabButtonActive : ""}`}
          onClick={() => {
            setTab("ratings");
          }}
        >
          Valoraciones
        </button>
      </div>

      {tab === "info" ? (
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <p className={styles.sectionLabel}>descripción</p>
            <p className="sp-body">{activity.description}</p>
          </div>

          <div className={styles.section}>
            <p className={styles.sectionLabel}>detalles</p>
            <div className={styles.detailsCard}>
              <div className={styles.infoRow}>
                <Icon name="wallet" size={15} className={styles.infoIcon} />
                <div>
                  <p className={styles.infoLabel}>Costo</p>
                  <p className={styles.costValue}>{formatArs(activity.estimatedCost)}</p>
                  <p className={styles.costNote}>Precio estimado por persona · ARS</p>
                </div>
              </div>

              <div className={styles.infoRow}>
                <Icon name="clock" size={15} className={styles.infoIcon} />
                <div>
                  <p className={styles.infoLabel}>Duración estimada</p>
                  <p className={styles.infoValue}>
                    {formatDuration(activity.estimatedDuration)}
                  </p>
                </div>
              </div>

              <div className={styles.infoRow}>
                <Icon name="calendar" size={15} className={styles.infoIcon} />
                <div>
                  <p className={styles.infoLabel}>Horarios y disponibilidad</p>
                  <p className={styles.missing}>Sin información disponible</p>
                </div>
              </div>

              <div className={`${styles.infoRow} ${styles.infoRowLast}`}>
                <Icon name="tag" size={15} className={styles.infoIcon} />
                <div>
                  <p className={styles.infoLabel}>Categoría</p>
                  {categoryLabel ? (
                    <p className={styles.infoValue}>{categoryLabel}</p>
                  ) : (
                    <p className={styles.missing}>Sin información disponible</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {firstLocation ? (
            <div className={styles.section}>
              <p className={styles.sectionLabel}>ubicación</p>
              <LocationPreview
                latitude={firstLocation.latitude}
                longitude={firstLocation.longitude}
                address={firstLocation.place.address}
                title={activity.name}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className={styles.tabContent}>
          <div className={styles.ratingSummaryCard}>
            <div className={styles.ratingBigBlock}>
              <p className={styles.ratingBig}>{displayRatingSummary.averageRating.toFixed(1)}</p>
              <Stars rating={displayRatingSummary.averageRating} size={14} />
              <p className={styles.ratingCountNote}>
                {displayRatingSummary.ratingCount > 0
                  ? `${displayRatingSummary.ratingCount.toLocaleString("es-AR")} valoraciones`
                  : "Sin valoraciones aún"}
              </p>
            </div>
          </div>

          <ActivityRatingSection
            activityId={activity.id}
            onChange={() => setRatingsRefreshToken((token) => token + 1)}
          />

          <RatingsList
            activityId={activity.id}
            refreshToken={ratingsRefreshToken}
            onSummaryChange={setRatingSummary}
          />
        </div>
      )}

      <div className={styles.actionBar}>
        <div className={styles.actionBarInner}>
          <Button
            variant={saved ? "secondary" : "ghostLight"}
            onClick={() => {
              setSaved((current) => !current);
            }}
          >
            <Icon name="bookmark" size={16} aria-hidden="true" />
            {saved ? "Guardada" : "Guardar"}
          </Button>
          <Button
            variant="primary"
            className={styles.actionBarPrimary}
            onClick={() => setShowPlanDialog(true)}
          >
            <Icon name="plus" size={16} aria-hidden="true" />
            Agregar a plan
          </Button>
          <Button
            variant="ghostLight"
            onClick={() => setShowCollectionDialog(true)}
          >
            <Icon name="folder-plus" size={16} aria-hidden="true" />
            Colección
          </Button>
        </div>
      </div>

      {showPlanDialog ? (
        <AddToPlanDialog
          activityId={activity.id}
          activityName={activity.name}
          onClose={() => setShowPlanDialog(false)}
        />
      ) : null}

      {showCollectionDialog ? (
        <AddToCollectionDialog
          activityId={activity.id}
          activityName={activity.name}
          onClose={() => setShowCollectionDialog(false)}
        />
      ) : null}
    </div>
  );
}
