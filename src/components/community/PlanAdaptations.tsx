"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

import { getPlanAdaptations } from "@/lib/api";
import type { CommunityPlan } from "@/types";

import { PlanCard } from "./cards";
import styles from "./planAdaptations.module.css";

const SHOWN = 4;

/**
 * What other people made from this plan: published adaptations, one
 * level and flat. It draws nothing until there is at least one, so a new plan
 * never shows an empty promise.
 */
export function PlanAdaptations({ planId }: { planId: number }) {
  const [result, setResult] = useState<{
    planId: number;
    plans: CommunityPlan[];
    total: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [moreState, setMoreState] = useState<"idle" | "loading" | "error">(
    "idle",
  );

  useEffect(() => {
    let active = true;
    getPlanAdaptations(planId, { limit: SHOWN })
      .then((page) => {
        if (active) {
          setResult({ planId, plans: page.data, total: page.pagination.total });
          setPage(1);
          setMoreState("idle");
        }
      })
      .catch(() => {
        // A section that supports the plan, never one that blocks it.
        if (active) setResult({ planId, plans: [], total: 0 });
      });
    return () => {
      active = false;
    };
  }, [planId]);

  async function loadMore() {
    setMoreState("loading");
    try {
      const next = await getPlanAdaptations(planId, {
        limit: SHOWN,
        page: page + 1,
      });
      setResult((current) =>
        current?.planId === planId
          ? {
              ...current,
              plans: [
                ...new Map(
                  [...current.plans, ...next.data].map((plan) => [
                    plan.id,
                    plan,
                  ]),
                ).values(),
              ],
              total: next.pagination.total,
            }
          : current,
      );
      setPage(next.pagination.page);
      setMoreState("idle");
    } catch {
      setMoreState("error");
    }
  }

  if (!result || result.planId !== planId || result.plans.length === 0)
    return null;

  return (
    <section
      className={styles.section}
      aria-labelledby="plan-adaptations-heading"
    >
      <h2 id="plan-adaptations-heading" className={styles.heading}>
        {result.total === 1
          ? "Una versión de este plan"
          : `${result.total} versiones de este plan`}
      </h2>
      <div className={styles.grid}>
        {result.plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            layout={result.plans.length === 1 ? "wide" : "card"}
          />
        ))}
      </div>
      {result.total > result.plans.length ? (
        <div className={styles.more}>
          {moreState === "error" ? (
            <p role="alert">No pudimos cargar las otras versiones.</p>
          ) : null}
          <Button
            variant="ghostLight"
            disabled={moreState === "loading"}
            onClick={() => void loadMore()}
          >
            {moreState === "loading"
              ? "Cargando…"
              : moreState === "error"
                ? "Reintentar"
                : "Ver más versiones"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
