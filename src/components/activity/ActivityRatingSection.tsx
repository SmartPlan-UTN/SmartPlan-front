"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfirmationDialog, Icon, LoadingDots, Stars } from "@/components/ui";
import {
  ApiError,
  deleteRating,
  getOwnPlan,
  getOwnRating,
  listOwnPlans,
} from "@/lib/api";
import { useSession } from "@/lib/auth";
import { loginRoute } from "@/lib/routes";
import type { OwnRating } from "@/types";

import { EditRatingForm } from "./EditRatingForm";
import { RatingForm } from "./RatingForm";
import styles from "./activity.module.css";

export interface ActivityRatingSectionProps {
  activityId: number;
  /**
   * Notifies the parent after a create/edit/delete so it can refresh
   * `RatingsList` and the summary shown alongside it — CU47's "Recalculo
   * del promedio" (and, for consistency, the same after CU44/CU46, so the
   * average is never stale in any of the three cases the summary can
   * change).
   */
  onChange?: () => void;
}

type LoadStatus = "loading" | "loaded" | "error";

/**
 * Finds a completed plan of the signed-in user's that included this
 * activity — `SmartPlan-back`'s `CreateRatingDto.planId` requirement
 * (`ratings.service.ts`'s `requireEligiblePlan`). All pages are checked so
 * an older eligible experience isn't hidden by the own-plans endpoint's
 * pagination.
 * Returns the first (most recent) match, not a list — CU44's form takes no
 * plan picker, matching the issue's own scope ("puntaje y comentario").
 */
async function findEligiblePlanId(activityId: number): Promise<number | null> {
  let page = 1;

  while (true) {
    const result = await listOwnPlans({
      page,
      sortBy: "createdAt",
      direction: "desc",
      limit: 100,
    });

    for (const plan of result.data) {
      if (plan.status.key !== "completed") continue;
      const detail = await getOwnPlan(plan.id);
      if (detail.details.some((item) => item.activity.id === activityId)) {
        return plan.id;
      }
    }

    if (page >= result.pagination.totalPages) {
      return null;
    }

    page += 1;
  }
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
 * CU44/CU46/CU47 - Rate, edit, and delete own rating (PAN 18). Resolves,
 * in order: whether there's a session (CU44's "Solo para usuarios
 * autenticados"), whether the user already rated this activity ("Impedir
 * valorar dos veces" — `GET .../ratings/me`), and, only if not, which of
 * their own completed plans is eligible to rate it with (see
 * `findEligiblePlanId`). Renders exactly one of: a login prompt, a loading
 * state, the user's own rating with edit/delete actions (`EditRatingForm`,
 * `ConfirmationDialog`), `RatingForm`, or an explanation for why rating
 * isn't available yet — never a plan picker, which no design or issue
 * text ever called for.
 *
 * Like CU44, neither CU46 nor CU47 has a mockup: `ActivityDetail.jsx`
 * never lets a reviewer touch their own review, so the pencil/trash icon
 * buttons on "Tu valoración" and the inline edit form are original,
 * following this same file's own CU44 precedent rather than inventing a
 * new pattern. "Solo el autor puede editarla" (CU46) and the delete
 * confirmation (CU47) both fall out of that same ownership: this card
 * only ever renders for the signed-in user's own rating, `PATCH`/`DELETE
 * /ratings/:id` re-scope by `idUser` server-side regardless, and deleting
 * goes through `ConfirmationDialog` — the same destructive-action pattern
 * CU26/CU33/CU34 already use — rather than a bare button.
 */
export function ActivityRatingSection({ activityId, onChange }: ActivityRatingSectionProps) {
  const { status: sessionStatus } = useSession();
  const currentRoute = usePathname();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [ownRating, setOwnRating] = useState<OwnRating | null>(null);
  const [eligiblePlanId, setEligiblePlanId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!ownRating) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteRating(ownRating.id);
      setOwnRating(null);
      setEligiblePlanId(ownRating.planId);
      setConfirmingDelete(false);
      onChange?.();
    } catch (error) {
      if (error instanceof ApiError && error.code === "RATING_NOT_FOUND") {
        // Already gone (another tab, say) — nothing left to confirm.
        setOwnRating(null);
        setEligiblePlanId(ownRating.planId);
        setConfirmingDelete(false);
        onChange?.();
        return;
      }
      setDeleteError("No pudimos eliminar tu valoración. Intentá de nuevo.");
    } finally {
      setDeleting(false);
    }
  }

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

  if (ownRating && editing) {
    return (
      <div className={styles.ratingFormCard}>
        <p className={styles.ratingFormTitle}>Editar tu valoración</p>
        <EditRatingForm
          rating={ownRating}
          onSaved={(updated) => {
            setOwnRating(updated);
            setEditing(false);
            onChange?.();
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  if (ownRating) {
    const note = moderationNote(ownRating);
    return (
      <div className={styles.ratingFormCard}>
        <div className={styles.ownRatingHeader}>
          <p className={styles.ratingFormTitle}>Tu valoración</p>
          <div className={styles.ownRatingActions}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setEditing(true)}
              aria-label="Editar tu valoración"
            >
              <Icon name="pencil" size={15} />
            </button>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.iconButtonDanger}`}
              onClick={() => {
                setDeleteError(null);
                setConfirmingDelete(true);
              }}
              aria-label="Eliminar tu valoración"
            >
              <Icon name="trash-2" size={15} />
            </button>
          </div>
        </div>
        <Stars rating={ownRating.score} size={16} />
        {ownRating.comment ? (
          <p className={`sp-body ${styles.ownRatingComment}`}>{ownRating.comment}</p>
        ) : null}
        {note ? <p className={styles.ratingModerationNote}>{note}</p> : null}

        {confirmingDelete ? (
          <ConfirmationDialog
            title="¿Eliminar tu valoración?"
            confirmLabel="Eliminar valoración"
            confirmingLabel="Eliminando..."
            isConfirming={deleting}
            error={deleteError}
            onCancel={() => setConfirmingDelete(false)}
            onConfirm={() => void confirmDelete()}
          >
            <p>Se eliminará tu puntaje y tu comentario de esta actividad.</p>
            <p>Esta acción no se puede deshacer.</p>
          </ConfirmationDialog>
        ) : null}
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
        onChange?.();
      }}
    />
  );
}
