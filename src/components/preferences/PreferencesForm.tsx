"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button, Icon } from "@/components/ui";
import { ApiError, getPreferences, listCategories, updatePreferences } from "@/lib/api";
import type { CategoryOption } from "@/types";

import { categoryPresentation } from "./categoryPresentation";
import { InterestTile } from "./InterestTile";
import { PreferenceProgress } from "./PreferenceProgress";
import { PreferenceSteps, type PreferenceStep } from "./PreferenceSteps";
import { PreferencesActions } from "./PreferencesActions";
import styles from "./preferences.module.css";

const CATEGORY_PAGE_LIMIT = 50;
const SKELETON_TILE_COUNT = 10;
const GENERIC_SAVE_ERROR = "No pudimos guardar tus preferencias. Intentá de nuevo.";
type LoadStatus = "loading" | "loaded" | "error";

function saveErrorMessage(error: ApiError): string {
  if (error.code === "CATEGORY_NOT_AVAILABLE") {
    return "Una de las categorías que elegiste ya no está disponible. Actualizá la página y volvé a intentar.";
  }
  if (error.code === "VALIDATION_FAILED") return "Revisá los datos marcados antes de guardar.";
  if (error.isForbidden) return "No tenés permiso para hacer esto.";
  return error.isNetworkError ? error.message : GENERIC_SAVE_ERROR;
}

function sameSelection(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}

function parseBudget(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedArea(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function PreferencesHeader() {
  return (
    <header className={styles.pageHeader}>
      <h1 className={styles.heading}>
        Afiná los planes que <span>smartplan</span> arma para vos.
      </h1>
      <p className={styles.subtitle}>
        Tus respuestas nos ayudan a recomendar mejor. Podés cambiarlas cuando quieras.
      </p>
    </header>
  );
}

interface PresentedCategory {
  category: CategoryOption;
  presentation: ReturnType<typeof categoryPresentation>;
  apiIndex: number;
}

function presentCategories(categories: CategoryOption[]): PresentedCategory[] {
  return categories
    .map((category, apiIndex) => ({
      category,
      presentation: categoryPresentation(category),
      apiIndex,
    }))
    .sort((left, right) => {
      const leftOrder = left.presentation.displayOrder;
      const rightOrder = right.presentation.displayOrder;
      if (leftOrder === null && rightOrder === null) return left.apiIndex - right.apiIndex;
      if (leftOrder === null) return 1;
      if (rightOrder === null) return -1;
      return leftOrder - rightOrder;
    });
}

function LoadingState() {
  return (
    <div className={styles.experience}>
      <PreferencesHeader />
      <p className={styles.srOnly} role="status">Cargando tus preferencias…</p>
      <div className={styles.loadingLayout} aria-hidden="true">
        <span className={styles.skeletonSteps} />
        <div className={styles.skeletonGrid}>
          {Array.from({ length: SKELETON_TILE_COUNT }, (_, index) => (
            <span key={index} className={styles.skeletonTile} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.experience}>
      <PreferencesHeader />
      <div className={styles.loadError} role="alert">
        <span className={styles.errorIcon} aria-hidden="true"><Icon name="circle-alert" size={24} /></span>
        <div>
          <h2>Tus preferencias se tomaron una pausa</h2>
          <p>No pudimos cargarlas. Intentá de nuevo.</p>
        </div>
        <Button type="button" variant="primary" onClick={onRetry}>Reintentar</Button>
      </div>
    </div>
  );
}

/** CU8/CU18 · PAN 15 — Edit and personalize user preferences. */
export function PreferencesForm() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [retryToken, setRetryToken] = useState(0);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [savedIds, setSavedIds] = useState<Set<number>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [savedBudget, setSavedBudget] = useState<number | null>(null);
  const [budget, setBudget] = useState("");
  const [savedArea, setSavedArea] = useState<string | null>(null);
  const [area, setArea] = useState("");
  const [activeStep, setActiveStep] = useState<PreferenceStep>("interests");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastState, setToastState] = useState<"hidden" | "visible" | "leaving">("hidden");

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus("loading");
      try {
        const [catalog, preferences] = await Promise.all([
          listCategories({ limit: CATEGORY_PAGE_LIMIT }),
          getPreferences(),
        ]);
        if (ignore) return;
        const catalogIds = new Set(catalog.data.map((category) => category.id));
        const ids = new Set(
          preferences.categories.map((category) => category.id).filter((id) => catalogIds.has(id)),
        );
        setCategories(catalog.data);
        setSavedIds(ids);
        setSelectedIds(new Set(ids));
        setSavedBudget(preferences.usualBudget);
        setBudget(preferences.usualBudget?.toString() ?? "");
        setSavedArea(preferences.preferredArea);
        setArea(preferences.preferredArea ?? "");
        setFormError(null);
        setStatus("loaded");
      } catch {
        if (!ignore) setStatus("error");
      }
    }
    void load();
    return () => { ignore = true; };
  }, [retryToken]);

  useEffect(() => {
    if (toastState === "hidden") return;
    const delay = toastState === "visible" ? 2400 : 220;
    const timer = window.setTimeout(
      () => setToastState(toastState === "visible" ? "leaving" : "hidden"),
      delay,
    );
    return () => window.clearTimeout(timer);
  }, [toastState]);

  const parsedBudget = parseBudget(budget);
  const currentArea = normalizedArea(area);
  const budgetError = budget.trim() !== "" && (parsedBudget === null || parsedBudget <= 0)
    ? "Ingresá un presupuesto válido mayor a $0" : null;
  const areaError = currentArea !== null && currentArea.length < 2
    ? "Ingresá una zona más específica" : null;
  const isDirty = useMemo(
    () => !sameSelection(selectedIds, savedIds) || parsedBudget !== savedBudget || currentArea !== savedArea,
    [currentArea, parsedBudget, savedArea, savedBudget, savedIds, selectedIds],
  );
  const presentedCategories = useMemo(() => presentCategories(categories), [categories]);
  const completedSteps = {
    interests: selectedIds.size > 0,
    budget: parsedBudget !== null && parsedBudget > 0,
    area: currentArea !== null && currentArea.length >= 2,
  };
  const completionCount = Object.values(completedSteps).filter(Boolean).length;

  function toggleCategory(categoryId: number) {
    setFormError(null);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(categoryId)) next.add(categoryId);
      return next;
    });
  }

  function discardChanges() {
    setSelectedIds(new Set(savedIds));
    setBudget(savedBudget?.toString() ?? "");
    setArea(savedArea ?? "");
    setFormError(null);
  }

  async function submit() {
    setFormError(null);
    if (!isDirty) return;
    if (budgetError) { setActiveStep("budget"); return; }
    if (areaError) { setActiveStep("area"); return; }
    setSaving(true);
    try {
      const updated = await updatePreferences({
        categoryIds: [...selectedIds],
        usualBudget: parsedBudget,
        preferredArea: currentArea,
      });
      const ids = new Set(updated.categories.map((category) => category.id));
      setSavedIds(ids);
      setSelectedIds(new Set(ids));
      setSavedBudget(updated.usualBudget);
      setBudget(updated.usualBudget?.toString() ?? "");
      setSavedArea(updated.preferredArea);
      setArea(updated.preferredArea ?? "");
      setToastState("visible");
    } catch (error) {
      setFormError(error instanceof ApiError ? saveErrorMessage(error) : GENERIC_SAVE_ERROR);
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  if (status === "loading") return <LoadingState />;
  if (status === "error") return <LoadErrorState onRetry={() => setRetryToken((token) => token + 1)} />;

  const stepIndex = { interests: 0, budget: 1, area: 2 }[activeStep];
  const nextStep: Record<PreferenceStep, PreferenceStep | null> = {
    interests: "budget",
    budget: "area",
    area: null,
  };
  const prevStep: Record<PreferenceStep, PreferenceStep | null> = {
    interests: null,
    budget: "interests",
    area: "budget",
  };

  return (
    <>
      <form className={styles.experience} onSubmit={handleSubmit} noValidate>
        <PreferencesHeader />
        <div className={styles.workflow}>
          <PreferenceSteps
            activeStep={activeStep}
            completed={completedSteps}
            interestCount={selectedIds.size}
            budgetValue={parsedBudget}
            areaValue={currentArea}
            onChange={setActiveStep}
          />
          <section className={styles.stepPanel} aria-live="polite">
            <p className={`sp-label ${styles.stepEyebrow}`}>Paso {stepIndex + 1} de 3</p>

            {activeStep === "interests" ? (
              <fieldset className={styles.fieldset}>
                <legend>1. Intereses</legend>
                <p className={styles.stepHint}>¿Qué cosas te interesan? Seleccioná las categorías que más disfrutás para recomendarte planes que realmente te encanten.</p>
                {presentedCategories.length === 0 ? (
                  <div className={styles.emptyState}><Icon name="inbox" size={26} /><p>Todavía no hay categorías disponibles.</p></div>
                ) : (
                  <div className={styles.interestGrid}>
                    {presentedCategories.map(({ category, presentation }, index) => (
                      <InterestTile
                        key={category.id}
                        categoryId={category.id}
                        presentation={presentation}
                        selected={selectedIds.has(category.id)}
                        disabled={saving}
                        index={index}
                        onToggle={toggleCategory}
                      />
                    ))}
                  </div>
                )}
                <div className={styles.helpBanner}>
                  <span className={styles.helpBannerIcon} aria-hidden="true"><Icon name="sparkles" size={16} /></span>
                  <p>
                    <strong>Con tus intereses, personalizamos cada recomendación.</strong>
                    Así descubrís planes que se adaptan a vos, tu momento y tu estilo.
                  </p>
                </div>
              </fieldset>
            ) : null}

            {activeStep === "budget" ? (
              <fieldset className={styles.fieldset}>
                <legend>2. Presupuesto habitual</legend>
                <p className={styles.stepHint}>Usamos este monto como referencia para evitar planes fuera de rango. Después podés cambiarlo en cada búsqueda.</p>
                <div className={styles.focusField}>
                  <label htmlFor="usual-budget">¿Cuánto solés gastar por salida?</label>
                  <div className={styles.moneyInput}>
                    <span aria-hidden="true">$</span>
                    <input id="usual-budget" type="number" min="1" max="99999999.99" step="100" inputMode="decimal" value={budget}
                      onChange={(event) => { setBudget(event.target.value); setFormError(null); }}
                      aria-invalid={budgetError ? "true" : undefined} aria-describedby="budget-help" disabled={saving} placeholder="Ej. 35000" />
                  </div>
                  <p id="budget-help" className={budgetError ? styles.fieldError : styles.fieldHelp} role={budgetError ? "alert" : undefined}>
                    {budgetError ?? "En pesos argentinos. Podés dejarlo sin definir."}
                  </p>
                </div>
                <div className={styles.helpBanner}>
                  <span className={styles.helpBannerIcon} aria-hidden="true"><Icon name="wallet" size={16} /></span>
                  <p>
                    <strong>Tu presupuesto habitual guía cada búsqueda.</strong>
                    Evitamos sugerirte planes que se salgan de rango, sin dejar de sorprenderte.
                  </p>
                </div>
              </fieldset>
            ) : null}

            {activeStep === "area" ? (
              <fieldset className={styles.fieldset}>
                <legend>3. Zona preferida</legend>
                <p className={styles.stepHint}>Contanos desde dónde solés arrancar. Así priorizamos planes que tengan sentido para vos.</p>
                <div className={styles.focusField}>
                  <label htmlFor="preferred-area">Barrio, ciudad o departamento</label>
                  <div className={styles.areaInput}>
                    <Icon name="map-pin" size={20} />
                    <input id="preferred-area" type="text" maxLength={120} value={area}
                      onChange={(event) => { setArea(event.target.value); setFormError(null); }}
                      aria-invalid={areaError ? "true" : undefined} aria-describedby="area-help" disabled={saving}
                      placeholder="Ej. Mendoza Capital" autoComplete="address-level2" />
                  </div>
                  <p id="area-help" className={areaError ? styles.fieldError : styles.fieldHelp} role={areaError ? "alert" : undefined}>
                    {areaError ?? "No hace falta una dirección exacta. Podés dejarla sin definir."}
                  </p>
                </div>
                <div className={styles.helpBanner}>
                  <span className={styles.helpBannerIcon} aria-hidden="true"><Icon name="map-pin" size={16} /></span>
                  <p>
                    <strong>Priorizamos planes cerca tuyo.</strong>
                    No hace falta una dirección exacta: con el barrio o la ciudad alcanza.
                  </p>
                </div>
              </fieldset>
            ) : null}

            <div className={styles.stepFooter}>
              {(() => {
                const previous = prevStep[activeStep];
                return previous ? (
                  <Button type="button" variant="ghostLight" onClick={() => setActiveStep(previous)}>
                    <Icon name="arrow-left" size={16} /> Volver
                  </Button>
                ) : (
                  <span className={styles.stepFooterSpacer} aria-hidden="true" />
                );
              })()}
              {(() => {
                const next = nextStep[activeStep];
                return next ? (
                  <Button type="button" onClick={() => setActiveStep(next)}>
                    Siguiente <Icon name="arrow-right" size={16} />
                  </Button>
                ) : (
                  <p className={styles.readyMessage}><Icon name="circle-check" size={18} />Ya podés guardar tu perfil.</p>
                );
              })()}
            </div>
          </section>
        </div>
        <PreferencesActions
          dirty={isDirty}
          saving={saving}
          error={formError}
          progress={<PreferenceProgress completed={completionCount} total={3} />}
          onDiscard={discardChanges}
        />
      </form>

      {toastState !== "hidden" ? (
        <div className={toastState === "leaving" ? `${styles.toast} ${styles.toastOut}` : styles.toast} role="status">
          <Icon name="circle-check" size={17} /> Perfil de preferencias guardado
        </div>
      ) : null}
    </>
  );
}
