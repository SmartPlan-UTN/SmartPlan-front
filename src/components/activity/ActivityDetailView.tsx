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
import type { ActivityDetailResult } from "@/types";

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
            <Stars rating={activity.averageRating} size={12} />
            <span className="sp-small">
              {activity.averageRating.toFixed(1)}
              {activity.ratingCount > 0
                ? ` · ${activity.ratingCount.toLocaleString("es-AR")} valoraciones`
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
              <p className={styles.ratingBig}>{activity.averageRating.toFixed(1)}</p>
              <Stars rating={activity.averageRating} size={14} />
              <p className={styles.ratingCountNote}>
                {activity.ratingCount > 0
                  ? `${activity.ratingCount.toLocaleString("es-AR")} valoraciones`
                  : "Sin valoraciones aún"}
              </p>
            </div>
          </div>

          <div className={styles.reviewsEmptyState}>
            <Icon name="message-circle" size={32} className={styles.stateIcon} />
            <p className="sp-body">Todavía no hay reseñas para mostrar en detalle.</p>
          </div>
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
