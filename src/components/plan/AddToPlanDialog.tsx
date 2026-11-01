"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { Button, Icon } from "@/components/ui";
import { addPlanActivity, ApiError, listOwnPlans } from "@/lib/api";
import { ROUTES } from "@/lib/routes";
import type { OwnPlanSummary } from "@/types";

import styles from "./AddToPlanDialog.module.css";

type LoadStatus = "loading" | "idle" | "error";
type Completion = { planTitle: string; alreadyIncluded: boolean };

export interface AddToPlanDialogProps {
  activityId: number;
  activityName: string;
  onClose: () => void;
}

/** Existing-plan addition remains CU27; new plans open the shared composer. */
export function AddToPlanDialog({
  activityId,
  activityName,
  onClose,
}: AddToPlanDialogProps) {
  const [plans, setPlans] = useState<OwnPlanSummary[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [reloadSequence, setReloadSequence] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const firstControlRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    firstControlRef.current?.focus();
    return () => previousFocusRef.current?.focus();
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
          "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href]",
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
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setStatus("loading");
      try {
        const result = await listOwnPlans({
          page: 1,
          limit: 100,
          sortBy: "createdAt",
          direction: "desc",
        });
        if (ignore) return;
        setPlans(result.data.filter((plan) => plan.status.key !== "cancelled"));
        setStatus("idle");
      } catch {
        if (!ignore) setStatus("error");
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [reloadSequence]);

  function startNewPlan() {
    onClose();
    router.push(
      `${ROUTES.createPlan}?activityId=${activityId}&source=activity`,
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = plans.find(({ id }) => id === selectedId);
    if (!selected || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await addPlanActivity(selected.id, activityId);
      setCompletion({ planTitle: selected.title, alreadyIncluded: false });
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "ACTIVITY_ALREADY_IN_PLAN"
      ) {
        setCompletion({ planTitle: selected.title, alreadyIncluded: true });
      } else if (error instanceof ApiError && error.code === "PLAN_NOT_FOUND") {
        setPlans((current) => current.filter(({ id }) => id !== selected.id));
        setSelectedId(null);
        setSubmitError("El plan ya no se encuentra disponible.");
      } else if (
        error instanceof ApiError &&
        error.code === "ACTIVITY_NOT_FOUND"
      ) {
        setSubmitError("La actividad ya no se encuentra disponible.");
      } else {
        setSubmitError(
          "No pudimos agregar la actividad al plan. Intentá nuevamente.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <form
            className={styles.form}
            onSubmit={(event) => void submit(event)}
          >
            <div className={styles.content} aria-busy={status === "loading"}>
              {status === "loading" ? (
                <div className={styles.state} role="status">
                  <Icon name="loader-circle" className="sp-spin" /> Cargando tus
                  planes…
                </div>
              ) : null}
              {status === "error" ? (
                <div className={styles.state} role="alert">
                  <Icon name="triangle-alert" />
                  <p>No pudimos cargar tus planes.</p>
                  <Button
                    type="button"
                    variant="ghostLight"
                    size="sm"
                    onClick={() => setReloadSequence((value) => value + 1)}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : null}
              {status === "idle" && plans.length === 0 ? (
                <div className={styles.state}>
                  <Icon name="inbox" size={28} />
                  <p>Aún no tenés planes para editar.</p>
                </div>
              ) : null}
              {status === "idle" && plans.length > 0 ? (
                <div className={styles.planList}>
                  {plans.map((plan) => (
                    <button
                      type="button"
                      className={`${styles.planOption} ${selectedId === plan.id ? styles.selected : ""}`}
                      key={plan.id}
                      onClick={() => setSelectedId(plan.id)}
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
              {status === "idle" ? (
                <button
                  type="button"
                  className={styles.createToggle}
                  onClick={startNewPlan}
                  disabled={isSubmitting}
                >
                  <Icon name="plus" size={16} /> Crear un plan nuevo con esta
                  actividad
                </button>
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
                type="button"
                variant="ghostLight"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={
                  isSubmitting || status !== "idle" || selectedId == null
                }
              >
                {isSubmitting ? "Agregando…" : "Agregar"}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>,
    document.body,
  );
}
