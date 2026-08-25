"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, Icon } from "@/components/ui";
import { useDebouncedValue } from "@/hooks";
import { searchPlaces, searchActivities, createPlan, addPlanActivity, ApiError } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import { formatArs, formatDuration } from "@/lib/utils";
import type { ActivitySearchResult } from "@/types";
import type { PlaceSummary } from "@/lib/api/places";

import styles from "./plan-create.module.css";

export function CreatePlanForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form Fields State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const [date, setDate] = useState("");

  // Location Autocomplete State
  const [locationSearch, setLocationSearch] = useState("");
  const debouncedLocationSearch = useDebouncedValue(locationSearch, 400);
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSummary[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSummary | null>(null);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Activities Search State
  const [activitySearch, setActivitySearch] = useState("");
  const debouncedActivitySearch = useDebouncedValue(activitySearch, 400);
  const [activitySuggestions, setActivitySuggestions] = useState<ActivitySearchResult[]>([]);
  const [isSearchingActivities, setIsSearchingActivities] = useState(false);

  // Selected Itinerary State
  const [selectedActivities, setSelectedActivities] = useState<ActivitySearchResult[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Form validation errors
  const [titleError, setTitleError] = useState<string | null>(null);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Cancel Confirmation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Close place suggestions dropdown on outer click
  useEffect(() => {
    function handleOuterClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleOuterClick);
    return () => document.removeEventListener("mousedown", handleOuterClick);
  }, []);

  // Location search effect
  useEffect(() => {
    if (debouncedLocationSearch.trim().length < 2) {
      return;
    }

    // Skip query if current search matches the selected place address
    if (selectedPlace && selectedPlace.address === debouncedLocationSearch) {
      return;
    }

    let active = true;

    searchPlaces(debouncedLocationSearch)
      .then((res) => {
        if (!active) return;
        setPlaceSuggestions(res.data);
        setIsSearchingPlaces(false);
        if (res.data.length === 0) {
          setLocationError("No pudimos encontrar esa ubicación");
        }
      })
      .catch(() => {
        if (!active) return;
        setIsSearchingPlaces(false);
        setLocationError("Error al buscar ubicaciones. Intentá de nuevo.");
      });

    return () => {
      active = false;
    };
  }, [debouncedLocationSearch, selectedPlace]);

  // Activities search effect
  useEffect(() => {
    if (debouncedActivitySearch.trim().length < 2) {
      return;
    }

    let active = true;

    searchActivities({ search: debouncedActivitySearch, limit: 5 })
      .then((res) => {
        if (!active) return;
        setActivitySuggestions(res.data);
        setIsSearchingActivities(false);
      })
      .catch(() => {
        if (!active) return;
        setIsSearchingActivities(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedActivitySearch]);

  const handleSelectPlace = (place: PlaceSummary) => {
    setSelectedPlace(place);
    setLocationSearch(place.address);
    setPlaceSuggestions([]);
    setLocationError(null);
    setShowSuggestions(false);
  };

  const handleAddActivity = (activity: ActivitySearchResult) => {
    // Avoid duplicates
    const exists = selectedActivities.some((act) => act.id === activity.id);
    if (exists) {
      setActivityError("La actividad ya fue incorporada");
      setTimeout(() => setActivityError(null), 3000);
      return;
    }

    setSelectedActivities((prev) => [...prev, activity]);
    setActivitySearch("");
    setActivitySuggestions([]);
    setActivityError(null);
  };

  const handleRemoveActivity = (id: number) => {
    setSelectedActivities((prev) => prev.filter((act) => act.id !== id));
  };

  // Calculations
  const totalCost = selectedActivities.reduce((sum, act) => sum + act.estimatedCost, 0);
  const totalDuration = selectedActivities.reduce((sum, act) => sum + act.estimatedDuration, 0);
  const costPerPerson = peopleCount > 0 ? totalCost / peopleCount : 0;

  // Form Dirtiness Check
  const isDirty = () => {
    return (
      title.trim() !== "" ||
      description.trim() !== "" ||
      peopleCount !== 1 ||
      locationSearch.trim() !== "" ||
      selectedActivities.length > 0
    );
  };

  const handleCancelClick = () => {
    if (isDirty()) {
      setShowCancelModal(true);
    } else {
      router.push(ROUTES.explore);
    }
  };

  const handleConfirmCancel = () => {
    router.push(ROUTES.explore);
  };

  const submitForm = async () => {
    setTitleError(null);
    setPeopleError(null);
    setSubmitError(null);
    setSubmitSuccess(null);

    let hasErrors = false;

    if (!title.trim()) {
      setTitleError("El nombre del plan es obligatorio");
      hasErrors = true;
    }

    if (!peopleCount || peopleCount < 1) {
      setPeopleError("La cantidad de personas debe ser al menos 1");
      hasErrors = true;
    }

    if (!selectedPlace) {
      setLocationError("No pudimos encontrar esa ubicación");
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    startTransition(async () => {
      try {
        // Step 1: Create Plan base
        const newPlan = await createPlan({
          title: title.trim(),
          description: description.trim() || null,
          peopleCount: peopleCount,
        });

        // Step 2: Sequentially Add activities
        for (const activity of selectedActivities) {
          await addPlanActivity(newPlan.id, activity.id);
        }

        setSubmitSuccess("Plan creado correctamente");
        
        // Wait briefly for user to see success state, then redirect
        setTimeout(() => {
          router.push(`${ROUTES.plans}/${newPlan.id}`);
        }, 1500);

      } catch (error: unknown) {
        console.error(error);
        const message = error instanceof ApiError ? error.message : "No pudimos crear el plan. Intentá nuevamente.";
        setSubmitError(message);
      }
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submitForm();
  };


  return (
    <div className={styles.container}>
      {/* LEFT: General details form */}
      <div>
        <h1 className="sp-h2 styles.title">Crear Plan</h1>
        <div className={styles.card}>
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            
            {/* Nombre */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={`sp-label ${styles.label}`}>
                  Nombre del plan
                </label>
                <span className={styles.required} aria-hidden="true">*</span>
              </div>
              <input
                type="text"
                className={[styles.input, titleError ? styles.inputInvalid : ""].join(" ")}
                placeholder="Ej. Domingo de bodegas con amigos"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (e.target.value.trim()) setTitleError(null);
                }}
                disabled={isPending}
              />
              {titleError && <p className={styles.fieldError}>{titleError}</p>}
            </div>

            {/* Descripción */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={`sp-label ${styles.label}`}>
                  Descripción
                </label>
              </div>
              <textarea
                className={styles.textarea}
                placeholder="Describí brevemente tu itinerario o plan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Fecha y Personas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {/* Fecha */}
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={`sp-label ${styles.label}`}>
                    Fecha
                  </label>
                </div>
                <input
                  type="date"
                  className={styles.input}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isPending}
                />
              </div>

              {/* Personas */}
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={`sp-label ${styles.label}`}>
                    Cantidad de personas
                  </label>
                  <span className={styles.required} aria-hidden="true">*</span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  className={[styles.input, peopleError ? styles.inputInvalid : ""].join(" ")}
                  value={peopleCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setPeopleCount(Number.isNaN(val) ? 0 : val);
                    if (val >= 1) setPeopleError(null);
                  }}
                  disabled={isPending}
                />
                {peopleError && <p className={styles.fieldError}>{peopleError}</p>}
              </div>
            </div>

            {/* Ubicación Autocomplete */}
            <div className={styles.field} ref={dropdownRef}>
              <div className={styles.labelRow}>
                <label className={`sp-label ${styles.label}`}>
                  Ubicación
                </label>
                <span className={styles.required} aria-hidden="true">*</span>
              </div>
              <div className={styles.autocompleteContainer}>
                <input
                  type="text"
                  className={[styles.input, locationError ? styles.inputInvalid : ""].join(" ")}
                  placeholder="Buscá y seleccioná un lugar del plan..."
                  value={locationSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocationSearch(val);
                    setSelectedPlace(null);
                    setShowSuggestions(true);
                    if (val.trim().length >= 2) {
                      setIsSearchingPlaces(true);
                      setLocationError(null);
                    } else {
                      setPlaceSuggestions([]);
                      setIsSearchingPlaces(false);
                      setLocationError(null);
                    }
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  disabled={isPending}
                />
                {isSearchingPlaces && (
                  <div style={{ position: "absolute", right: "12px", top: "14px" }}>
                    <Icon name="loader-circle" size={18} className="sp-animate-spin" />
                  </div>
                )}
                
                {showSuggestions && placeSuggestions.length > 0 && (
                  <ul className={styles.suggestionsList}>
                    {placeSuggestions.map((place) => (
                      <li key={place.id}>
                        <button
                          type="button"
                          className={styles.suggestionItem}
                          onClick={() => handleSelectPlace(place)}
                        >
                          <span className={styles.suggestionItemTitle}>{place.name}</span>
                          <span className={styles.suggestionItemAddress}>{place.address}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {locationError && <p className={styles.fieldError}>{locationError}</p>}
            </div>

            {/* Status Feedback */}
            {submitError && (
              <div className={`${styles.toast} ${styles.toastError}`}>
                <Icon name="triangle-alert" size={16} />
                <span>{submitError}</span>
              </div>
            )}
            {submitSuccess && (
              <div className={`${styles.toast} ${styles.toastSuccess}`}>
                <Icon name="circle-check" size={16} />
                <span>{submitSuccess}</span>
              </div>
            )}

            {/* Form Actions */}
            <div className={styles.actionRow}>
              <Button
                variant="ghostLight"
                onClick={handleCancelClick}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isPending}
              >
                {isPending ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Icon name="loader-circle" size={16} className="sp-animate-spin" />
                    Guardando...
                  </span>
                ) : (
                  "Guardar Plan"
                )}
              </Button>
            </div>

          </form>
        </div>
      </div>

      {/* RIGHT: Itinerary planner and activities selector */}
      <div>
        <h2 className="sp-h3" style={{ marginBottom: "var(--s-4)" }}>Actividades del plan</h2>

        {/* Selected activities itinerary list */}
        {selectedActivities.length > 0 ? (
          <div className={styles.itineraryList}>
            {selectedActivities.map((act, index) => (
              <div key={act.id} className={styles.itineraryRow}>
                <div className={styles.timeline}>
                  <span className={styles.timelineDot}>{index + 1}</span>
                  {index < selectedActivities.length - 1 && (
                    <span className={styles.timelineLine} />
                  )}
                </div>
                <div className={styles.itineraryCard}>
                  <div>
                    <p className={styles.itineraryName}>{act.name}</p>
                    <div className={styles.itineraryMeta}>
                      <span>{act.type || "Actividad"}</span>
                      <span>•</span>
                      <span>{formatDuration(act.estimatedDuration)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span className={styles.itineraryCost}>
                      {formatArs(act.estimatedCost)}
                    </span>
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => handleRemoveActivity(act.id)}
                      aria-label="Quitar actividad"
                      disabled={isPending}
                    >
                      <Icon name="trash-2" size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: "32px 20px", textAlign: "center",
            background: "rgba(26,17,9,0.03)", border: "1.5px dashed var(--hairline)",
            borderRadius: "var(--r-card-sm)", marginBottom: "var(--s-4)"
          }}>
            <p style={{ color: "var(--fg-3)", fontSize: "14px", margin: 0 }}>
              Aún no agregaste actividades. Usá el buscador de abajo para sumar paradas a tu plan.
            </p>
          </div>
        )}

        {/* Real-time estimated totals breakdown card */}
        <div className={styles.summarySection}>
          <p className={styles.summaryTitle}>Resumen Estimado</p>
          <div className={styles.summaryRow}>
            <span>Actividades</span>
            <span>{selectedActivities.length}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Duración total</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Costo por persona</span>
            <span>{formatArs(costPerPerson)}</span>
          </div>
          <div className={styles.summaryRowTotal}>
            <span>Costo Total</span>
            <span>{formatArs(totalCost)}</span>
          </div>
        </div>

        {/* Activity Search Selector */}
        <div className={styles.activitySelector}>
          <div className={styles.labelRow}>
            <label className={`sp-label ${styles.label}`}>
              Buscar Actividad
            </label>
          </div>
          <div className={styles.autocompleteContainer}>
            <input
              type="text"
              className={styles.activitySearchInput}
              placeholder="Escribí para buscar actividades (ej. Degustación, Jazz)..."
              value={activitySearch}
              onChange={(e) => {
                const val = e.target.value;
                setActivitySearch(val);
                if (val.trim().length >= 2) {
                  setIsSearchingActivities(true);
                } else {
                  setActivitySuggestions([]);
                  setIsSearchingActivities(false);
                }
              }}
              disabled={isPending}
            />
            {isSearchingActivities && (
              <div style={{ position: "absolute", right: "12px", top: "14px" }}>
                <Icon name="loader-circle" size={18} className="sp-animate-spin" />
              </div>
            )}
          </div>
          {activityError && <p className={styles.fieldError}>{activityError}</p>}

          {activitySuggestions.length > 0 && (
            <div className={styles.activityList}>
              {activitySuggestions.map((act) => (
                <div key={act.id} className={styles.activityCard}>
                  <div className={styles.activityInfo}>
                    <p className={styles.activityName}>{act.name}</p>
                    <div className={styles.activityMeta}>
                      <span>{formatArs(act.estimatedCost)}</span>
                      <span>•</span>
                      <span>{formatDuration(act.estimatedDuration)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghostEmber"
                    size="sm"
                    onClick={() => handleAddActivity(act)}
                    disabled={isPending}
                  >
                    + Agregar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCancelModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>
              <Icon name="triangle-alert" size={24} />
            </div>
            <div>
              <h2 className="sp-h3" style={{ margin: "0 0 6px" }}>Descartar cambios</h2>
              <p style={{ margin: 0, color: "var(--fg-2)", fontSize: "14px", lineHeight: 1.5 }}>
                ¿Seguro que querés cancelar la creación del plan? Se perderán todos los datos ingresados en el formulario.
              </p>
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="ghostLight"
                style={{ flex: 1 }}
                onClick={() => setShowCancelModal(false)}
              >
                Seguir editando
              </Button>
              <Button
                variant="danger"
                style={{ flex: 1 }}
                onClick={handleConfirmCancel}
              >
                Descartar
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
