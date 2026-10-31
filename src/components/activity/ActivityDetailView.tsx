"use client";

import { useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";

import { AddToCollectionDialog } from "@/components/collection";
import { LocationPreview } from "@/components/explore";
import { AddToPlanDialog } from "@/components/plan";
import { categoryPresentation } from "@/components/preferences/categoryPresentation";
import {
  GooglePlaceContext,
  MediaGallery,
  RatingBadge,
} from "@/components/media";
import {
  Badge,
  Button,
  Icon,
  LoadingDots,
  Stars,
} from "@/components/ui";
import { useFavorites } from "@/context";
import { useDetailFetch } from "@/hooks";
import { getActivity } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import {
  activitySubtypePresentation,
  placeKindPresentation,
  seasonLabel,
} from "@/lib/catalog/taxonomy";
import {
  AT_HOME_LABEL,
  formatDuration,
  formatPrice,
  googleMapsUrl,
  isAtHomeActivity,
  isPriceUnknown,
  priceCaveat,
} from "@/lib/utils";

import { OccasionPills } from "./OccasionPills";
import type { ActivityDetailResult, PlaceDetailResult, RatingSummary } from "@/types";

import { ExploreDetailHeader } from "@/components/explore/ExploreDetailHeader";

import { ActivityRatingSection } from "./ActivityRatingSection";
import { RatingsList } from "./RatingsList";
import styles from "./activity.module.css";

export interface ActivityDetailViewProps {
  activityId: number;
  placeContext?: PlaceDetailResult;
  activityPicker?: ReactNode;
  initialAction?: "plan" | "collection";
}

type Tab = "info" | "ratings";

const GENERIC_ERROR = "No pudimos cargar la actividad. Intentá de nuevo.";

/**
 * Activity detail (CU14 · PAN 18), shared by activity and place routes.
 * Uses the Places photo and overlapping summary while keeping activity-based
 * favorites, collections, planning and ratings on the selected activity ID.
 *
 * "Guardar" handles real activity favorites (CU15) with optimistic updates.
 * "Agregar a plan" opens the real CU27 dialog.
 * "Colección" opens the real CU35 selector.
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
export function ActivityDetailView(props: ActivityDetailViewProps) {
  return <ActivityDetailContent key={props.activityId} {...props} />;
}

function ActivityDetailContent({ activityId, placeContext, activityPicker, initialAction }: ActivityDetailViewProps) {
  const { data: activity, status, errorMessage, refetch } = useDetailFetch<ActivityDetailResult>(
    getActivity,
    activityId,
    GENERIC_ERROR,
  );
  const { isActivitySaved, toggleSaveActivity } = useFavorites();
  const [tab, setTab] = useState<Tab>("info");
  const [showCollectionDialog, setShowCollectionDialog] = useState(initialAction === "collection");
  const [showPlanDialog, setShowPlanDialog] = useState(initialAction === "plan");
  // `null` until `RatingsList` fetches its own copy — see the rendering
  // below for the `activity.averageRating`/`ratingCount` fallback used
  // until then (CU47's "Recalculo del promedio").
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [ratingsRefreshToken, setRatingsRefreshToken] = useState(0);

  const saved = activity != null ? isActivitySaved(activity.id) : false;

  const handleToggleSave = () => {
    if (activity == null) return;
    toggleSaveActivity(activity.id).catch(() => {
      // Optimistic rollback handled in context
    });
  };

  if (status === "loading") {
    return (
      <div className={styles.stateBlock}>
        {activityPicker}
        <LoadingDots label="Cargando la actividad..." />
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className={styles.stateBlock}>
        {activityPicker}
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
        {activityPicker}
        <Icon name="triangle-alert" size={32} className={styles.errorIcon} />
        <h1 className="sp-h3">Algo salió mal</h1>
        <p className="sp-body">{errorMessage}</p>
        <Button variant="secondary" onClick={refetch}>Reintentar</Button>
      </div>
    );
  }

  const categoriesText =
    activity.categories.length > 0
      ? activity.categories
          .map(
            (category) =>
              categoryPresentation({
                id: category.id,
                name: category.name,
                description: null,
              }).label,
          )
          .join(" · ")
      : null;
  const firstLocation = activity.locations.find((location) => location.place.id === placeContext?.id)
    ?? activity.locations[0] ?? null;
  const place = placeContext?.summary ?? activity.place;
  const displayRatingSummary: RatingSummary =
    ratingSummary ?? {
      averageRating: activity.averageRating ?? 0,
      ratingCount: activity.ratingCount,
    };
  const hasOwnRatings = displayRatingSummary.ratingCount > 0;
  // Games and plans at home have no address, map or distance (#210).
  const atHome = isAtHomeActivity(activity);
  const address = atHome ? null : (firstLocation?.place.address ?? null);
  const peopleText =
    activity.minPeople && activity.maxPeople
      ? activity.minPeople === activity.maxPeople
        ? `${activity.minPeople} personas`
        : `De ${activity.minPeople} a ${activity.maxPeople} personas`
      : activity.maxPeople
        ? `Hasta ${activity.maxPeople} personas`
        : activity.minPeople
          ? `Desde ${activity.minPeople} personas`
          : null;
  const subtype = activitySubtypePresentation(activity.type);
  const artwork =
    subtype.family !== "other"
      ? subtype
      : placeKindPresentation(activity.place?.kind);
  const season = seasonLabel(activity.availableMonths);
  const hasOwnImages = (activity.images?.length ?? 0) > 0;
  const plannable = activity.planEligible !== false;

  return (
    <div>
      <ExploreDetailHeader
        media={{
          ownImageUrl: activity.imageUrl,
          place: atHome || hasOwnImages ? null : place,
          alt: activity.name,
          artwork: { family: artwork.family, icon: artwork.icon, label: activity.typeLabel ?? null },
        }}
        heroAction={
          <button
            type="button"
            className={styles.heroBookmark}
            aria-pressed={saved}
            aria-label={saved ? "Quitar de guardados" : "Guardar actividad"}
            onClick={handleToggleSave}
          >
            <Icon name="bookmark" size={17} className={saved ? styles.heroBookmarkSaved : undefined} />
          </button>
        }
      >
        {activityPicker}
        <div className={styles.badgeRow}>
          {categoriesText ? (
            <Badge variant="tag">{categoriesText}</Badge>
          ) : (
            <Badge variant="tag">
              <em>Sin categoría</em>
            </Badge>
          )}
          {activity.typeLabel ? <Badge variant="tag">{activity.typeLabel}</Badge> : null}
          <RatingBadge
            averageRating={hasOwnRatings ? displayRatingSummary.averageRating : null}
            ratingCount={displayRatingSummary.ratingCount}
            externalRating={hasOwnRatings ? null : (firstLocation?.externalRating ?? place?.externalRating)}
            size={12}
          />
        </div>

        <h1 className={styles.title}>{activity.name}</h1>
        {activity.occasions?.length ? <OccasionPills occasions={activity.occasions} /> : null}
        {atHome ? (
          <p className={styles.placeLine}>
            <Badge variant="tag">
              <Icon name="house" size={11} aria-hidden="true" />
              En casa
            </Badge>{" "}
            {AT_HOME_LABEL}
          </p>
        ) : firstLocation ? (
          <p className={styles.placeLine}>
            En{" "}
            <a href="#activity-location" onClick={() => {
              // Mount the location before the browser follows the fragment.
              flushSync(() => setTab("info"));
            }}>{firstLocation.place.name}</a>
            {firstLocation.place.department?.name
              ? ` · ${firstLocation.place.department.name}`
              : ""}
          </p>
        ) : null}
        <GooglePlaceContext
          rating={null}
          price={isPriceUnknown(activity) ? (firstLocation?.externalPrice ?? place?.externalPrice) : null}
        />

        {atHome ? null : (
          <div className={styles.addressRow}>
            <Icon name="map-pin" size={14} className={styles.addressIcon} />
            {address ? (
              <span>{address}</span>
            ) : (
              <span className={styles.missing}>Sin información disponible</span>
            )}
          </div>
        )}
        {firstLocation && !atHome ? (
          <p className={styles.mapsLink}>
            <a href={googleMapsUrl(firstLocation.latitude, firstLocation.longitude, firstLocation.place.address)} target="_blank" rel="noopener noreferrer">
              <Icon name="external-link" size={13} aria-hidden="true" /> Ver en Google Maps (horarios, cómo llegar)
            </a>
          </p>
        ) : null}
        <div className={styles.detailActions}>
          <div className={styles.actionBarInner}>
            <Button
              variant={saved ? "secondary" : "ghostLight"}
              onClick={handleToggleSave}
            >
              <Icon name="bookmark" size={16} aria-hidden="true" />
              {saved ? "Guardada" : "Guardar"}
            </Button>
            <Button
              variant="primary"
              className={styles.actionBarPrimary}
              onClick={() => setShowPlanDialog(true)}
              disabled={!plannable}
              title={
                plannable
                  ? undefined
                  : "Todavía no podemos ubicar esta actividad con precisión para armar un plan."
              }
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

        {!plannable ? <p className={styles.costNote}>Esta actividad todavía no está disponible para agregar a un plan.</p> : null}
      </ExploreDetailHeader>

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
          <MediaGallery target="activity" resourceId={activity.id} resourceName={activity.name} />
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
                  <p className={styles.costValue}>
                    {formatPrice(activity, { withUnit: true })}
                  </p>
                  <p className={styles.costNote}>
                    {isPriceUnknown(activity)
                      ? "Todavía no tenemos un precio confirmado para esta actividad."
                      : (priceCaveat(activity) ?? "Precio en pesos argentinos (ARS)")}
                  </p>
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
                  {season ? (
                    <p className={styles.infoValue}>
                      Temporada: {season}
                      {activity.inSeason === false ? " (fuera de temporada ahora)" : ""}
                    </p>
                  ) : atHome ? (
                    <p className={styles.infoValue}>Cuando quieran: no necesita reserva.</p>
                  ) : (
                    <p className={styles.missing}>
                      Confirmá horarios y reserva con el lugar antes de ir.
                    </p>
                  )}
                </div>
              </div>

              {peopleText ? (
                <div className={styles.infoRow}>
                  <Icon name="users" size={15} className={styles.infoIcon} />
                  <div>
                    <p className={styles.infoLabel}>Cantidad de personas</p>
                    <p className={styles.infoValue}>{peopleText}</p>
                  </div>
                </div>
              ) : null}

              {activity.minAge != null ? (
                <div className={styles.infoRow}>
                  <Icon name="user" size={15} className={styles.infoIcon} />
                  <div>
                    <p className={styles.infoLabel}>Edad apta</p>
                    <p className={styles.infoValue}>
                      {activity.minAge === 0 ? "Para todas las edades" : `Desde ${activity.minAge} años`}
                    </p>
                  </div>
                </div>
              ) : null}

              {activity.materials?.length ? (
                <div className={styles.infoRow}>
                  <Icon name="list-checks" size={15} className={styles.infoIcon} />
                  <div>
                    <p className={styles.infoLabel}>Qué necesitan</p>
                    <p className={styles.infoValue}>{activity.materials.join(" · ")}</p>
                  </div>
                </div>
              ) : null}

              {activity.rulesRef ? (
                <div className={styles.infoRow}>
                  <Icon name="book-open" size={15} className={styles.infoIcon} />
                  <div>
                    <p className={styles.infoLabel}>Reglas</p>
                    <p className={styles.infoValue}>
                      <a href={activity.rulesRef} target="_blank" rel="noopener noreferrer">
                        Ver de dónde salen las reglas
                      </a>
                    </p>
                  </div>
                </div>
              ) : null}

              <div className={`${styles.infoRow} ${styles.infoRowLast}`}>
                <Icon name="tag" size={15} className={styles.infoIcon} />
                <div>
                  <p className={styles.infoLabel}>Categoría</p>
                  {categoriesText ? (
                    <p className={styles.infoValue}>{categoriesText}</p>
                  ) : (
                    <p className={styles.missing}>Sin información disponible</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {firstLocation && !atHome ? (
            <div className={styles.section} id="activity-location">
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
              <p className={styles.ratingBig}>
                {hasOwnRatings ? displayRatingSummary.averageRating.toFixed(1) : "—"}
              </p>
              {hasOwnRatings ? (
                <Stars rating={displayRatingSummary.averageRating} size={14} />
              ) : null}
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

      {showPlanDialog && plannable ? (
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
