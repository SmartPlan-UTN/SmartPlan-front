"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icon, Toggle } from "@/components/ui";
import { useDebouncedValue } from "@/hooks";
import {
  getPlaceDetails,
  searchPlacePredictions,
  reverseGeocodeLocation,
  type PlacePrediction,
} from "@/lib/maps/placeSearch";
import type { PreferredArea } from "@/types";

import styles from "./preferences.module.css";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

export interface LocationFieldProps {
  initialArea: PreferredArea | null;
  initialUseDeviceLocation: boolean;
  onChange: (area: PreferredArea | null, useDeviceLocation: boolean) => void;
}

/**
 * "Ubicación preferida" (CU8/CU18, PAN 15): a Google Places search that
 * resolves to `{ label, placeId, latitude, longitude }`, or the device's
 * GPS reverse-geocoded into the same shape — `preferred_area`'s four
 * columns move together on the backend, so a raw typed string alone is
 * never a valid value.
 *
 * Free text the user hasn't picked a suggestion for doesn't change the
 * saved location: only selecting a suggestion, clearing the field, or a
 * successful device lookup calls `onChange`. Matches how Google's own
 * address forms behave, and avoids sending a location that only
 * half-matches what's on screen.
 */
export function LocationField({
  initialArea,
  initialUseDeviceLocation,
  onChange,
}: LocationFieldProps) {
  const listboxId = useId();
  const [query, setQuery] = useState(initialArea?.label ?? "");
  const [useDeviceLocation, setUseDeviceLocation] = useState(initialUseDeviceLocation);
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const lastResolvedLabelRef = useRef(initialArea?.label ?? "");
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  function getSessionToken() {
    sessionTokenRef.current ??= new google.maps.places.AutocompleteSessionToken();
    return sessionTokenRef.current;
  }

  useEffect(() => {
    if (useDeviceLocation) return;
    if (debouncedQuery.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    // The query already matches what a suggestion resolved to — nothing
    // new to search for (this effect would otherwise refire right after a
    // selection sets `query` to the resolved label).
    if (debouncedQuery === lastResolvedLabelRef.current) {
      return;
    }

    let ignore = false;

    async function run() {
      setIsSearching(true);
      try {
        const results = await searchPlacePredictions(debouncedQuery, getSessionToken());
        if (ignore) return;
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setError(null);
      } catch {
        if (ignore) return;
        setError("No pudimos buscar esa ubicación.");
      } finally {
        if (!ignore) setIsSearching(false);
      }
    }

    void run();
    return () => {
      ignore = true;
    };
  }, [debouncedQuery, useDeviceLocation]);

  async function selectSuggestion(prediction: PlacePrediction) {
    setIsOpen(false);
    setIsSearching(true);
    try {
      const area = await getPlaceDetails(prediction.placeId, getSessionToken());
      lastResolvedLabelRef.current = area.label;
      sessionTokenRef.current = null; // a resolved session is spent — next search starts a new one.
      setQuery(area.label);
      setError(null);
      onChange(area, false);
    } catch {
      setError("No pudimos resolver esa ubicación.");
    } finally {
      setIsSearching(false);
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim() === "") {
      lastResolvedLabelRef.current = "";
      onChange(null, false);
    }
  }

  function toggleDeviceLocation(next: boolean) {
    setUseDeviceLocation(next);
    setIsOpen(false);

    if (!next) {
      onChange(null, false);
      return;
    }

    if (!("geolocation" in navigator)) {
      setError("Tu navegador no puede compartir la ubicación.");
      setUseDeviceLocation(false);
      return;
    }

    setIsLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        reverseGeocodeLocation(latitude, longitude)
          .then((area) => {
            lastResolvedLabelRef.current = area.label;
            setQuery(area.label);
            onChange(area, true);
          })
          .catch(() => {
            setError("No pudimos identificar tu ubicación actual.");
            setUseDeviceLocation(false);
          })
          .finally(() => {
            setIsLocating(false);
          });
      },
      () => {
        setError("No pudimos acceder a la ubicación del dispositivo.");
        setUseDeviceLocation(false);
        setIsLocating(false);
      },
    );
  }

  return (
    <div className={styles.locationField}>
      <div className={styles.locationInputWrapper}>
        <span className={styles.locationPin} aria-hidden="true">
          <Icon name="map-pin" size={16} color="var(--ember)" />
        </span>
        <input
          type="text"
          value={query}
          onChange={(event) => {
            handleQueryChange(event.target.value);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onBlur={() => {
            // A timeout, not an immediate close: a suggestion's own
            // `onClick` needs to still fire first, or the blur would close
            // the list before the click ever registers.
            setTimeout(() => setIsOpen(false), 150);
          }}
          placeholder="Ej: Palermo, Buenos Aires"
          disabled={useDeviceLocation || isLocating}
          aria-label="Ubicación preferida"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          className={styles.locationInput}
        />
        {isSearching || isLocating ? (
          <span className={styles.locationSpinner}>
            <Icon name="loader-circle" size={16} className="sp-spin" />
          </span>
        ) : null}

        {isOpen && suggestions.length > 0 ? (
          <ul id={listboxId} className={styles.locationSuggestions} role="listbox">
            {suggestions.map((prediction) => (
              <li key={prediction.placeId}>
                <button
                  type="button"
                  className={styles.locationSuggestion}
                  onClick={() => {
                    void selectSuggestion(prediction);
                  }}
                >
                  {prediction.description}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? <p className={styles.locationError}>{error}</p> : null}

      <Toggle
        checked={useDeviceLocation}
        onChange={toggleDeviceLocation}
        label="Usar ubicación del dispositivo"
        disabled={isLocating}
      />
    </div>
  );
}
