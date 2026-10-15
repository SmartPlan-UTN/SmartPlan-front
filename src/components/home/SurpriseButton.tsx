"use client";

import { useEffect, useRef } from "react";

import { Icon } from "@/components/ui";

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
  /** `coords` is null when neither device GPS nor a preferred area resolved — the backend still generates a plan from a sensible default. */
  onResolved: (coords: SurpriseCoords | null, meta: SurpriseResolvedMeta) => void;
}

/**
 * "Sorpréndeme" (CU19 · PAN 09): a small pill button under the composer, for
 * someone with no idea to write. Its ember spark is the only thing that sets
 * it apart from a plain toolbar button — enough to read as "the other way
 * in" without competing with "Planificar".
 *
 * One press resolves a location (device GPS, or the saved preferred area as
 * a fallback) and hands it up; the shared generation flow takes it from
 * there. Without either signal, the request still goes out — the backend
 * picks a sensible department on its own — so this never blocks with an
 * error, only a note about which signal was actually used.
 */
export function SurpriseButton({ submitting, onResolved }: SurpriseButtonProps) {
  const { state, hasCategoryPreferences, request } = useSurpriseLocation();

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

      {!locating && !submitting && hasCategoryPreferences === false ? (
        <span className={styles.hint}>
          Sin preferencias guardadas: te sorprendemos con algo nuevo.
        </span>
      ) : null}
    </span>
  );
}
