"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { Button, Chip, Icon } from "@/components/ui";
import { ApiError, getPreferences, listCategories, updatePreferences } from "@/lib/api";
import type { CategoryOption, PreferredArea, UserPreferences } from "@/types";

import { LocationField } from "./LocationField";
import { PreferenceSection } from "./PreferenceSection";
import styles from "./preferences.module.css";

const MIN_DISTANCE_KM = 1;
const MAX_DISTANCE_KM = 50;
const DEFAULT_DISTANCE_KM = 10;
const DISTANCE_PRESETS = [5, 10, 20, 30, 50];
const MIN_PEOPLE = 1;
const MAX_PEOPLE = 20;
const DEFAULT_PEOPLE = 1;
const TOAST_VISIBLE_MS = 2400;
const TOAST_FADE_MS = 400;

type LoadStatus = "loading" | "loaded" | "error";
type ToastState = "hidden" | "visible" | "leaving";

export interface PreferencesFormProps {
  /**
   * Runs after a successful save, on top of the toast this form already
   * shows. Lets an embedding screen react to completion — e.g. a future
   * registration wizard step (CU8's "reutilizable desde el registro")
   * advancing to the next step. Not wired to any onboarding flow yet: CU2's
   * signup has no such step designed.
   */
  onSaved?: () => void;
}

/**
 * CU8/CU18 (PAN 15) - Edit preferences, per the v2 system design's
 * `Preferences.jsx`: interest categories, usual budget, usual party size,
 * preferred area, and max search distance. Loads the signed-in user's
 * saved profile and saves changes to all of it in one `PATCH
 * /users/me/preferences`.
 *
 * The prototype's budget field starts empty and shows its error
 * unconditionally ("demo: empty = error", by its own comment) purely to
 * have the error visible in a static screenshot. The real rule only flags
 * an actually-invalid value (typed and not a positive number) — an
 * untouched, no-preference-yet field isn't an error, since `usualBudget`
 * is optional on the backend.
 */
export function PreferencesForm({ onSaved }: PreferencesFormProps) {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [budgetInput, setBudgetInput] = useState("");
  const [peopleCount, setPeopleCount] = useState(DEFAULT_PEOPLE);
  const [preferredArea, setPreferredArea] = useState<PreferredArea | null>(null);
  const [useDeviceLocation, setUseDeviceLocation] = useState(false);
  const [maxDistanceKm, setMaxDistanceKm] = useState(DEFAULT_DISTANCE_KM);
  const [initialArea, setInitialArea] = useState<PreferredArea | null>(null);
  const [initialUseDeviceLocation, setInitialUseDeviceLocation] = useState(false);
  const [locationKey, setLocationKey] = useState(0);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastState, setToastState] = useState<ToastState>("hidden");

  function applyPreferences(loadedCategories: CategoryOption[], profile: UserPreferences) {
    setCategories(loadedCategories);
    setSelectedCategoryIds(profile.categories.map((category) => category.id));
    setBudgetInput(profile.usualBudget != null ? String(profile.usualBudget) : "");
    setPeopleCount(profile.usualPeopleCount ?? DEFAULT_PEOPLE);
    setPreferredArea(profile.preferredArea);
    setInitialArea(profile.preferredArea);
    setUseDeviceLocation(profile.useDeviceLocation);
    setInitialUseDeviceLocation(profile.useDeviceLocation);
    setMaxDistanceKm(profile.maxDistanceKm ?? DEFAULT_DISTANCE_KM);
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [profile, categoryPage] = await Promise.all([
          getPreferences(),
          listCategories({ limit: 50 }),
        ]);
        if (ignore) return;
        applyPreferences(categoryPage.data, profile);
        setStatus("loaded");
      } catch {
        if (!ignore) setStatus("error");
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const trimmedBudget = budgetInput.trim();
  const budgetNumber = trimmedBudget === "" ? null : Number(trimmedBudget);
  const budgetError =
    trimmedBudget !== "" && (Number.isNaN(budgetNumber) || (budgetNumber as number) <= 0)
      ? "Ingresá un presupuesto válido mayor a $0"
      : null;

  function toggleCategory(id: number) {
    setSelectedCategoryIds((current) =>
      current.includes(id) ? current.filter((categoryId) => categoryId !== id) : [...current, id],
    );
  }

  function handleReset() {
    setSelectedCategoryIds([]);
    setBudgetInput("");
    setPeopleCount(DEFAULT_PEOPLE);
    setPreferredArea(null);
    setUseDeviceLocation(false);
    setMaxDistanceKm(DEFAULT_DISTANCE_KM);
    setInitialArea(null);
    setInitialUseDeviceLocation(false);
    // Forces `LocationField` (uncontrolled internally) to remount with the
    // cleared initial values instead of keeping its own stale query text.
    setLocationKey((key) => key + 1);
    setFormError(null);
  }

  async function handleSave() {
    if (budgetError) return;

    setSaving(true);
    setFormError(null);
    try {
      const updated = await updatePreferences({
        categoryIds: selectedCategoryIds,
        usualBudget: budgetNumber,
        usualPeopleCount: peopleCount,
        preferredArea,
        useDeviceLocation,
        maxDistanceKm,
      });
      applyPreferences(categories, updated);
      setToastState("visible");
      setTimeout(() => setToastState("leaving"), TOAST_VISIBLE_MS);
      setTimeout(() => setToastState("hidden"), TOAST_VISIBLE_MS + TOAST_FADE_MS);
      onSaved?.();
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.code === "VALIDATION_FAILED"
          ? "Revisá los datos ingresados."
          : "No pudimos guardar tus preferencias. Probá de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") {
    return <p className={styles.loading}>Cargando preferencias…</p>;
  }

  if (status === "error") {
    return <p className={styles.loadError}>No pudimos cargar tus preferencias.</p>;
  }

  return (
    <div className={styles.form}>
      <PreferenceSection
        title="Mis intereses"
        subtitle="Seleccioná las categorías que más te interesan."
      >
        <div className={styles.chipRow}>
          {categories.map((category) => (
            <Chip
              key={category.id}
              active={selectedCategoryIds.includes(category.id)}
              onClick={() => {
                toggleCategory(category.id);
              }}
            >
              {category.name}
            </Chip>
          ))}
        </div>
      </PreferenceSection>

      <div className={styles.twoColumn}>
        <PreferenceSection
          title="Presupuesto por salida"
          subtitle="Importe máximo que querés gastar en un plan."
        >
          <div className={styles.budgetField}>
            <div className={styles.budgetInputWrapper}>
              <span className={styles.budgetPrefix} aria-hidden="true">
                $
              </span>
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={budgetInput}
                onChange={(event) => {
                  setBudgetInput(event.target.value);
                }}
                placeholder="0"
                aria-label="Presupuesto por salida"
                aria-invalid={budgetError ? true : undefined}
                className={`${styles.budgetInput} ${budgetError ? styles.hasError : ""}`}
              />
            </div>
            {budgetError ? (
              <div className={styles.errorBubble}>
                <span className={styles.errorDot}>!</span>
                <span>{budgetError}</span>
              </div>
            ) : null}
          </div>
        </PreferenceSection>

        <PreferenceSection
          title="Cantidad habitual de personas"
          subtitle="¿Con cuántas personas salís normalmente?"
        >
          <div className={styles.counter}>
            <button
              type="button"
              className={styles.counterBtn}
              disabled={peopleCount <= MIN_PEOPLE}
              onClick={() => {
                setPeopleCount((value) => Math.max(MIN_PEOPLE, value - 1));
              }}
              aria-label="Restar una persona"
            >
              −
            </button>
            <span className={styles.counterValue}>{peopleCount}</span>
            <button
              type="button"
              className={styles.counterBtn}
              disabled={peopleCount >= MAX_PEOPLE}
              onClick={() => {
                setPeopleCount((value) => Math.min(MAX_PEOPLE, value + 1));
              }}
              aria-label="Sumar una persona"
            >
              +
            </button>
            <span className={styles.counterLabel}>
              {peopleCount === 1 ? "persona" : "personas"}
            </span>
          </div>
        </PreferenceSection>
      </div>

      <PreferenceSection title="Ubicación preferida" subtitle="El centro de búsqueda para tus planes.">
        <LocationField
          key={locationKey}
          initialArea={initialArea}
          initialUseDeviceLocation={initialUseDeviceLocation}
          onChange={(area, deviceLocation) => {
            setPreferredArea(area);
            setUseDeviceLocation(deviceLocation);
          }}
        />
      </PreferenceSection>

      <PreferenceSection title="Distancia máxima" subtitle="Radio de búsqueda desde tu ubicación.">
        <div className={styles.distanceField}>
          <div className={styles.distanceLabels}>
            <span>{MIN_DISTANCE_KM} km</span>
            <span className={styles.distanceValue}>{maxDistanceKm} km</span>
            <span>{MAX_DISTANCE_KM} km</span>
          </div>
          <input
            type="range"
            min={MIN_DISTANCE_KM}
            max={MAX_DISTANCE_KM}
            step={1}
            value={maxDistanceKm}
            onChange={(event) => {
              setMaxDistanceKm(Number(event.target.value));
            }}
            aria-label="Distancia máxima en kilómetros"
            className={styles.distanceSlider}
            style={
              {
                "--pct": `${((maxDistanceKm - MIN_DISTANCE_KM) / (MAX_DISTANCE_KM - MIN_DISTANCE_KM)) * 100}%`,
              } as CSSProperties & Record<"--pct", string>
            }
          />
          <div className={styles.distancePresets}>
            {DISTANCE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={maxDistanceKm === preset}
                className={`${styles.distancePreset} ${maxDistanceKm === preset ? styles.distancePresetActive : ""}`}
                onClick={() => {
                  setMaxDistanceKm(preset);
                }}
              >
                {preset} km
              </button>
            ))}
          </div>
        </div>
      </PreferenceSection>

      {formError ? <p className={styles.formError}>{formError}</p> : null}

      <div className={styles.footer}>
        <button type="button" className={styles.resetLink} onClick={handleReset}>
          Restablecer preferencias
        </button>
        <Button
          size="lg"
          onClick={() => void handleSave()}
          disabled={!!budgetError || saving}
        >
          <Icon name="check" size={15} />
          {saving ? "Guardando…" : "Guardar preferencias"}
        </Button>
      </div>

      {toastState !== "hidden" ? (
        <div
          className={`${styles.toast} ${toastState === "leaving" ? styles.toastLeaving : ""}`}
          role="status"
        >
          <Icon name="circle-check" size={16} color="var(--success)" />
          Preferencias guardadas
        </div>
      ) : null}
    </div>
  );
}
