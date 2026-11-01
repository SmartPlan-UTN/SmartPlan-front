"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Badge,
  Button,
  ConfirmationDialog,
  Divider,
  FloatingBackLink,
  Icon,
  Stars,
} from "@/components/ui";
import { MediaGallery } from "@/components/media";
import { PlanVisual } from "@/components/home/PlanVisual";
import { useContentReporter } from "@/components/reports";
import { useFavorites } from "@/context";
import { useDetailFetch, usePlanSelection } from "@/hooks";
import {
  ApiError,
  cancelOwnPlan,
  copyGeneratedPlan,
  getOwnPlan,
  getPlan,
} from "@/lib/api";
import { useSession } from "@/lib/auth";
import {
  loginRoute,
  outingDetailRoute,
  planDetailRoute,
  planEditRoute,
  ROUTES,
} from "@/lib/routes";
import { isHomePlan, stopLabel } from "@/lib/plans/stops";
import {
  formatDuration,
  formatPrice,
  formatPlanTotal,
  formatPerPerson,
} from "@/lib/utils";
import type {
  OwnPlanDetail,
  PlanDetailResult,
  PlanVisibility,
  ViewerPlanState,
} from "@/types";

import { PlanOwnExperiences } from "./PlanOwnExperiences";
import { PlanAdaptations } from "../community/PlanAdaptations";
import { CommunityExperiences } from "./CommunityExperiences";
import { ItineraryStep } from "./ItineraryStep";
import { InspiredByChip } from "../community/InspiredByChip";
import { PersonLink } from "../community/Person";
import { useCommunityReturnPath } from "../community/useCommunityReturnPath";
import { PlanReadinessPanel } from "./PlanReadinessPanel";
import { PlanUncertainties } from "./PlanUncertainties";
import { PlanIntentionPanel } from "./PlanIntentionPanel";
import {
  PlanVisibilityBadge,
  PlanVisibilityControl,
} from "./PlanVisibilityControl";
import { PLAN_SELECTION } from "./planSelectionContent";
import { planShareMessage } from "./shareMessage";
import { planStatusPresentation } from "./statusPresentation";
import { VISIBILITY_COPY } from "./visibilityContent";
import styles from "./plan.module.css";
import communityStyles from "../community/community.module.css";
import activityStyles from "../activity/activity.module.css";

export interface PlanDetailViewProps {
  planId: number;
  returnTo?: string;
}

const GENERIC_ERROR = "No pudimos cargar el plan. Intentá de nuevo.";

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
 * rather than inventing data. "Lo voy a hacer" is CU22 — a one-shot action
 * that copies the plan into an outing of "Mis salidas" (`POST
 * /users/me/outings`), shown only when the caller can choose the plan; once
 * done it reads "Agregado a Mis salidas" (#130). "Compartir" is real — it
 * copies the page URL — and a published plan can also be sent by WhatsApp:
 * its page opens without a session, which is only needed to act on it.
 *
 * The author of a plan also gets its visibility (Público/Privado) and can
 * publish it or make it private. An outing is not a plan to browse: its
 * owner is sent to its page in Mis salidas.
 *
 * Anyone else can report a published plan (#156). Unlike other content it
 * stays visible: only an administrator takes it down.
 */
export function PlanDetailView(props: PlanDetailViewProps) {
  const { status, user } = useSession();
  // Session changes discard private data, pending reads and personal overrides
  // together, before the new viewer's detail is loaded.
  return (
    <PlanDetailContent
      key={`${props.planId}:${status}:${user?.id ?? "anonymous"}`}
      {...props}
    />
  );
}

function PlanDetailContent({
  planId,
  returnTo: initialReturnTo = ROUTES.explore,
}: PlanDetailViewProps) {
  const communityReturnTo = useCommunityReturnPath();
  const returnTo =
    initialReturnTo === ROUTES.community ? communityReturnTo : initialReturnTo;
  const router = useRouter();
  const pathname = usePathname();
  const backLabel = returnTo.startsWith(`${ROUTES.planRequests}/`)
    ? "Volver a los resultados"
    : "Volver";
  const { status: sessionStatus } = useSession();
  const {
    data: plan,
    status,
    errorMessage,
    refetch,
  } = useDetailFetch<PlanDetailResult>(
    getPlan,
    planId,
    GENERIC_ERROR,
    sessionStatus !== "loading",
  );
  const { isPlanSaved, toggleSavePlan } = useFavorites();
  const saved = isPlanSaved(planId);
  const [experienceVersion, setExperienceVersion] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [ownPlan, setOwnPlan] = useState<OwnPlanDetail | null>(null);
  const [visibilityOverride, setVisibilityOverride] =
    useState<PlanVisibility | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [reported, setReported] = useState(false);
  const reporter = useContentReporter(() => setReported(true));
  const heroRef = useRef<HTMLDivElement>(null);

  const isAuthor = plan?.ownedByViewer === true && plan.kind === "authored";

  // An outing has its own page, with its lifecycle and feedback.
  useEffect(() => {
    if (plan?.kind === "outing" && plan.ownedByViewer) {
      router.replace(outingDetailRoute(plan.id));
    }
  }, [plan, router]);

  // The author's projection carries the people count behind the per-person
  // cost; nobody else can read it.
  useEffect(() => {
    if (!isAuthor || plan == null) return;
    let active = true;
    getOwnPlan(plan.id)
      .then((own) => {
        if (active) setOwnPlan(own);
      })
      .catch(() => {
        // Keep the shared detail; the per-person cost just stays hidden.
      });
    return () => {
      active = false;
    };
  }, [isAuthor, plan]);

  // CU22. The outing is applied from the backend result, not optimistically;
  // `useDetailFetch` has no mutate, so a local override reflects it until the
  // next real load (a navigation back here re-reads the authoritative state).
  const selection = usePlanSelection();
  const [override, setOverride] = useState<{
    viewerPlanState: ViewerPlanState;
    activeOutingId: number | null;
  } | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  async function chooseOuting() {
    if (!plan || selection.status === "working") return;
    setLiveMessage("");

    const outcome = await selection.choose(plan.id);
    if (!outcome) return;

    if (outcome.ok) {
      setOverride({
        viewerPlanState: "selected",
        activeOutingId: outcome.result.outing.id,
      });
      setLiveMessage(PLAN_SELECTION.announceAdded(plan.title));
      selection.reset();
      return;
    }

    if (outcome.error.reconcile) {
      // The plan moved on — reconcile from the server, drop the local override.
      setOverride(null);
      setLiveMessage(PLAN_SELECTION.error.reconciled);
      selection.reset();
      refetch();
    } else {
      // Network / unknown: nothing changed.
      setLiveMessage(PLAN_SELECTION.error.retry);
      selection.reset();
    }
  }

  function planUrl() {
    return new URL(planDetailRoute(planId), window.location.origin).href;
  }

  function handleWhatsAppShare(shared: PlanDetailResult) {
    const text = planShareMessage(shared, planUrl());
    // Straight to api.whatsapp.com: the wa.me redirect turns every emoji
    // into "�" on its way there.
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function handleShare() {
    setShareError(false);
    try {
      if (navigator.share) {
        await navigator.share({ title: plan?.title, url: planUrl() });
        return;
      }
      await navigator.clipboard.writeText(planUrl());
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareError(true);
    }
  }

  async function prepareForCommunity() {
    setPreparing(true);
    setPrepareError(null);
    try {
      const editable = await copyGeneratedPlan(planId);
      router.push(planDetailRoute(editable.id, ROUTES.plans));
    } catch {
      setPrepareError(
        "No pudimos preparar tu versión. Podés volver a intentar.",
      );
      setPreparing(false);
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
      setCancelError(
        error instanceof ApiError
          ? error.message
          : "No pudimos eliminar el plan. Intentá de nuevo.",
      );
    }
  }

  if (status === "loading" && plan == null) {
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
        <Link href={returnTo} className={activityStyles.backLink}>
          <Icon name="arrow-left" size={14} aria-hidden="true" />
          {backLabel}
        </Link>
      </div>
    );
  }

  if (status === "error" || plan == null) {
    return (
      <div className={activityStyles.stateBlock} role="alert">
        <Icon
          name="triangle-alert"
          size={32}
          className={activityStyles.errorIcon}
        />
        <h1 className="sp-h3">Algo salió mal</h1>
        <p className="sp-body">{errorMessage}</p>
      </div>
    );
  }

  const routeSummary = plan.details.map(stopLabel).join(" → ");

  const viewerPlanState = override?.viewerPlanState ?? plan.viewerPlanState;
  const activeOutingId =
    override?.activeOutingId ?? plan.activeOutingId ?? null;
  const visibility = visibilityOverride ?? plan.visibility;
  const statusInfo = planStatusPresentation(plan.status.key);
  const removedByModeration = ownPlan?.removedByModeration === true;
  const published =
    plan.kind === "authored" &&
    visibility === "public" &&
    plan.status.key !== "cancelled";
  const communityPlan = plan.kind === "authored" && visibility === "public";
  const communityPricesNeedConfirmation =
    communityPlan &&
    plan.details.some((detail) => detail.price?.stale === true);

  // A visitor to somebody else's public plan finds the actions at the top;
  // owners and private plans keep them after the itinerary.
  const communityVisitor = published && !plan.ownedByViewer;
  const actionBar = (
    <div className={styles.actionBar}>
      <div className={styles.actionMain}>
        {/* Personal state on the plan (CU22) — carries the visual weight. */}
        <PlanIntentionPanel
          viewerPlanState={viewerPlanState}
          activeOutingId={activeOutingId}
          busy={selection.status === "working"}
          onIntend={() => {
            // Someone who opened a shared link signs in first, then returns.
            if (sessionStatus === "anonymous") {
              router.push(loginRoute(pathname));
              return;
            }
            void chooseOuting();
          }}
        />
        {published && !plan.ownedByViewer ? (
          <Link
            href={`${ROUTES.createPlan}?inspiredBy=${plan.id}`}
            className={communityStyles.secondaryAction}
          >
            <Icon name="sparkles" size={16} aria-hidden="true" />
            Hacerlo a mi manera
          </Link>
        ) : null}
      </div>
      <div className={styles.actionQuiet}>
        {sessionStatus === "authenticated" &&
        isAuthor &&
        plan.status.key !== "cancelled" ? (
          <>
            <Link
              href={planEditRoute(planId)}
              className={styles.ownerActionLink}
            >
              <Icon name="pencil" size={16} aria-hidden="true" />
              Editar plan
            </Link>
            <Button
              variant="ghostLight"
              size="sm"
              className={styles.ownerActionButton}
              onClick={() => setShowCancelModal(true)}
            >
              <Icon name="trash-2" size={14} aria-hidden="true" />
              Eliminar plan
            </Button>
          </>
        ) : null}
        {/* Guardar + Compartir — secondary. Each control reserves its
                widest label so a state swap never changes its box. */}
        <Button
          variant="ghostLight"
          size="sm"
          className={styles.saveButton}
          aria-pressed={saved}
          aria-label={saved ? "Quitar de guardados" : "Guardar plan"}
          onClick={() => {
            // Optimistic rollback is handled inside FavoritesContext (CU43).
            void toggleSavePlan(planId).catch(() =>
              setLiveMessage(
                "No pudimos guardar el plan. Podés volver a intentar.",
              ),
            );
          }}
        >
          <Icon
            name="bookmark"
            size={16}
            aria-hidden="true"
            className={saved ? styles.saveIconOn : undefined}
          />
          {saved ? "Guardado" : "Guardar plan"}
        </Button>
        {published ? (
          <Button
            variant="ghostLight"
            size="sm"
            className={styles.shareButton}
            onClick={() => {
              void handleShare();
            }}
          >
            <Icon name="share-2" size={16} aria-hidden="true" />
            {copied ? "¡Copiado!" : "Compartir"}
          </Button>
        ) : null}
        {shareError ? (
          <label className={styles.shareFallback}>
            Copiá el enlace
            <input
              aria-label="Enlace para compartir"
              value={planUrl()}
              readOnly
              onFocus={(event) => event.target.select()}
            />
          </label>
        ) : null}
        {/* Only a published plan opens for whoever gets the link. */}
        {published ? (
          <Button
            variant="ghostLight"
            size="sm"
            className={styles.shareButton}
            aria-label="Compartir por WhatsApp"
            onClick={() => handleWhatsAppShare(plan)}
          >
            <Icon name="message-circle" size={16} aria-hidden="true" />
            WhatsApp
          </Button>
        ) : null}
        {published && !plan.ownedByViewer && sessionStatus !== "loading" ? (
          <Button
            variant="ghostLight"
            size="sm"
            className={styles.shareButton}
            disabled={reported}
            aria-label={
              reported ? "Plan denunciado" : `Denunciar ${plan.title}`
            }
            onClick={() => {
              // Reporting needs a session; come back here after it.
              if (sessionStatus === "anonymous") {
                router.push(loginRoute(pathname));
                return;
              }
              reporter.request({
                contentType: "plan",
                contentId: plan.id,
                title: "Denunciar plan",
              });
            }}
          >
            <Icon name="flag" size={16} aria-hidden="true" />
            {reported ? "Denunciado" : "Denunciar"}
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div>
      <FloatingBackLink href={returnTo} label={backLabel} heroRef={heroRef} />

      <p className={styles.srOnly} role="status" aria-live="polite">
        {liveMessage}
      </p>

      <div className={styles.hero} ref={heroRef}>
        <div className={styles.heroMedia}>
          <PlanVisual key={plan.id} plan={plan} />
        </div>
        <Badge variant="cost" className={styles.heroCostBadge}>
          {communityPricesNeedConfirmation
            ? "Precios a confirmar"
            : formatPlanTotal(plan)}
        </Badge>

        <div className={styles.heroTitleBlock}>
          <div className={styles.heroMetaRow}>
            {statusInfo ? (
              <>
                <span className={styles.heroStatus}>{statusInfo.label}</span>
                <span className={styles.heroMetaDot}>·</span>
              </>
            ) : null}
            {plan.averageRating > 0 ? (
              <>
                <Stars rating={plan.averageRating} size={14} />
                <span>{plan.averageRating.toFixed(1)}</span>
              </>
            ) : (
              <span>Sin reseñas</span>
            )}
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
        {plan.author || plan.inspiredBy ? (
          <div className={styles.provenance}>
            {plan.author ? (
              <PersonLink
                username={plan.author.username}
                avatarUrl={plan.author.avatarUrl}
                size={36}
                note={published ? "Compartió este plan" : undefined}
              />
            ) : null}
            {plan.inspiredBy ? (
              <InspiredByChip
                plan={plan.inspiredBy}
                creatorUsername={plan.inspiredBy.creatorUsername}
              />
            ) : null}
          </div>
        ) : null}
        {communityVisitor ? actionBar : null}
        {plan.status.key === "cancelled" ? (
          <div className={styles.cancelledBanner} role="status">
            <Icon name="triangle-alert" size={20} aria-hidden="true" />
            <div>
              <strong>Plan cancelado:</strong> Este plan se conserva como
              historial de lectura y no acepta modificaciones.
            </div>
          </div>
        ) : null}
        {plan.description ? (
          <p className={`sp-body-lg ${activityStyles.detailDescription}`}>
            {plan.description}
          </p>
        ) : null}

        {plan.readiness ? (
          <PlanReadinessPanel readiness={plan.readiness} atHome={isHomePlan(plan)} />
        ) : null}
        <PlanUncertainties insight={plan.insight} />

        <MediaGallery
          target="plan"
          resourceId={plan.id}
          resourceName={plan.title}
        />
        <div className={styles.section}>
          <p className={activityStyles.sectionLabel}>itinerario</p>
          {plan.details.map((detail, index) => (
            <ItineraryStep
              detail={detail}
              previousDetail={plan.details[index - 1]}
              isFirst={index === 0}
              isLast={index === plan.details.length - 1}
              key={detail.id}
            />
          ))}
        </div>

        <div className={styles.costBox}>
          <p className={styles.costBoxLabel}>
            {communityPlan ? "referencias de costos" : "estimación de costos"}
          </p>
          {communityPlan ? (
            <p className="sp-small">
              Este plan conserva los valores registrados al compartirlo.
              Confirmá precios y horarios antes de salir.
            </p>
          ) : null}
          <div className={styles.costBreakdown}>
            {plan.details.map((detail) => (
              <div className={styles.costRow} key={detail.id}>
                <span className={styles.costRowLabel}>{stopLabel(detail)}</span>
                <span className={styles.costRowValue}>
                  {formatPrice(detail, { withUnit: true })}
                </span>
              </div>
            ))}
          </div>
          <Divider dark />
          <div className={styles.costTotalRow}>
            <span className={styles.costRowLabel}>Total</span>
            <span className={styles.costTotalValue}>
              {communityPricesNeedConfirmation
                ? "Valores a confirmar"
                : formatPlanTotal(plan)}
            </span>
          </div>
          {ownPlan && ownPlan.peopleCount > 0 ? (
            <div className={styles.costPerPersonRow}>
              <span className={styles.costRowLabel}>
                Costo por persona ({ownPlan.peopleCount}{" "}
                {ownPlan.peopleCount === 1 ? "persona" : "personas"})
              </span>
              <span className={styles.costRowValue}>
                {formatPerPerson(ownPlan.estimatedCostPerPerson)}
              </span>
            </div>
          ) : null}
        </div>

        {plan.kind !== "outing" ? (
          <PlanOwnExperiences
            key={plan.id}
            planId={plan.id}
            onChanged={() => {
              setExperienceVersion((version) => version + 1);
              refetch();
            }}
          />
        ) : null}

        {/* Experiences of people who did it (#106): only a published plan
            that is still on has a community to show. */}
        {published ? (
          <>
            <CommunityExperiences
              key={experienceVersion}
              planId={plan.id}
              planTitle={plan.title}
            />
            <PlanAdaptations planId={plan.id} />
          </>
        ) : null}

        {plan.kind === "generated" && plan.ownedByViewer ? (
          <section
            className={styles.visibilityBox}
            aria-label="Compartir este recorrido"
          >
            <div>
              <h2 className="sp-h4">¿Este plan merece compartirse?</h2>
              <p className={styles.visibilityHint}>
                Prepará tu versión, revisala y elegí si querés publicarla en
                Comunidad. Se guarda privada hasta que vos decidas.
              </p>
            </div>
            <Button
              variant="ghostEmber"
              disabled={preparing}
              onClick={() => void prepareForCommunity()}
            >
              {preparing ? "Preparando…" : "Preparar para compartir"}
            </Button>
            {prepareError ? <p role="alert">{prepareError}</p> : null}
          </section>
        ) : null}
        {isAuthor ? (
          <div className={styles.visibilityBox}>
            <div>
              <PlanVisibilityBadge
                visibility={visibility}
                removedByModeration={removedByModeration}
              />
              <p className={styles.visibilityHint}>
                {removedByModeration
                  ? VISIBILITY_COPY.removed.hint
                  : VISIBILITY_COPY.hint[visibility]}
              </p>
            </div>
            {plan.status.key !== "cancelled" && !removedByModeration ? (
              <PlanVisibilityControl
                planId={plan.id}
                planTitle={plan.title}
                visibility={visibility}
                onChanged={(next) => {
                  setVisibilityOverride(next);
                  setLiveMessage(VISIBILITY_COPY.announce[next]);
                }}
              />
            ) : null}
          </div>
        ) : null}

        {communityVisitor ? null : actionBar}
      </div>

      {showCancelModal ? (
        <ConfirmationDialog
          title="¿Eliminar este plan?"
          confirmLabel="Sí, eliminar plan"
          confirmingLabel="Eliminando..."
          cancelLabel="Volver"
          isConfirming={isCancelling}
          error={cancelError}
          onCancel={() => setShowCancelModal(false)}
          onConfirm={() => void handleConfirmCancel()}
        >
          <p>El plan se eliminará de tus planes y ya no estará disponible.</p>
        </ConfirmationDialog>
      ) : null}

      {reporter.element}
    </div>
  );
}
