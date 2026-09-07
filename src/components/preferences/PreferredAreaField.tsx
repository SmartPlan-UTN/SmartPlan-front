"use client";

import { useId, useRef, useState } from "react";

import { Icon } from "@/components/ui";
import { ApiError, searchPlace } from "@/lib/api";
import type { PreferredArea } from "@/types";

import styles from "./preferences.module.css";

export type PreferredAreaStatus =
  "empty" | "unconfirmed" | "searching" | "resolved" | "notfound" | "error";

interface PreferredAreaFieldProps {
  text: string;
  resolved: PreferredArea | null;
  disabled?: boolean;
  onTextChange: (text: string) => void;
  onResolvedChange: (area: PreferredArea | null) => void;
  onStatusChange: (status: PreferredAreaStatus) => void;
}

const NOT_FOUND_MESSAGE =
  "No pudimos encontrar esa ubicación. Verificá el nombre o probá con la ciudad.";
const BUSY_MESSAGE =
  "El buscador de ubicaciones está ocupado. Probá de nuevo en un momento.";
const GENERIC_MESSAGE =
  "No pudimos verificar la ubicación ahora. Probá de nuevo.";

function toLabel(name: string, address: string, fallback: string): string {
  const chosen = name.trim() || address.trim() || fallback.trim();
  return chosen.slice(0, 160);
}

function matchesResolved(
  text: string,
  resolved: PreferredArea | null,
): boolean {
  return resolved !== null && resolved.label.trim() === text.trim();
}

/**
 * PAN 15 "ubicación preferida": free text the user confirms against
 * `GET /external-integration/places/search`. What gets stored is the
 * resolved `{ label, placeId, latitude, longitude }` — never raw text — so
 * CU19 can use it as a real search centre. An unconfirmed or unresolvable
 * value blocks saving (the parent reads `onStatusChange`).
 */
export function PreferredAreaField({
  text,
  resolved,
  disabled = false,
  onTextChange,
  onResolvedChange,
  onStatusChange,
}: PreferredAreaFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const helpId = useId();
  const [status, setStatus] = useState<PreferredAreaStatus>(
    resolved ? "resolved" : text.trim() ? "unconfirmed" : "empty",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

  function apply(next: PreferredAreaStatus) {
    setStatus(next);
    onStatusChange(next);
  }

  function handleText(value: string) {
    onTextChange(value);
    setMessage(null);
    if (matchesResolved(value, resolved)) {
      apply("resolved");
      return;
    }
    if (resolved) onResolvedChange(null);
    apply(value.trim() === "" ? "empty" : "unconfirmed");
  }

  async function confirm() {
    const query = text.trim();
    if (query === "" || disabled) return;
    if (matchesResolved(query, resolved)) {
      apply("resolved");
      return;
    }

    apply("searching");
    setMessage(null);
    try {
      const place = await searchPlace(query);
      const label = toLabel(place.name, place.address, query);
      onTextChange(label);
      onResolvedChange({
        label,
        placeId: place.placeId,
        latitude: place.latitude,
        longitude: place.longitude,
      });
      setResolvedAddress(place.address || null);
      apply("resolved");
    } catch (error) {
      onResolvedChange(null);
      if (error instanceof ApiError && error.code === "PLACE_NOT_FOUND") {
        setMessage(NOT_FOUND_MESSAGE);
        apply("notfound");
        return;
      }
      if (error instanceof ApiError && error.status === 429) {
        setMessage(BUSY_MESSAGE);
        apply("error");
        return;
      }
      setMessage(
        error instanceof ApiError && error.isNetworkError
          ? error.message
          : GENERIC_MESSAGE,
      );
      apply("error");
    }
  }

  function reset() {
    onResolvedChange(null);
    onTextChange("");
    setResolvedAddress(null);
    setMessage(null);
    apply("empty");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  if (status === "resolved" && resolved) {
    return (
      <div
        className={styles.areaResolved}
        role="group"
        aria-label="Ubicación preferida"
      >
        <span className={styles.areaResolvedIcon} aria-hidden="true">
          <Icon name="map-pin" size={18} />
        </span>
        <span className={styles.areaResolvedText}>
          <strong>{resolved.label}</strong>
          {resolvedAddress && resolvedAddress !== resolved.label ? (
            <small>{resolvedAddress}</small>
          ) : (
            <small>Ubicación confirmada</small>
          )}
        </span>
        <button
          type="button"
          className={styles.inlineAction}
          onClick={reset}
          disabled={disabled}
        >
          Cambiar
        </button>
      </div>
    );
  }

  const invalid = status === "notfound" || status === "error";
  const searching = status === "searching";

  return (
    <div className={styles.areaField}>
      <div className={styles.areaInputRow}>
        <div
          className={
            invalid
              ? `${styles.areaInput} ${styles.areaInputInvalid}`
              : styles.areaInput
          }
        >
          <Icon name="map-pin" size={20} />
          <input
            ref={inputRef}
            id="preferred-area"
            type="text"
            maxLength={160}
            value={text}
            disabled={disabled || searching}
            placeholder="Ej. Godoy Cruz, Mendoza"
            autoComplete="off"
            aria-label="Zona preferida"
            aria-invalid={invalid ? "true" : undefined}
            aria-describedby={helpId}
            onChange={(event) => handleText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void confirm();
              }
            }}
          />
        </div>
        <button
          type="button"
          className={styles.areaConfirm}
          onClick={() => void confirm()}
          disabled={disabled || searching || text.trim() === ""}
        >
          {searching ? (
            <Icon
              name="loader-circle"
              size={16}
              className={styles.saveSpinner}
            />
          ) : (
            <Icon name="search" size={16} />
          )}
          {searching ? "Buscando…" : "Confirmar"}
        </button>
      </div>
      <p
        id={helpId}
        className={invalid ? styles.fieldError : styles.fieldHelp}
        role={invalid ? "alert" : undefined}
      >
        {message ??
          (status === "unconfirmed"
            ? "Confirmá la ubicación para guardarla."
            : "Escribí un barrio, ciudad o zona y confirmala. Podés dejarla sin definir.")}
      </p>
    </div>
  );
}
