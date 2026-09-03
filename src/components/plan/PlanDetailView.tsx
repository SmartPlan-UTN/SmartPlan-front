"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Badge,
  Button,
  ConfirmationDialog,
  Divider,
  FloatingBackLink,
  Icon,
  LoadingDots,
  Stars,
} from "@/components/ui";
import { useDetailFetch } from "@/hooks";
import { useFavorites } from "@/context";
import { useSession } from "@/lib/auth";
import { getPlan, getOwnPlan, cancelOwnPlan, ApiError } from "@/lib/api";
import { activityDetailRoute, planEditRoute, ROUTES } from "@/lib/routes";
import { formatArs, formatDuration, googleMapsUrl } from "@/lib/utils";
import type {
  OwnPlanDetail,
  PlanDetailResult,
  PlanItineraryItem,
} from "@/types";

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
 * Plan detail (CU13, CU26, CU29 · PAN 17), after
 * SmartPlanSystemDesign/v2/PlanDetail.jsx: a timeline itinerary, a dark
 * cost breakdown card, and a non-sticky action row (the mockup keeps it in
 * normal flow, unlike ActivityDetail.jsx's fixed one).
 *
 * The mockup opens on a 300px photo of the place. There are no photos in
 * the catalog, and standing in a flat gradient with an oversized icon in
 * the middle spent a third of the first screenful saying nothing, so the
 * header is sized to its own content and sits on the app's wave background
 * instead. That also frees the back pill from tracking a dark hero.
 *
 * The mockup's social-proof strip ("312 personas hicieron este plan · 97%
 * lo recomiendan") is fabricated demo data with no backend behind it —
 * there's no "people who did this plan" tracking in the contract, so it's
 * left out rather than invented. "Lo quiero hacer" needs CU22 (out of
 * scope), so it stays disabled; "Compartir" is real — it copies the page
 * URL.
 *
 * The owner-only actions (CU25's "Editar plan", CU26's "Cancelar plan")
 * hang off `isOwner`, not off the plan itself: this screen reads from
 * `GET /plans/:id`, which is public and returns the same projection to
 * everyone, with no owner field to compare against. Probing
 * `GET /users/me/plans/:id` is the only way to tell ownership apart under
 * the current contract — it 403/404s for a plan that isn't yours.
 */
export function PlanDetailView({ planId }: PlanDetailViewProps) {
  const router = useRouter();
  const { data: plan, status, errorMessage } = useDetailFetch<PlanDetailResult>(
    getPlan,
    planId,
    GENERIC_ERROR,
  );
  const { authenticated } = useSession();
  const { isPlanSaved, toggleSavePlan } = useFavorites();
  const saved = isPlanSaved(planId);
  const [copied, setCopied] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [ownPlan, setOwnPlan] = useState<OwnPlanDetail | null>(null);

  // Ownership probe (CU25, CU26): see the note above the component.
  useEffect(() => {
    // No reset on the anonymous branch: `isOwner` is only ever read
    // through `isPlanOwner` below, which already folds in `authenticated`,
    // so a logout hides the actions without a synchronous setState here.
    if (!authenticated) return;

    let active = true;
    getOwnPlan(planId)
      .then((data) => {
        if (active) {
          setIsOwner(true);
          setOwnPlan(data);
        }
      })
      .catch(() => {
        if (active) {
          setIsOwner(false);
          setOwnPlan(null);
        }
      });

    return () => {
      active = false;
    };
  }, [authenticated, planId]);

  // Cancellation state (CU26)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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

  async function handleConfirmCancel() {
    setIsCancelling(true);
    setCancelError(null);
    try {
      await cancelOwnPlan(planId);
      setShowCancelModal(false);
      router.push(ROUTES.plans);
    } catch (error: unknown) {
      setIsCancelling(false);
      const message =
        error instanceof ApiError
          ? error.message
          : "No pudimos eliminar el plan. Intentá de nuevo.";
      setCancelError(message);
    }
  }

  if (status === "loading") {
    return (
      <div className={activityStyles.stateBlock}>
        <LoadingDots label="Cargando el plan..." />
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

  const isCancelled = plan.status?.key === "cancelled";
  const isPlanOwner = authenticated && isOwner;
  const routeSummary = plan.details
    .map((detail) => detail.activity.name)
    .join(" → ");

  return (
    <div>
      <FloatingBackLink href={ROUTES.explore} label="Volver" />

      <header className={styles.planHeader}>
        <div className={styles.planHeaderMeta}>
          <Stars rating={plan.averageRating} size={14} />
          <span>{plan.averageRating.toFixed(1)}</span>
          <span className={styles.planMetaDot}>·</span>
          <span>{formatDuration(plan.estimatedTotalDuration)}</span>
          <Badge variant="cost" className={styles.planCostBadge}>
            {formatArs(plan.estimatedTotalCost)}
          </Badge>
        </div>

        <h1 className={styles.planTitle}>{plan.title}</h1>

        {routeSummary ? (
          <p className={styles.planRoute}>
            <Icon name="map-pin" size={14} aria-hidden="true" />
            {routeSummary}
          </p>
        ) : null}
      </header>

      <div className={styles.content}>
        {isCancelled && (
          <div className={styles.cancelledBanner}>
            <Icon name="triangle-alert" size={20} />
            <div>
              <strong>Plan cancelado:</strong> Este plan se encuentra
              conservado como historial de lectura y no acepta modificaciones.
            </div>
          </div>
        )}

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
                <span className={styles.costRowLabel}>
                  {detail.activity.name}
                </span>
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
          {ownPlan && ownPlan.peopleCount > 0 ? (
            <div className={styles.costPerPersonRow}>
              <span className={styles.costRowLabel}>
                Costo por persona ({ownPlan.peopleCount}{" "}
                {ownPlan.peopleCount === 1 ? "persona" : "personas"})
              </span>
              <span className={styles.costRowValue}>
                {formatArs(ownPlan.estimatedCostPerPerson)}
              </span>
            </div>
          ) : null}
        </div>

        <div className={styles.actionBar}>
          {isPlanOwner && !isCancelled && (
            <>
              <Link
                href={planEditRoute(planId)}
                style={{ textDecoration: "none", display: "flex", flex: 1 }}
              >
                <Button variant="ghostLight" size="sm" style={{ width: "100%" }}>
                  <Icon name="pencil" size={14} aria-hidden="true" />
                  Editar plan
                </Button>
              </Link>

              <Button
                variant="ghostLight"
                size="sm"
                style={{ flex: 1 }}
                onClick={() => setShowCancelModal(true)}
              >
                <Icon name="trash-2" size={14} aria-hidden="true" />
                Eliminar plan
              </Button>
            </>
          )}

          <Button
            variant={saved ? "secondary" : "ghostLight"}
            size="sm"
            className={styles.actionFlex1}
            aria-pressed={saved}
            aria-label={saved ? "Quitar de guardados" : "Guardar plan"}
            onClick={() => {
              toggleSavePlan(planId).catch(() => {
                // Optimistic rollback handled in FavoritesContext
              });
            }}
          >
            <Icon name="bookmark" size={14} aria-hidden="true" />
            {saved ? "¡Guardado!" : "Guardar plan"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={styles.actionShare}
            onClick={() => {
              void handleShare();
            }}
          >
            <Icon name="share-2" size={14} aria-hidden="true" />
            {copied ? "¡Copiado!" : "Compartir"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            className={styles.actionFlex2}
            disabled
            title="Próximamente"
          >
            Lo quiero hacer →
          </Button>
      </div>
      </div>

      {/* Explicit Delete Confirmation Dialog (CU26) */}
      {showCancelModal && (
        <ConfirmationDialog
          title="¿Eliminar este plan?"
          confirmLabel="Sí, eliminar plan"
          confirmingLabel="Eliminando..."
          cancelLabel="Volver"
          isConfirming={isCancelling}
          error={cancelError}
          onCancel={() => setShowCancelModal(false)}
          onConfirm={() => {
            void handleConfirmCancel();
          }}
        >
          <p>
            El plan se eliminará de tus planes y ya no estará disponible.
          </p>
        </ConfirmationDialog>
      )}
    </div>
  );
}
