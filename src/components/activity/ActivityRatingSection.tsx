"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon, LoadingDots, Stars } from "@/components/ui";
import { getOwnPlan, getOwnRating, listOwnPlans } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { loginRoute } from "@/lib/routes";
import type { OwnRating } from "@/types";

import { RatingForm } from "./RatingForm";
import styles from "./activity.module.css";

export interface ActivityRatingSectionProps {
  activityId: number;
}

type LoadStatus = "loading" | "loaded" | "error";

/**
 * Finds a completed plan of the signed-in user's that included this
 * activity — `SmartPlan-back`'s `CreateRatingDto.planId` requirement
 * (`ratings.service.ts`'s `requireEligiblePlan`). Only the most recent 20
 * own plans are checked: today no plan can ever reach `completed` through
 * any code path in either repo yet (that transition isn't built), so this
 * is future-proofing rather than something exercisable right now, and a
 * user with more than 20 plans by the time it is can be revisited then.
 * Returns the first (most recent) match, not a list — CU44's form takes no
 * plan picker, matching the issue's own scope ("puntaje y comentario").
 */
async function findEligiblePlanId(activityId: number): Promise<number | null> {
  const { data: plans } = await listOwnPlans({
    sortBy: "createdAt",
    direction: "desc",
    limit: 20,
  });

  for (const plan of plans) {
    if (plan.status.key !== "completed") continue;
    const detail = await getOwnPlan(plan.id);
    if (detail.details.some((item) => item.activity.id === activityId)) {
      return plan.id;
    }
  }

  return null;
}

function moderationNote(rating: OwnRating): string | null {
  if (rating.moderationStatus === "pending") {
    return "Tu comentario está en revisión y todavía no es público.";
  }
  if (rating.moderationStatus === "rejected") {
    return "Tu comentario no fue aprobado y no es público.";
  }
  return null;
}

/**
 * CU44 - Rate activity (PAN 18). Resolves, in order: whether there's a
 * session (the issue's "Solo para usuarios autenticados"), whether the
 * user already rated this activity ("Impedir valorar dos veces" —
 * `GET .../ratings/me`), and, only if not, which of their own completed
 * plans is eligible to rate it with (see `findEligiblePlanId`). Renders
 * exactly one of: a login prompt, a loading state, the user's own rating
 * (already submitted), `RatingForm`, or an explanation for why rating
 * isn't available yet — never a plan picker, which no design or issue
 * text ever called for.
 */
export function ActivityRatingSection({ activityId }: ActivityRatingSectionProps) {
  const { status: sessionStatus } = useSession();
  const currentRoute = usePathname();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [ownRating, setOwnRating] = useState<OwnRating | null>(null);
  const [eligiblePlanId, setEligiblePlanId] = useState<number | null>(null);

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      return;
    }

    let ignore = false;

    async function load() {
      setStatus("loading");
      try {
        const existing = await getOwnRating(activityId);
        if (ignore) return;

        if (existing) {
          setOwnRating(existing);
          setStatus("loaded");
          return;
        }

        const planId = await findEligiblePlanId(activityId);
        if (ignore) return;
        setEligiblePlanId(planId);
        setStatus("loaded");
      } catch {
        if (!ignore) {
          setStatus("error");
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [activityId, sessionStatus]);

  if (sessionStatus === "loading") {
    return null;
  }

  if (sessionStatus === "anonymous") {
    return (
      <div className={styles.ratingGate}>
        <Icon name="lock" size={18} className={styles.ratingGateIcon} />
        <p className="sp-body">
          <Link href={loginRoute(currentRoute)} className={styles.ratingGateLink}>
            Iniciá sesión
          </Link>{" "}
          para valorar esta actividad.
        </p>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className={styles.ratingFormCard}>
        <LoadingDots label="Cargando…" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={styles.ratingGate} role="alert">
        <Icon name="triangle-alert" size={18} className={styles.ratingGateIcon} />
        <p className="sp-body">No pudimos cargar tu valoración. Recargá la página.</p>
      </div>
    );
  }

  if (ownRating) {
    const note = moderationNote(ownRating);
    return (
      <div className={styles.ratingFormCard}>
        <p className={styles.ratingFormTitle}>Tu valoración</p>
        <Stars rating={ownRating.score} size={16} />
        {ownRating.comment ? (
          <p className={`sp-body ${styles.ownRatingComment}`}>{ownRating.comment}</p>
        ) : null}
        {note ? <p className={styles.ratingModerationNote}>{note}</p> : null}
      </div>
    );
  }

  if (eligiblePlanId == null) {
    return (
      <div className={styles.ratingGate}>
        <Icon name="info" size={18} className={styles.ratingGateIcon} />
        <p className="sp-body">
          Todavía no podés valorar esta actividad: necesitás haber completado un
          plan que la incluya.
        </p>
      </div>
    );
  }

  return (
    <RatingForm
      activityId={activityId}
      planId={eligiblePlanId}
      onSubmitted={(rating) => {
        setOwnRating(rating);
      }}
    />
  );
}
