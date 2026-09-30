"use client";

import { useState } from "react";

import { Button, ConfirmationDialog, Icon } from "@/components/ui";
import { ApiError, setOwnPlanVisibility } from "@/lib/api";
import type { PlanVisibility } from "@/types";

import { VISIBILITY_COPY } from "./visibilityContent";
import styles from "./MyPlansPanel.module.css";

export interface PlanVisibilityBadgeProps {
  visibility: PlanVisibility;
}

/** Says whether a plan the person created is public or private (#130). */
export function PlanVisibilityBadge({ visibility }: PlanVisibilityBadgeProps) {
  return (
    <span
      className={
        visibility === "public"
          ? `${styles.visibilityBadge} ${styles.visibilityPublic}`
          : styles.visibilityBadge
      }
      title={VISIBILITY_COPY.hint[visibility]}
    >
      <Icon
        name={visibility === "public" ? "globe" : "lock"}
        size={12}
        aria-hidden="true"
      />
      {VISIBILITY_COPY.label[visibility]}
    </span>
  );
}

export interface PlanVisibilityControlProps {
  planId: number;
  planTitle: string;
  visibility: PlanVisibility;
  /** Called with the new visibility once the backend confirmed it. */
  onChanged: (visibility: PlanVisibility) => void;
  size?: "sm" | "md";
}

/**
 * "Publicar" / "Hacer privado" for a plan the person created (#130). Both
 * directions ask first: publishing exposes the plan to everyone, and making
 * it private hides it from people who might be about to choose it.
 */
export function PlanVisibilityControl({
  planId,
  planTitle,
  visibility,
  onChanged,
  size = "sm",
}: PlanVisibilityControlProps) {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next: PlanVisibility = visibility === "public" ? "private" : "public";
  const dialog =
    next === "public"
      ? VISIBILITY_COPY.dialog.publish
      : VISIBILITY_COPY.dialog.unpublish;

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      const updated = await setOwnPlanVisibility(planId, next);
      setConfirming(false);
      onChanged(updated.visibility);
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "PLAN_EMPTY"
          ? VISIBILITY_COPY.errors.empty
          : VISIBILITY_COPY.errors.generic,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        variant={next === "public" ? "ghostEmber" : "ghostLight"}
        size={size}
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        aria-label={`${
          next === "public"
            ? VISIBILITY_COPY.action.publish
            : VISIBILITY_COPY.action.unpublish
        } ${planTitle}`}
      >
        <Icon
          name={next === "public" ? "globe" : "lock"}
          size={14}
          aria-hidden="true"
        />
        {next === "public"
          ? VISIBILITY_COPY.action.publish
          : VISIBILITY_COPY.action.unpublish}
      </Button>

      {confirming ? (
        <ConfirmationDialog
          title={dialog.title}
          confirmLabel={dialog.confirm}
          confirmingLabel={dialog.confirming}
          cancelLabel={VISIBILITY_COPY.dialog.back}
          isConfirming={saving}
          error={error}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void confirm()}
        >
          <p>{dialog.body}</p>
        </ConfirmationDialog>
      ) : null}
    </>
  );
}
