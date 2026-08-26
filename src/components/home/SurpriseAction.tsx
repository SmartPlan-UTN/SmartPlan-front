"use client";

import { useState } from "react";

import { Icon } from "@/components/ui";

import styles from "./composer.module.css";

export interface SurpriseActionProps {
  submitting: boolean;
  onSubmit: (latitude: number, longitude: number) => void;
}

type LocationErrorKind = "denied" | "unavailable" | null;

const LOCATION_ERROR_MESSAGES: Record<Exclude<LocationErrorKind, null>, string> = {
  denied: "Necesitamos tu ubicación para armarte una sorpresa cerca tuyo. Habilitala en el navegador e intentá de nuevo.",
  unavailable: "No pudimos obtener tu ubicación. Probá de nuevo en un momento.",
};

/**
 * "Sorpréndeme" (CU19): the composer rail's last item, for someone who has
 * no idea to write. Requests geolocation, then submits
 * `POST /plan-requests/surprise` through the same polling flow the composer
 * uses. A denied or unavailable geolocation is answered inline, next to the
 * button, never as a dead end.
 */
export function SurpriseAction({ submitting, onSubmit }: SurpriseActionProps) {
  const [locationError, setLocationError] = useState<LocationErrorKind>(null);

  function handleClick() {
    if (submitting) return;
    setLocationError(null);

    if (!("geolocation" in navigator)) {
      setLocationError("unavailable");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSubmit(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setLocationError(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <>
      <button
        type="button"
        className={styles.surprise}
        onClick={handleClick}
        disabled={submitting}
      >
        <Icon name="sparkles" size={15} className={styles.surpriseIcon} aria-hidden="true" />
        Sorpréndeme
      </button>

      {locationError ? (
        <p className={styles.surpriseNote} role="alert">
          {LOCATION_ERROR_MESSAGES[locationError]}
        </p>
      ) : null}
    </>
  );
}
