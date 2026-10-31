"use client";

import { useEffect, useRef, useState } from "react";

import { Chip, Icon } from "@/components/ui";
import type { PlanRequestContext, TimeOfDay, TravelMode } from "@/types";

import styles from "./ContextChips.module.css";

export interface ContextChipsProps {
  value: PlanRequestContext;
  onChange: (value: PlanRequestContext) => void;
}

const TIME_OF_DAY_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: "morning", label: "Mañana" },
  { value: "afternoon", label: "Tarde" },
  { value: "evening", label: "Noche" },
  { value: "night", label: "Madrugada" },
];

/**
 * Budget / time-of-day / party-size context chips (CU17), plus the "En casa"
 * and "Gratis" toggles (#210) next to the budget. Every field is
 * genuinely optional and starts unset — a chip only enters `context` once
 * the user has actually set a value through it, never pre-filled with a
 * placeholder default. No location chip: `idDepartment` has no picker built
 * anywhere in the app yet, so it's left out of scope for this pass.
 */
export function ContextChips({ value, onChange }: ContextChipsProps) {
  const [openChip, setOpenChip] = useState<"budget" | "timeOfDay" | "partySize" | "availableDuration" | "maxDistanceKm" | "travelMode" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentValue = useRef(value);
  const currentOnChange = useRef(onChange);
  const locationRequest = useRef(0);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  useEffect(() => { currentValue.current = value; currentOnChange.current = onChange; }, [value, onChange]);
  useEffect(() => () => { locationRequest.current += 1; }, []);

  function useCurrentLocation() {
    if (value.latitude != null && value.longitude != null) {
      onChange({ ...value, latitude: undefined, longitude: undefined });
      setLocationError(null);
      return;
    }
    if (!navigator.geolocation) { setLocationError('Tu navegador no permite obtener la ubicación. Podés usar tu zona preferida.'); return; }
    setLocating(true);
    setLocationError(null);
    const request = ++locationRequest.current;
    navigator.geolocation.getCurrentPosition((position) => {
      if (request !== locationRequest.current) return;
      currentOnChange.current({ ...currentValue.current, latitude: position.coords.latitude, longitude: position.coords.longitude, idDepartment: undefined });
      setLocating(false);
    }, () => {
      if (request !== locationRequest.current) return;
      setLocationError('No pudimos obtener tu ubicación. Revisá el permiso del navegador o usá tu zona preferida.');
      setLocating(false);
    }, { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false });
  }

  useEffect(() => {
    if (!openChip) return;

    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenChip(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenChip(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openChip]);

  const timeOfDayLabel = value.timeOfDay
    ? TIME_OF_DAY_OPTIONS.find((option) => option.value === value.timeOfDay)?.label
    : null;

  return (
    <div className={styles.row} ref={containerRef}>
      <Chip className={styles.chipCompact} active={value.latitude != null && value.longitude != null} disabled={locating} onClick={useCurrentLocation}><Icon name="map-pin" size={13} aria-hidden="true" />{locating ? 'Buscando ubicación…' : value.latitude != null ? 'Ubicación actual' : 'Usar mi ubicación'}</Chip>
      {locationError ? <p className={styles.popoverLabel} role="status">{locationError}</p> : null}
      <div className={styles.chipWrapper}>
        <Chip className={styles.chipCompact} active={value.travelMode != null} aria-expanded={openChip === 'travelMode'} onClick={() => setOpenChip((current) => current === 'travelMode' ? null : 'travelMode')}>
          {value.travelMode ? { drive: 'En auto', walk: 'Caminando', bicycle: 'En bicicleta' }[value.travelMode] : 'Traslados'}
        </Chip>
        {openChip === 'travelMode' ? <div className={styles.popover} role="listbox" aria-label="Forma de traslado">{(['drive', 'walk', 'bicycle'] as TravelMode[]).map((mode) => <button key={mode} type="button" role="option" aria-selected={value.travelMode === mode} className={styles.popoverOption} onClick={() => { onChange({ ...value, travelMode: value.travelMode === mode ? undefined : mode }); setOpenChip(null); }}>{ { drive: 'En auto', walk: 'Caminando', bicycle: 'En bicicleta' }[mode] }</button>)}</div> : null}
      </div>
      {(['availableDuration', 'maxDistanceKm'] as const).map((field) => <div className={styles.chipWrapper} key={field}>
        <Chip className={styles.chipCompact} active={value[field] != null} aria-expanded={openChip === field} onClick={() => setOpenChip((current) => current === field ? null : field)}>
          <Icon name={field === 'availableDuration' ? 'clock' : 'map-pin'} size={13} aria-hidden="true" />
          {value[field] == null ? field === 'availableDuration' ? 'Duración' : 'Distancia' : `Hasta ${value[field]} ${field === 'availableDuration' ? 'min' : 'km'}`}
        </Chip>
        {openChip === field ? <div className={styles.popover}>
          <label className={styles.popoverLabel} htmlFor={`context-${field}`}>{field === 'availableDuration' ? 'Tiempo total disponible (minutos)' : 'Distancia máxima (km)'}</label>
          <input id={`context-${field}`} type="number" min="1" max={field === 'maxDistanceKm' ? 50 : 525600} step="1" className={styles.popoverInput} value={value[field] ?? ''} onChange={(event) => onChange({ ...value, [field]: event.target.value === '' ? undefined : Math.min(field === 'maxDistanceKm' ? 50 : 525600, Math.max(1, Math.round(Number(event.target.value)))) })} />
          {field === 'maxDistanceKm' ? <p className={styles.popoverLabel}>Se aplica desde tu ubicación o zona preferida cuando está disponible.</p> : null}
        </div> : null}
      </div>)}
      <div className={styles.chipWrapper}>
        <Chip
          className={styles.chipCompact}
          active={value.timeOfDay != null}
          aria-expanded={openChip === "timeOfDay"}
          onClick={() => {
            setOpenChip((current) => (current === "timeOfDay" ? null : "timeOfDay"));
          }}
        >
          <Icon name="clock" size={13} aria-hidden="true" />
          {timeOfDayLabel ?? "Momento"}
        </Chip>
        {openChip === "timeOfDay" ? (
          <div className={styles.popover} role="listbox" aria-label="Momento del día">
            {TIME_OF_DAY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value.timeOfDay === option.value}
                className={styles.popoverOption}
                onClick={() => {
                  onChange({
                    ...value,
                    timeOfDay: value.timeOfDay === option.value ? undefined : option.value,
                  });
                  setOpenChip(null);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.chipWrapper}>
        <Chip
          className={styles.chipCompact}
          active={value.partySize != null}
          aria-expanded={openChip === "partySize"}
          onClick={() => {
            setOpenChip((current) => (current === "partySize" ? null : "partySize"));
          }}
        >
          <Icon name="users" size={13} aria-hidden="true" />
          {value.partySize != null ? `${value.partySize} personas` : "Personas"}
        </Chip>
        {openChip === "partySize" ? (
          <div className={styles.popover}>
            <div className={styles.stepper}>
              <button
                type="button"
                className={styles.stepperButton}
                aria-label="Restar una persona"
                disabled={!value.partySize || value.partySize <= 1}
                onClick={() => {
                  const next = Math.max(1, (value.partySize ?? 2) - 1);
                  onChange({ ...value, partySize: next });
                }}
              >
                −
              </button>
              <span className={styles.stepperValue}>{value.partySize ?? 1}</span>
              <button
                type="button"
                className={styles.stepperButton}
                aria-label="Sumar una persona"
                disabled={(value.partySize ?? 1) >= 1000}
                onClick={() => {
                  const next = (value.partySize ?? 1) + 1;
                  onChange({ ...value, partySize: next });
                }}
              >
                +
              </button>
            </div>
            {value.partySize != null ? (
              <button
                type="button"
                className={styles.popoverClear}
                onClick={() => {
                  onChange({ ...value, partySize: undefined });
                  setOpenChip(null);
                }}
              >
                Quitar
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={styles.chipWrapper}>
        <Chip
          className={styles.chipCompact}
          active={value.budget != null}
          aria-expanded={openChip === "budget"}
          onClick={() => {
            setOpenChip((current) => (current === "budget" ? null : "budget"));
          }}
        >
          <Icon name="wallet" size={13} aria-hidden="true" />
          {value.budget != null ? `$${value.budget.toLocaleString("es-AR")}` : "Presupuesto"}
        </Chip>
        {openChip === "budget" ? (
          <div className={styles.popover}>
            <label className={styles.popoverLabel} htmlFor="context-budget">
              Presupuesto estimado
            </label>
            <p className={styles.popoverLabel}>En pesos argentinos, para todo el grupo.</p>
            <input
              id="context-budget"
              type="number"
              min={0}
              step={500}
              className={styles.popoverInput}
              value={value.budget ?? ""}
              onChange={(event) => {
                const raw = event.target.value;
                onChange({
                  ...value,
                  budget: raw === "" ? undefined : Math.max(0, Number(raw)),
                });
              }}
              placeholder="$5.000"
            />
          </div>
        ) : null}
      </div>

      <AtHomeFreeChips value={value} onChange={onChange} />
    </div>
  );
}

/**
 * "En casa" and "Gratis" (#210): two toggles that send `atHome` and
 * `freeOnly`. The landing hero shows no chips: there the back reads both
 * from what the user writes.
 */
function AtHomeFreeChips({ value, onChange }: ContextChipsProps) {
  return (
    <>
      <Chip
        className={styles.chipCompact}
        active={value.atHome === true}
        onClick={() => onChange({ ...value, atHome: value.atHome ? undefined : true })}
      >
        <Icon name="house" size={13} aria-hidden="true" />
        En casa
      </Chip>
      <Chip
        className={styles.chipCompact}
        active={value.freeOnly === true}
        onClick={() => onChange({ ...value, freeOnly: value.freeOnly ? undefined : true })}
      >
        <Icon name="tag" size={13} aria-hidden="true" />
        Gratis
      </Chip>
    </>
  );
}
