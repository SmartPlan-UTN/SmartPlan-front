"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { GenerationState } from "@/components/home/GenerationState";
import { PlanResults } from "@/components/home/PlanResults";
import { ResultsHeader } from "@/components/home/ResultsHeader";
import { usePlanRequestPolling } from "@/hooks";
import { ROUTES, planRequestRoute } from "@/lib/routes";
import { refinePlanRequest } from "@/lib/api";
import { carryRequestContext } from "@/lib/plans/requestContext";
import type { PlanRequestContext, RefinePlanRequestPayload } from "@/types";
import { RefinementChips, StopAdjustments } from "./PlanRefinementActions";

import styles from "./plan-request.module.css";

export function PlanRequestScreen({ requestId }: { requestId: number }) {
  return <PlanRequestBody requestId={requestId} />;
}

function PlanRequestBody({ requestId }: { requestId: number }) {
  const router = useRouter();
  const planning = usePlanRequestPolling(requestId);
  const [refining, setRefining] = useState(false);
  const [refinementError, setRefinementError] = useState<string | null>(null);
  const refinementPending = useRef(false);

  useEffect(() => {
    if (planning.planRequestId == null || planning.planRequestId === requestId)
      return;
    router.push(planRequestRoute(planning.planRequestId));
  }, [planning.planRequestId, requestId, router]);

  // A new sentence is interpreted on its own: what was inferred from the
  // previous one must not leak into this one. Only context the person
  // chose explicitly travels with it.
  const lastContext: PlanRequestContext | undefined =
    planning.lastSubmission?.kind === "auto"
      ? planning.lastSubmission.payload.context
      : undefined;

  const search = useCallback(
    (query: string) => {
      if (!query.trim()) return;
      planning.submit({ query: query.trim(), context: lastContext });
    },
    [planning, lastContext],
  );

  const addContext = useCallback(
    (context: Partial<PlanRequestContext>) => {
      const query = planning.query?.trim();
      if (!query) return;
      planning.submit({ query, context: { ...lastContext, ...context } });
    },
    [planning, lastContext],
  );

  const goHome = useCallback(() => router.push(ROUTES.home), [router]);
  // Free or about $6000 per person (as the back closes plans at home).
  const context = planning.resolvedContext;
  const canAddHomeGame = Boolean(
    context &&
      (context.freeOnly ||
        (context.budget !== null && context.budget / Math.max(1, context.partySize ?? 1) <= 6000)),
  );
  async function refine(payload: RefinePlanRequestPayload) {
    if (refinementPending.current) return;
    refinementPending.current = true;
    setRefining(true);
    setRefinementError(null);
    try {
      const accepted = await refinePlanRequest(requestId, payload);
      carryRequestContext(requestId, accepted.id);
      router.push(planRequestRoute(accepted.id));
    } catch {
      setRefinementError(
        "No pudimos ajustar este plan. Tu recorrido sigue disponible; podés volver a intentar.",
      );
      refinementPending.current = false;
      setRefining(false);
    }
  }

  const plans =
    planning.phase === "generated" && planning.plans?.length
      ? planning.plans
      : null;
  const generated = plans !== null;
  const failed =
    planning.phase === "failed" ||
    planning.phase === "idle" ||
    (planning.phase === "generated" && !plans);

  return (
    <section className={styles.page} aria-label="Búsqueda de planes">
      <ResultsHeader
        query={planning.query ?? ""}
        understanding={planning.understanding}
        thinking={!generated && !failed}
        onBack={goHome}
        onSearch={search}
        onAddContext={addContext}
      />

      {plans ? (
        <div className={styles.resultsContent}>
          {refining ? (
            <p role="status" className={styles.refiningNote}>
              Ajustando la recomendación…
            </p>
          ) : null}
          {refinementError ? (
            <p role="alert" className={styles.refiningNote}>
              {refinementError}
            </p>
          ) : null}
          {plans.length ? (
            <PlanResults
              returnTo={planRequestRoute(requestId)}
              plans={plans}
              communityRecommendations={planning.communityRecommendations}
              query={planning.query}
              resolvedContext={planning.resolvedContext}
              understanding={planning.understanding}
              funnel={planning.funnel}
              unsupportedExperiences={planning.unsupportedExperiences}
              mode={planning.mode === "surprise" ? "surprise" : "auto"}
              hideHeader
              canAdjust={false}
              onAdjust={goHome}
              onDiscard={goHome}
              onRegenerate={planning.regenerate}
              onPlanSelected={planning.applySelectionChange}
              onSelectionReconcile={planning.refresh}
              renderRefinement={(plan) =>
                plan.insight ? (
                  <>
                    <RefinementChips
                      plan={plan}
                      canAddHomeGame={canAddHomeGame}
                      busy={refining}
                      onRefine={(payload) => void refine(payload)}
                    />
                    {plan.details.length > 1 ? (
                      <StopAdjustments
                        plan={plan}
                        busy={refining}
                        onRefine={(payload) => void refine(payload)}
                      />
                    ) : null}
                  </>
                ) : null
              }
            />
          ) : null}
        </div>
      ) : (
        <div className={styles.waitContent}>
          <GenerationState
            phase={
              failed || planning.phase === "idle" ? "failed" : planning.phase
            }
            failure={
              planning.failure ?? {
                code: null,
                message:
                  "No pudimos recuperar esta búsqueda. Podés volver al inicio y probar otra vez.",
              }
            }
            onKeepWaiting={planning.keepWaiting}
            onRetry={planning.retry}
            onDiscard={goHome}
            canRetry={Boolean(planning.lastSubmission)}
            mode={planning.mode === "surprise" ? "surprise" : "auto"}
            query={planning.query}
            progressStage={planning.progressStage}
            unsupportedExperiences={planning.unsupportedExperiences}
          />
        </div>
      )}
    </section>
  );
}
