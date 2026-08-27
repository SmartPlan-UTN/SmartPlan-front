"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui";
import { ROUTES } from "@/lib/routes";
import { surpriseLocationErrorCopy } from "@/lib/recommendation/planRequestErrors";

import {
  useSurpriseLocation,
  type SurpriseCoords,
  type SurpriseLocationSource,
} from "./useSurpriseLocation";
import styles from "./surprise-button.module.css";

export interface SurpriseResolvedMeta {
  source: SurpriseLocationSource;
  hasCategoryPreferences: boolean | null;
}

export interface SurpriseButtonProps {
  /** A generation is already in flight (or the session is still loading). */
  submitting: boolean;
  onResolved: (coords: SurpriseCoords, meta: SurpriseResolvedMeta) => void;
}

/**
 * "Sorpréndeme" (CU19 · PAN 09): a small pill button under the composer, for
 * someone with no idea to write. Its ember spark is the only thing that sets
 * it apart from a plain toolbar button — enough to read as "the other way
 * in" without competing with "Planificar".
 *
 * One press resolves a location (device GPS, or the saved preferred area as
 * a fallback) and hands the coordinates up; the shared generation flow takes
 * it from there. A denied or missing location is answered in a single line,
 * never as a dead end and never as a form.
 */
export function SurpriseButton({ submitting, onResolved }: SurpriseButtonProps) {
  const router = useRouter();
  const { state, hasCategoryPreferences, request, reset } = useSurpriseLocation();

  const firedRef = useRef(false);

  useEffect(() => {
    if (state.status !== "resolved") {
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;
    onResolved(state.coords, {
      source: state.source,
      hasCategoryPreferences,
    });
  }, [state, onResolved, hasCategoryPreferences]);

  const locating =
    state.status === "locating" ||
    state.status === "loading-fallback" ||
    state.status === "resolved";

  return (
    <span className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        data-busy={locating ? "true" : undefined}
        onClick={request}
        disabled={submitting || locating}
        aria-live="polite"
      >
        <Icon name="sparkles" size={14} className={styles.icon} aria-hidden="true" />
        {locating ? "Buscando algo para vos…" : "Sorpréndeme"}
      </button>

      {state.status === "error" ? (
        <SurpriseButtonNote
          kind={state.kind}
          onPreferences={() => {
            reset();
            router.push(ROUTES.preferences);
          }}
        />
      ) : !locating && !submitting && hasCategoryPreferences === false ? (
        <span className={styles.hint}>
          Sin preferencias guardadas: te sorprendemos con algo nuevo.
        </span>
      ) : null}
    </span>
  );
}

function SurpriseButtonNote({
  kind,
  onPreferences,
}: {
  kind: Parameters<typeof surpriseLocationErrorCopy>[0];
  onPreferences: () => void;
}) {
  const copy = surpriseLocationErrorCopy(kind);

  return (
    <span className={styles.note} role="alert">
      {copy.title} {copy.body}
      {copy.actions.includes("go-preferences") ? (
        <button
          type="button"
          className={styles.noteLink}
          onClick={onPreferences}
        >
          Ir a preferencias
        </button>
      ) : null}
    </span>
  );
}
