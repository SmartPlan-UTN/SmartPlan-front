"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { GenerationState } from "@/components/home/GenerationState";
import { PlanResults } from "@/components/home/PlanResults";
import { Button, Icon } from "@/components/ui";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { usePlanRequestPolling } from "@/hooks";
import { ROUTES, planRequestRoute } from "@/lib/routes";
import type { PlanRequestContext } from "@/types";

import styles from "./plan-request.module.css";

export function PlanRequestScreen({ requestId }: { requestId: number }) {
  return (
    <ProtectedRoute>
      <PlanRequestBody requestId={requestId} />
    </ProtectedRoute>
  );
}

function PlanRequestBody({ requestId }: { requestId: number }) {
  const router = useRouter();
  const planning = usePlanRequestPolling(requestId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const draftValue = draft ?? planning.query ?? "";

  useEffect(() => {
    if (planning.planRequestId == null || planning.planRequestId === requestId) return;
    router.push(planRequestRoute(planning.planRequestId));
  }, [planning.planRequestId, requestId, router]);

  const startNewSearch = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = draftValue.trim();
    if (!query) {
      inputRef.current?.focus();
      return;
    }

    const context: PlanRequestContext = {};
    if (planning.resolvedContext?.budget != null) context.budget = planning.resolvedContext.budget;
    if (planning.resolvedContext?.partySize != null) context.partySize = planning.resolvedContext.partySize;
    planning.submit({ query, context: Object.keys(context).length ? context : undefined });
  }, [draftValue, planning]);

  const goHome = useCallback(() => router.push(ROUTES.home), [router]);
  return (
    <section className={styles.page} aria-label="Búsqueda de planes">
      <header className={styles.searchBar}>
        <button type="button" className={styles.backLink} onClick={goHome} aria-label="Volver al inicio">
          <Icon name="arrow-left" size={18} aria-hidden="true" />
          <span>Inicio</span>
        </button>
        <form className={styles.searchForm} onSubmit={startNewSearch}>
          <Icon name="sparkles" size={17} aria-hidden="true" className={styles.searchIcon} />
          <input
            ref={inputRef}
            aria-label="Editar búsqueda"
            value={draftValue}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Contanos qué te gustaría hacer"
            maxLength={500}
          />
          <Button type="submit" size="sm" disabled={!draftValue.trim()}>
            Buscar otra idea
          </Button>
        </form>
      </header>

      {planning.phase === "generated" && planning.plans ? (
        <div className={styles.resultsContent}>
          <PlanResults
            plans={planning.plans}
            query={planning.query}
            resolvedContext={planning.resolvedContext}
            mode={planning.mode === "surprise" ? "surprise" : "auto"}
            canAdjust={false}
            onAdjust={() => inputRef.current?.focus()}
            onDiscard={goHome}
            onRegenerate={planning.regenerate}
            onPlanSelected={planning.applySelectionChange}
            onSelectionReconcile={planning.refresh}
          />
        </div>
      ) : (
        <div className={styles.waitContent}>
          {planning.phase === "submitting" ? (
            <p className={styles.accepting} role="status">Abriendo una nueva búsqueda…</p>
          ) : (
            <GenerationState
              phase={planning.phase === "idle" ? "failed" : planning.phase}
              failure={planning.failure ?? {
                code: null,
                message: "No pudimos recuperar esta búsqueda. Podés volver al inicio y probar otra vez.",
              }}
              onKeepWaiting={planning.keepWaiting}
              onRetry={planning.retry}
              onDiscard={goHome}
              canRetry={Boolean(planning.lastSubmission)}
              mode={planning.mode === "surprise" ? "surprise" : "auto"}
              query={planning.query}
              progressStage={planning.progressStage}
              progressStageAt={planning.progressStageAt}
              requestedAt={planning.requestedAt}
              estimatedRemainingSeconds={planning.estimatedRemainingSeconds}
            />
          )}
        </div>
      )}
    </section>
  );
}
