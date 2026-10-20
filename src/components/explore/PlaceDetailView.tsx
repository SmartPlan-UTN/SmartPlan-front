"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { GooglePlaceContext, RatingBadge } from "@/components/media";
import { Badge, Button, Icon, LoadingDots } from "@/components/ui";
import { useFavorites } from "@/context";
import { useDetailFetch } from "@/hooks";
import { ensurePlaceVisit, getPlaceDetail } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { placeKindPresentation } from "@/lib/catalog/taxonomy";
import { loginRoute, placeDetailRoute, ROUTES } from "@/lib/routes";
import { formatDuration, formatPrice } from "@/lib/utils";
import type { PlaceDetailResult } from "@/types";

import { ActivityDetailView } from "@/components/activity/ActivityDetailView";
import { ExploreDetailHeader } from "./ExploreDetailHeader";

import { LocationPreview } from "./LocationPreview";
import activityStyles from "../activity/activity.module.css";
import styles from "./explore.module.css";

const GENERIC_ERROR = "No pudimos cargar el lugar. Intentá de nuevo.";

/** A Google Maps link built from the identity link SmartPlan may keep. */
function googleMapsUrl(name: string, googlePlaceId: string): string {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", name);
  url.searchParams.set("query_place_id", googlePlaceId);
  return url.toString();
}

/**
 * A place's page: what it is, where it is, its live attributed context, and
 * the real activities SmartPlan knows happen there. A place without verified
 * activities says so plainly instead of inventing one.
 */
export function PlaceDetailView({ placeId }: { placeId: number }) {
  const { data: place, status, errorMessage } = useDetailFetch<PlaceDetailResult>(
    getPlaceDetail,
    placeId,
    GENERIC_ERROR,
  );

  if (status === "loading") {
    return (
      <div className={activityStyles.stateBlock}>
        <LoadingDots label="Cargando el lugar..." />
      </div>
    );
  }

  if (status === "not-found") {
    return (
      <div className={activityStyles.stateBlock}>
        <Icon name="inbox" size={32} className={activityStyles.stateIcon} />
        <h1 className="sp-h3">No encontramos este lugar</h1>
        <Link href={ROUTES.explore} className={activityStyles.backLink}>
          <Icon name="arrow-left" size={14} aria-hidden="true" />
          Volver a explorar
        </Link>
      </div>
    );
  }

  if (status === "error" || place == null) {
    return (
      <div className={activityStyles.stateBlock} role="alert">
        <Icon name="triangle-alert" size={32} className={activityStyles.errorIcon} />
        <h1 className="sp-h3">Algo salió mal</h1>
        <p className="sp-body">{errorMessage}</p>
      </div>
    );
  }

  return <PlaceDetailContent key={place.id} place={place} />;
}

function PlaceDetailContent({ place }: { place: PlaceDetailResult }) {
  const [selectedActivityId, setSelectedActivityId] = useState(
    () => place.activities.find((activity) => activity.planEligible)?.id ?? place.activities[0]?.id,
  );
  const [initialAction, setInitialAction] = useState<"plan" | "collection">();
  const [tab, setTab] = useState<"info" | "ratings">("info");

  if (selectedActivityId !== undefined) {
    return (
      <ActivityDetailView
        activityId={selectedActivityId}
        placeContext={place}
        initialAction={initialAction}
        activityPicker={place.activities.length > 1 ? (
          <div className={styles.activityPicker}>
            <label htmlFor="place-activity">Qué hacer en {place.name}</label>
            <select id="place-activity" value={selectedActivityId} onChange={(event) => setSelectedActivityId(Number(event.target.value))}>
              {place.activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name} · {formatDuration(activity.estimatedDuration)} · {formatPrice({ estimatedCost: null, price: activity.price })}
                </option>
              ))}
            </select>
          </div>
        ) : undefined}
      />
    );
  }

  const summary = place.summary;
  const presentation = placeKindPresentation(place.kind);

  return (
    <div className={styles.placeDetail}>
      <ExploreDetailHeader media={{
        place: summary,
        alt: `Foto de ${place.name}`,
        artwork: { family: presentation.family, icon: presentation.icon, label: place.kindLabel },
      }}>
        <div className={activityStyles.badgeRow}>
          {place.kindLabel ? <Badge variant="tag">{place.kindLabel}</Badge> : null}
          <RatingBadge externalRating={summary?.externalRating} size={12} />
        </div>
        <h1 className={activityStyles.title}>{place.name}</h1>
        <p className={activityStyles.placeLine}>
          {[place.address, place.department.name].filter(Boolean).join(" · ")}
        </p>
        <GooglePlaceContext rating={null} price={summary?.externalPrice} />
        {summary?.googlePlaceId ? (
          <p className={styles.placeMapsLink}>
            <a
              href={googleMapsUrl(place.name, summary.googlePlaceId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="external-link" size={13} aria-hidden="true" /> Ver en Google
              Maps (horarios, cómo llegar)
            </a>
          </p>
        ) : null}
        <PlaceVisitActions placeId={place.id} onReady={(activityId, action) => {
          setInitialAction(action);
          setSelectedActivityId(activityId);
        }} />
      </ExploreDetailHeader>

      <div className={activityStyles.tabBar}>
        <button type="button" className={`${activityStyles.tabButton} ${tab === "info" ? activityStyles.tabButtonActive : ""}`} onClick={() => setTab("info")}>
          Información
        </button>
        <button type="button" className={`${activityStyles.tabButton} ${tab === "ratings" ? activityStyles.tabButtonActive : ""}`} onClick={() => setTab("ratings")}>
          Valoraciones
        </button>
      </div>

      {tab === "info" ? <div className={activityStyles.tabContent}>
      {place.description ? (
        <div className={activityStyles.section}>
          <p className={activityStyles.sectionLabel}>sobre el lugar</p>
          <p className="sp-body">{place.description}</p>
        </div>
      ) : null}

      <div className={activityStyles.section}>
        <p className={activityStyles.sectionLabel}>visitar este lugar</p>
        <p className={styles.placeNoActivities}>
          Podés agregar una visita por cuenta propia a tu plan. No incluye una
          experiencia guiada ni una reserva. El costo está a confirmar y la
          duración de una hora es orientativa. Consultá horarios y acceso con el lugar antes de ir.
        </p>
      </div>

      <div className={activityStyles.section}>
        <p className={activityStyles.sectionLabel}>detalles de la visita</p>
        <div className={activityStyles.detailsCard}>
          <div className={activityStyles.infoRow}>
            <Icon name="wallet" size={15} className={activityStyles.infoIcon} />
            <div>
              <p className={activityStyles.infoLabel}>Costo</p>
              <p className={activityStyles.costValue}>Precio no disponible</p>
              <p className={activityStyles.costNote}>Confirmá el costo de acceso y los consumos con el lugar.</p>
            </div>
          </div>
          <div className={`${activityStyles.infoRow} ${activityStyles.infoRowLast}`}>
            <Icon name="clock" size={15} className={activityStyles.infoIcon} />
            <div>
              <p className={activityStyles.infoLabel}>Duración estimada</p>
              <p className={activityStyles.infoValue}>1h · Orientativa para una visita por cuenta propia</p>
            </div>
          </div>
        </div>
      </div>

      {summary && summary.latitude !== null && summary.longitude !== null ? (
        <div className={activityStyles.section}>
          <p className={activityStyles.sectionLabel}>ubicación</p>
          <LocationPreview
            latitude={summary.latitude}
            longitude={summary.longitude}
            address={place.address}
            title={place.name}
          />
        </div>
      ) : null}
      </div> : (
        <div className={activityStyles.tabContent}>
          <div className={activityStyles.ratingSummaryCard}>
            <p className={activityStyles.ratingCountNote}>Sin valoraciones de visitas aún</p>
            <p className={styles.placeNoActivities}>Podés contar tu experiencia después de realizar la visita desde Mis salidas.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceVisitActions({ placeId, onReady }: {
  placeId: number;
  onReady: (activityId: number, action?: "plan" | "collection") => void;
}) {
  const router = useRouter();
  const { authenticated, status } = useSession();
  const { isActivitySaved, toggleSaveActivity } = useFavorites();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function openVisit(action: "save" | "plan" | "collection") {
    if (inFlight.current) return;
    if (!authenticated) {
      router.push(loginRoute(placeDetailRoute(placeId)));
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const { activityId } = await ensurePlaceVisit(placeId);
      if (action === "save" && !isActivitySaved(activityId)) await toggleSaveActivity(activityId);
      onReady(activityId, action === "save" ? undefined : action);
    } catch {
      setError("No pudimos preparar la visita. Intentá de nuevo.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  const disabled = pending || status === "loading";
  return (
    <div className={activityStyles.detailActions}>
      <div className={activityStyles.actionBarInner} aria-busy={pending}>
        <Button variant="ghostLight" disabled={disabled} onClick={() => { void openVisit("save"); }}>
          <Icon name="bookmark" size={16} aria-hidden="true" /> Guardar
        </Button>
        <Button variant="primary" className={activityStyles.actionBarPrimary} disabled={disabled} onClick={() => { void openVisit("plan"); }}>
          <Icon name="plus" size={16} aria-hidden="true" /> Agregar a plan
        </Button>
        <Button variant="ghostLight" disabled={disabled} onClick={() => { void openVisit("collection"); }}>
          <Icon name="folder-plus" size={16} aria-hidden="true" /> Colección
        </Button>
      </div>
      {pending ? <p className={activityStyles.costNote} role="status">Preparando visita…</p> : null}
      {error ? <p className={styles.filterError} role="alert">{error}</p> : null}
    </div>
  );
}
