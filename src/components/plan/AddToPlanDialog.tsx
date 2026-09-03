"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

import { Button, Icon } from "@/components/ui";
import {
  addPlanActivity,
  ApiError,
  createPlan,
  listOwnPlans,
} from "@/lib/api";
import type { OwnPlanSummary } from "@/types";

import styles from "./AddToPlanDialog.module.css";

type LoadStatus = "loading" | "idle" | "error";
type Completion = { planTitle: string; alreadyIncluded: boolean };

export interface AddToPlanDialogProps {
  activityId: number;
  activityName: string;
  onClose: () => void;
}

export function AddToPlanDialog({
  activityId,
  activityName,
  onClose,
}: AddToPlanDialogProps) {
  const [plans, setPlans] = useState<OwnPlanSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reloadSequence, setReloadSequence] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  // Kept as the raw input value: an emptied number field reads as "",
  // and coercing on every keystroke turns that into NaN.
  const [peopleCount, setPeopleCount] = useState("2");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [peopleCountError, setPeopleCountError] = useState<string | null>(
    null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingCreatedPlan, setPendingCreatedPlan] =
    useState<OwnPlanSummary | null>(null);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const firstControlRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    firstControlRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const controls = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]',
        ),
      );
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, onClose]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setStatus("loading");
      try {
        // One page deliberately: the picker is a short list to scan, not a
        // browsable listing. Someone past 100 plans won't see the oldest
        // ones here and has to add the activity from `/plans` instead.
        const result = await listOwnPlans({
          page: 1,
          limit: 100,
          sortBy: "createdAt",
          direction: "desc",
        });
        if (ignore) return;
        // A cancelled plan is immutable back-side (`PLAN_CANCELLED`), so
        // offering it here would only produce a failed add.
        setPlans(
          result.data.filter((plan) => plan.status.key !== "cancelled"),
        );
        setStatus("idle");
      } catch (_error) {
        if (!ignore) setStatus("error");
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [reloadSequence]);

  function selectPlan(id: number) {
    setCreating(false);
    setSelectedId(id);
    setPeopleCountError(null);
    setSubmitError(null);
    setPendingCreatedPlan(null);
  }

  function beginCreation() {
    setCreating(true);
    setSelectedId(null);
    setSubmitError(null);
    setPendingCreatedPlan(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (pendingCreatedPlan) {
      await addToPlan(pendingCreatedPlan.id, pendingCreatedPlan.title, true);
      return;
    }

    if (creating) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        setTitleError("Escribí un nombre para el plan");
        return;
      }

      // The back accepts `@IsInt() @Min(1) @Max(1000)`; the 100 here is
      // the input's own ceiling, enforced on submit too so an emptied or
      // out-of-range field fails with a message instead of a 400.
      const parsedPeopleCount = Number(peopleCount);
      if (
        !Number.isInteger(parsedPeopleCount) ||
        parsedPeopleCount < 1 ||
        parsedPeopleCount > 100
      ) {
        setPeopleCountError("Indicá un número de personas entre 1 y 100");
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const created = await createPlan({
          title: trimmedTitle,
          peopleCount: parsedPeopleCount,
        });
        setPlans((current) => [created, ...current]);
        setPendingCreatedPlan(created);
        await addToPlan(created.id, created.title, true);
      } catch (_error) {
        setSubmitError("No pudimos crear el plan. Intentá nuevamente.");
        setIsSubmitting(false);
      }
      return;
    }

    const selected = plans.find(({ id }) => id === selectedId);
    if (selected) await addToPlan(selected.id, selected.title, false);
  }

  async function addToPlan(
    targetPlanId: number,
    planTitle: string,
    wasJustCreated: boolean,
  ) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await addPlanActivity(targetPlanId, activityId);
      setPendingCreatedPlan(null);
      setCompletion({
        planTitle,
        alreadyIncluded: false,
      });
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "ACTIVITY_ALREADY_IN_PLAN"
      ) {
        setPendingCreatedPlan(null);
        setCompletion({
          planTitle,
          alreadyIncluded: true,
        });
      } else if (
        error instanceof ApiError &&
        error.code === "PLAN_NOT_FOUND"
      ) {
        setPlans((current) => current.filter(({ id }) => id !== targetPlanId));
        setSelectedId(null);
        setPendingCreatedPlan(null);
        setCreating(false);
        setSubmitError("El plan ya no se encuentra disponible.");
      } else if (
        error instanceof ApiError &&
        error.code === "ACTIVITY_NOT_FOUND"
      ) {
        setPendingCreatedPlan(null);
        setSelectedId(null);
        setCreating(false);
        setSubmitError("La actividad ya no se encuentra disponible.");
      } else if (wasJustCreated) {
        setSubmitError(
          `Creamos “${planTitle}”, pero no pudimos agregar la actividad. Reintentá para completar la acción.`,
        );
      } else {
        setSubmitError("No pudimos agregar la actividad al plan. Intentá nuevamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Portaled to `document.body` — see `ConfirmationDialog`'s comment on why
  // a `position: fixed` overlay can't just render in place.
  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-plan-title"
        aria-describedby="add-plan-description"
        ref={dialogRef}
      >
        <div className={styles.dialogHeader}>
          <span className={styles.dialogIcon} aria-hidden="true">
            <Icon name="route" size={22} />
          </span>
          <div>
            <h2 id="add-plan-title" className="sp-h4">
              {completion ? "Actividad agregada al plan" : "Agregar a un plan"}
            </h2>
            <p id="add-plan-description" className={styles.intro}>
              {completion
                ? activityName
                : "Elegí en qué plan querés incluir esta actividad."}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar"
            ref={firstControlRef}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {completion ? (
          <div className={styles.success} role="status">
            <span className={styles.successIcon} aria-hidden="true">
              <Icon name="circle-check" size={28} />
            </span>
            <p>
              {completion.alreadyIncluded
                ? `Esta actividad ya estaba en “${completion.planTitle}”.`
                : `Agregamos la actividad a “${completion.planTitle}”.`}
            </p>
            <Button variant="primary" onClick={onClose}>
              Volver a la actividad
            </Button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={(event) => void submit(event)}>
            <div className={styles.content} aria-busy={status === "loading"}>
              {status === "loading" ? (
                <div className={styles.state} role="status">
                  <Icon name="loader-circle" className="sp-spin" />
                  Cargando tus planes...
                </div>
              ) : null}

              {status === "error" ? (
                <div className={styles.state} role="alert">
                  <Icon name="triangle-alert" />
                  <p>No pudimos cargar tus planes.</p>
                  <Button
                    variant="ghostLight"
                    size="sm"
                    onClick={() => setReloadSequence((current) => current + 1)}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : null}

              {status === "idle" && plans.length > 0 ? (
                <div className={styles.planList}>
                  {plans.map((plan) => (
                    <button
                      type="button"
                      className={`${styles.planOption} ${
                        selectedId === plan.id ? styles.selected : ""
                      }`}
                      key={plan.id}
                      onClick={() => selectPlan(plan.id)}
                      aria-pressed={selectedId === plan.id}
                      disabled={isSubmitting}
                    >
                      <span className={styles.optionIcon} aria-hidden="true">
                        <Icon name="route" size={18} />
                      </span>
                      <span className={styles.optionCopy}>
                        <strong>{plan.title}</strong>
                        <span>
                          {plan.activityCount === 1
                            ? "1 actividad"
                            : `${plan.activityCount} actividades`}
                        </span>
                      </span>
                      {selectedId === plan.id ? (
                        <Icon name="circle-check" size={18} />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}

              {status === "idle" && plans.length === 0 && !creating ? (
                <div className={styles.state}>
                  <Icon name="inbox" size={28} />
                  <p>Aún no creaste ningún plan.</p>
                </div>
              ) : null}

              {status === "idle" && !creating ? (
                <button
                  type="button"
                  className={styles.createToggle}
                  onClick={beginCreation}
                  disabled={isSubmitting}
                >
                  <Icon name="plus" size={16} />
                  Crear nuevo plan
                </button>
              ) : null}

              {creating ? (
                <div className={styles.creationFields}>
                  <div className={styles.creationHeading}>
                    <strong>Nuevo plan</strong>
                    <button
                      type="button"
                      onClick={() => setCreating(false)}
                      disabled={isSubmitting}
                    >
                      Elegir existente
                    </button>
                  </div>
                  <label className={styles.field}>
                    <span>Título del plan</span>
                    <input
                      value={title}
                      onChange={(event) => {
                        setTitle(event.target.value);
                        setTitleError(null);
                      }}
                      maxLength={150}
                      disabled={isSubmitting || pendingCreatedPlan != null}
                      aria-invalid={Boolean(titleError)}
                      placeholder="Ej: Fin de semana en Mendoza"
                    />
                    {titleError ? <small role="alert">{titleError}</small> : null}
                  </label>
                  <label className={styles.field}>
                    <span>Cantidad de personas</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={peopleCount}
                      onChange={(event) => {
                        setPeopleCount(event.target.value);
                        setPeopleCountError(null);
                      }}
                      disabled={isSubmitting || pendingCreatedPlan != null}
                      aria-invalid={Boolean(peopleCountError)}
                    />
                    {peopleCountError ? (
                      <small role="alert">{peopleCountError}</small>
                    ) : null}
                  </label>
                </div>
              ) : null}
            </div>

            {submitError ? (
              <p className={styles.submitError} role="alert">
                <Icon name="triangle-alert" size={17} />
                {submitError}
              </p>
            ) : null}

            <div className={styles.actions}>
              <Button
                variant="ghostLight"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={
                  isSubmitting ||
                  status !== "idle" ||
                  (!creating && selectedId == null && !pendingCreatedPlan)
                }
              >
                {isSubmitting
                  ? "Guardando..."
                  : pendingCreatedPlan
                    ? "Reintentar agregado"
                    : creating
                      ? "Crear y agregar"
                      : "Agregar"}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>,
    document.body,
  );
}
