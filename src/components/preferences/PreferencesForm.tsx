"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button, Icon } from "@/components/ui";
import {
  ApiError,
  getPreferences,
  listCategories,
  updatePreferences,
} from "@/lib/api";
import type {
  CategoryOption,
  PreferredArea,
  UpdateUserPreferencesInput,
  UserPreferencesResponse,
} from "@/types";

import { categoryPresentation } from "./categoryPresentation";
import { DeviceLocationField } from "./DeviceLocationField";
import { InterestTile } from "./InterestTile";
import { MaxDistanceField } from "./MaxDistanceField";
import { PeopleCountField } from "./PeopleCountField";
import { PreferenceProgress } from "./PreferenceProgress";
import { PreferenceSteps, type PreferenceStep } from "./PreferenceSteps";
import { PreferencesActions } from "./PreferencesActions";
import {
  PreferredAreaField,
  type PreferredAreaStatus,
} from "./PreferredAreaField";
import { ResetPreferencesDialog } from "./ResetPreferencesDialog";
import styles from "./preferences.module.css";

const CATEGORY_PAGE_LIMIT = 50;
const SKELETON_TILE_COUNT = 10;
const GENERIC_SAVE_ERROR =
  "No pudimos guardar tus preferencias. Intentá de nuevo.";
const CONFIRM_AREA_ERROR = "Confirmá tu ubicación preferida antes de guardar.";
const TOTAL_FIELDS = 5;

type LoadStatus = "loading" | "loaded" | "error";

const EMPTY_PROFILE: UpdateUserPreferencesInput = {
  categoryIds: [],
  usualBudget: null,
  usualPeopleCount: null,
  preferredArea: null,
  useDeviceLocation: false,
  maxDistanceKm: null,
};

function saveErrorMessage(error: ApiError): string {
  if (error.code === "CATEGORY_NOT_AVAILABLE") {
    return "Una de las categorías que elegiste ya no está disponible. Actualizá la página y volvé a intentar.";
  }
  if (error.code === "VALIDATION_FAILED") {
    return "Revisá los datos marcados antes de guardar.";
  }
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

function samePlace(a: PreferredArea | null, b: PreferredArea | null): boolean {
  return (a?.placeId ?? null) === (b?.placeId ?? null);
}

function PreferencesHeader() {
  return (
    <header className={styles.pageHeader}>
      <h1 className={styles.heading}>
        Afiná los planes que <span>smartplan</span> arma para vos.
      </h1>
      <p className={styles.subtitle}>
        Tus respuestas nos ayudan a recomendar mejor. Podés cambiarlas cuando
        quieras.
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
      if (leftOrder === null && rightOrder === null) {
        return left.apiIndex - right.apiIndex;
      }
      if (leftOrder === null) return 1;
      if (rightOrder === null) return -1;
      return leftOrder - rightOrder;
    });
}

function LoadingState() {
  return (
    <div className={styles.experience}>
      <PreferencesHeader />
      <p className={styles.srOnly} role="status">
        Cargando tus preferencias…
      </p>
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
        <span className={styles.errorIcon} aria-hidden="true">
          <Icon name="circle-alert" size={24} />
        </span>
        <div>
          <h2>Tus preferencias se tomaron una pausa</h2>
          <p>No pudimos cargarlas. Intentá de nuevo.</p>
        </div>
        <Button type="button" variant="primary" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}

const STEP_ORDER: PreferenceStep[] = ["interests", "outing", "location"];

/** CU8/CU18 · PAN 15 — Edit and personalize user preferences. */
export function PreferencesForm() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [retryToken, setRetryToken] = useState(0);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [savedIds, setSavedIds] = useState<Set<number>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [savedBudget, setSavedBudget] = useState<number | null>(null);
  const [budget, setBudget] = useState("");
  const [savedPeople, setSavedPeople] = useState<number | null>(null);
  const [people, setPeople] = useState<number | null>(null);
  const [savedArea, setSavedArea] = useState<PreferredArea | null>(null);
  const [areaText, setAreaText] = useState("");
  const [area, setArea] = useState<PreferredArea | null>(null);
  const [areaStatus, setAreaStatus] = useState<PreferredAreaStatus>("empty");
  const [savedUseDevice, setSavedUseDevice] = useState(false);
  const [useDevice, setUseDevice] = useState(false);
  const [savedMaxDistance, setSavedMaxDistance] = useState<number | null>(null);
  const [maxDistance, setMaxDistance] = useState<number | null>(null);

  const [activeStep, setActiveStep] = useState<PreferenceStep>("interests");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState<{
    key: number;
    text: string;
    state: "visible" | "leaving";
  } | null>(null);

  function hydrate(
    preferences: UserPreferencesResponse,
    catalogIds: Set<number>,
  ) {
    const ids = new Set(
      preferences.categories
        .map((category) => category.id)
        .filter((id) => catalogIds.has(id)),
    );
    setSavedIds(ids);
    setSelectedIds(new Set(ids));
    setSavedBudget(preferences.usualBudget);
    setBudget(preferences.usualBudget?.toString() ?? "");
    setSavedPeople(preferences.usualPeopleCount);
    setPeople(preferences.usualPeopleCount);
    setSavedArea(preferences.preferredArea);
    setArea(preferences.preferredArea);
    setAreaText(preferences.preferredArea?.label ?? "");
    setAreaStatus(preferences.preferredArea ? "resolved" : "empty");
    setSavedUseDevice(preferences.useDeviceLocation);
    setUseDevice(preferences.useDeviceLocation);
    setSavedMaxDistance(preferences.maxDistanceKm);
    setMaxDistance(preferences.maxDistanceKm);
    setFormError(null);
  }

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
        setCategories(catalog.data);
        hydrate(
          preferences,
          new Set(catalog.data.map((category) => category.id)),
        );
        setStatus("loaded");
      } catch {
        if (!ignore) setStatus("error");
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [retryToken]);

  useEffect(() => {
    if (!toast) return;
    const delay = toast.state === "visible" ? 2600 : 240;
    const timer = window.setTimeout(() => {
      setToast((current) =>
        current === null
          ? null
          : current.state === "visible"
            ? { ...current, state: "leaving" }
            : null,
      );
    }, delay);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const parsedBudget = parseBudget(budget);
  const budgetError =
    budget.trim() !== "" && (parsedBudget === null || parsedBudget <= 0)
      ? "Ingresá un presupuesto válido mayor a $0"
      : null;

  const areaPending =
    areaText.trim() !== "" &&
    (areaStatus === "unconfirmed" ||
      areaStatus === "notfound" ||
      areaStatus === "error" ||
      areaStatus === "searching");

  const areaChanged =
    !samePlace(area, savedArea) ||
    areaText.trim() !== (savedArea?.label ?? "").trim();

  const isDirty = useMemo(
    () =>
      !sameSelection(selectedIds, savedIds) ||
      parsedBudget !== savedBudget ||
      people !== savedPeople ||
      areaChanged ||
      useDevice !== savedUseDevice ||
      maxDistance !== savedMaxDistance,
    [
      areaChanged,
      maxDistance,
      parsedBudget,
      people,
      savedBudget,
      savedIds,
      savedMaxDistance,
      savedPeople,
      savedUseDevice,
      selectedIds,
      useDevice,
    ],
  );

  const presentedCategories = useMemo(
    () => presentCategories(categories),
    [categories],
  );

  const completed: Record<PreferenceStep, boolean> = {
    interests: selectedIds.size > 0,
    outing: (parsedBudget !== null && parsedBudget > 0) || people !== null,
    location: area !== null || maxDistance !== null || useDevice,
  };
  const completionCount =
    (selectedIds.size > 0 ? 1 : 0) +
    (parsedBudget !== null && parsedBudget > 0 ? 1 : 0) +
    (people !== null ? 1 : 0) +
    (area !== null ? 1 : 0) +
    (maxDistance !== null ? 1 : 0);

  const busy = saving || resetting;

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
    setPeople(savedPeople);
    setArea(savedArea);
    setAreaText(savedArea?.label ?? "");
    setAreaStatus(savedArea ? "resolved" : "empty");
    setUseDevice(savedUseDevice);
    setMaxDistance(savedMaxDistance);
    setFormError(null);
  }

  async function persist(
    payload: UpdateUserPreferencesInput,
    successToast: string,
  ): Promise<boolean> {
    try {
      const updated = await updatePreferences(payload);
      const ids = new Set(updated.categories.map((category) => category.id));
      setSavedIds(ids);
      setSelectedIds(new Set(ids));
      setSavedBudget(updated.usualBudget);
      setBudget(updated.usualBudget?.toString() ?? "");
      setSavedPeople(updated.usualPeopleCount);
      setPeople(updated.usualPeopleCount);
      setSavedArea(updated.preferredArea);
      setArea(updated.preferredArea);
      setAreaText(updated.preferredArea?.label ?? "");
      setAreaStatus(updated.preferredArea ? "resolved" : "empty");
      setSavedUseDevice(updated.useDeviceLocation);
      setUseDevice(updated.useDeviceLocation);
      setSavedMaxDistance(updated.maxDistanceKm);
      setMaxDistance(updated.maxDistanceKm);
      setFormError(null);
      setToast({ key: Date.now(), text: successToast, state: "visible" });
      return true;
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? saveErrorMessage(error)
          : GENERIC_SAVE_ERROR,
      );
      return false;
    }
  }

  async function submit() {
    setFormError(null);
    if (!isDirty) return;
    if (budgetError) {
      setActiveStep("outing");
      return;
    }
    if (areaPending) {
      setActiveStep("location");
      setFormError(CONFIRM_AREA_ERROR);
      return;
    }

    setSaving(true);
    await persist(
      {
        categoryIds: [...selectedIds],
        usualBudget: parsedBudget,
        usualPeopleCount: people,
        preferredArea: area,
        useDeviceLocation: useDevice,
        maxDistanceKm: maxDistance,
      },
      "Perfil de preferencias guardado",
    );
    setSaving(false);
  }

  async function confirmReset() {
    setResetting(true);
    const done = await persist(EMPTY_PROFILE, "Preferencias restablecidas");
    setResetting(false);
    if (done) setResetOpen(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  if (status === "loading") return <LoadingState />;
  if (status === "error") {
    return (
      <LoadErrorState onRetry={() => setRetryToken((token) => token + 1)} />
    );
  }

  const stepIndex = STEP_ORDER.indexOf(activeStep);
  const previousStep = stepIndex > 0 ? STEP_ORDER[stepIndex - 1] : null;
  const nextStep =
    stepIndex < STEP_ORDER.length - 1 ? STEP_ORDER[stepIndex + 1] : null;

  return (
    <>
      <form className={styles.experience} onSubmit={handleSubmit} noValidate>
        <PreferencesHeader />
        <div className={styles.workflow}>
          <PreferenceSteps
            activeStep={activeStep}
            completed={completed}
            interestCount={selectedIds.size}
            budgetValue={parsedBudget}
            peopleValue={people}
            areaLabel={area?.label ?? null}
            maxDistanceKm={maxDistance}
            onChange={setActiveStep}
          />
          <section className={styles.stepPanel} aria-live="polite">
            <p className={`sp-label ${styles.stepEyebrow}`}>
              Paso {stepIndex + 1} de {STEP_ORDER.length}
            </p>

            {activeStep === "interests" ? (
              <fieldset className={styles.fieldset}>
                <legend>1. Intereses</legend>
                <p className={styles.stepHint}>
                  ¿Qué cosas te interesan? Seleccioná las categorías que más
                  disfrutás para recomendarte planes que realmente te encanten.
                </p>
                {presentedCategories.length === 0 ? (
                  <div className={styles.emptyState}>
                    <Icon name="inbox" size={26} />
                    <p>Todavía no hay categorías disponibles.</p>
                  </div>
                ) : (
                  <div className={styles.interestGrid}>
                    {presentedCategories.map(
                      ({ category, presentation }, index) => (
                        <InterestTile
                          key={category.id}
                          categoryId={category.id}
                          presentation={presentation}
                          selected={selectedIds.has(category.id)}
                          disabled={busy}
                          index={index}
                          onToggle={toggleCategory}
                        />
                      ),
                    )}
                  </div>
                )}
                <div className={styles.helpBanner}>
                  <span className={styles.helpBannerIcon} aria-hidden="true">
                    <Icon name="sparkles" size={16} />
                  </span>
                  <p>
                    <strong>
                      Con tus intereses, personalizamos cada recomendación.
                    </strong>
                    Así descubrís planes que se adaptan a vos, tu momento y tu
                    estilo.
                  </p>
                </div>
              </fieldset>
            ) : null}

            {activeStep === "outing" ? (
              <fieldset className={styles.fieldset}>
                <legend>2. Tu salida habitual</legend>
                <p className={styles.stepHint}>
                  Un presupuesto y una cantidad de personas de referencia. Los
                  usamos para no sugerirte planes fuera de tu rango — podés
                  ajustarlos en cada búsqueda.
                </p>

                <div className={styles.focusField}>
                  <label htmlFor="usual-budget">
                    ¿Cuánto solés gastar por salida?
                  </label>
                  <div className={styles.moneyInput}>
                    <span aria-hidden="true">$</span>
                    <input
                      id="usual-budget"
                      type="number"
                      min="1"
                      max="99999999.99"
                      step="100"
                      inputMode="decimal"
                      value={budget}
                      onChange={(event) => {
                        setBudget(event.target.value);
                        setFormError(null);
                      }}
                      aria-invalid={budgetError ? "true" : undefined}
                      aria-describedby="budget-help"
                      disabled={busy}
                      placeholder="Ej. 35000"
                    />
                  </div>
                  <p
                    id="budget-help"
                    className={
                      budgetError ? styles.fieldError : styles.fieldHelp
                    }
                    role={budgetError ? "alert" : undefined}
                  >
                    {budgetError ??
                      "En pesos argentinos. Podés dejarlo sin definir."}
                  </p>
                </div>

                <div className={styles.focusField}>
                  <span className={styles.focusFieldLabel}>
                    ¿Con cuántas personas solés salir?
                  </span>
                  <PeopleCountField
                    value={people}
                    disabled={busy}
                    onChange={(value) => {
                      setPeople(value);
                      setFormError(null);
                    }}
                  />
                  <p className={styles.fieldHelp}>
                    Contándote a vos. Podés dejarlo sin definir.
                  </p>
                </div>

                <div className={styles.helpBanner}>
                  <span className={styles.helpBannerIcon} aria-hidden="true">
                    <Icon name="wallet" size={16} />
                  </span>
                  <p>
                    <strong>Tu salida habitual guía cada búsqueda.</strong>
                    Evitamos sugerirte planes que se salgan de rango, sin dejar
                    de sorprenderte.
                  </p>
                </div>
              </fieldset>
            ) : null}

            {activeStep === "location" ? (
              <fieldset className={styles.fieldset}>
                <legend>3. Zona y distancia</legend>
                <p className={styles.stepHint}>
                  Desde dónde solés arrancar y qué tan lejos estás dispuesto a
                  moverte. Así priorizamos planes que tengan sentido para vos.
                </p>

                <div className={styles.focusField}>
                  <span className={styles.focusFieldLabel}>Zona preferida</span>
                  <PreferredAreaField
                    text={areaText}
                    resolved={area}
                    disabled={busy}
                    onTextChange={setAreaText}
                    onResolvedChange={setArea}
                    onStatusChange={(next) => {
                      setAreaStatus(next);
                      setFormError(null);
                    }}
                  />
                </div>

                <div className={styles.focusField}>
                  <span className={styles.focusFieldLabel}>
                    Ubicación del dispositivo
                  </span>
                  <DeviceLocationField
                    value={useDevice}
                    disabled={busy}
                    onChange={(value) => {
                      setUseDevice(value);
                      setFormError(null);
                    }}
                  />
                </div>

                <div className={styles.focusField}>
                  <span className={styles.focusFieldLabel}>
                    Distancia máxima
                  </span>
                  <MaxDistanceField
                    value={maxDistance}
                    disabled={busy}
                    onChange={(value) => {
                      setMaxDistance(value);
                      setFormError(null);
                    }}
                  />
                </div>

                <div className={styles.helpBanner}>
                  <span className={styles.helpBannerIcon} aria-hidden="true">
                    <Icon name="map-pin" size={16} />
                  </span>
                  <p>
                    <strong>Priorizamos planes cerca tuyo.</strong>
                    No hace falta una dirección exacta: con el barrio o la
                    ciudad alcanza.
                  </p>
                </div>
              </fieldset>
            ) : null}

            <div className={styles.stepFooter}>
              {previousStep ? (
                <Button
                  type="button"
                  variant="ghostLight"
                  onClick={() => setActiveStep(previousStep)}
                >
                  <Icon name="arrow-left" size={16} /> Volver
                </Button>
              ) : (
                <span className={styles.stepFooterSpacer} aria-hidden="true" />
              )}
              {nextStep ? (
                <Button type="button" onClick={() => setActiveStep(nextStep)}>
                  Siguiente <Icon name="arrow-right" size={16} />
                </Button>
              ) : (
                <p className={styles.readyMessage}>
                  <Icon name="circle-check" size={18} />
                  Ya podés guardar tu perfil.
                </p>
              )}
            </div>
          </section>
        </div>
        <PreferencesActions
          dirty={isDirty}
          saving={saving}
          busy={busy}
          error={formError}
          progress={
            <PreferenceProgress
              completed={completionCount}
              total={TOTAL_FIELDS}
            />
          }
          onDiscard={discardChanges}
          onReset={() => setResetOpen(true)}
        />
      </form>

      <ResetPreferencesDialog
        open={resetOpen}
        busy={resetting}
        onCancel={() => setResetOpen(false)}
        onConfirm={() => void confirmReset()}
      />

      {toast ? (
        <div
          className={
            toast.state === "leaving"
              ? `${styles.toast} ${styles.toastOut}`
              : styles.toast
          }
          role="status"
        >
          <Icon name="circle-check" size={17} /> {toast.text}
        </div>
      ) : null}
    </>
  );
}
