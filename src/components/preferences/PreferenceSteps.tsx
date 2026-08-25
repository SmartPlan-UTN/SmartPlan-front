import { Icon } from "@/components/ui";

import styles from "./preferences.module.css";

export type PreferenceStep = "interests" | "budget" | "area";

interface PreferenceStepsProps {
  activeStep: PreferenceStep;
  completed: Record<PreferenceStep, boolean>;
  interestCount: number;
  budgetValue: number | null;
  areaValue: string | null;
  onChange: (step: PreferenceStep) => void;
}

const CURRENCY_FORMAT = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

const STEPS: ReadonlyArray<{ id: PreferenceStep; number: number; label: string }> = [
  { id: "interests", number: 1, label: "Intereses" },
  { id: "budget", number: 2, label: "Presupuesto por salida" },
  { id: "area", number: 3, label: "Zona preferida" },
];

function stepSummary(
  step: PreferenceStep,
  interestCount: number,
  budgetValue: number | null,
  areaValue: string | null,
): string {
  if (step === "interests") {
    return interestCount > 0 ? `${interestCount} elegidos` : "Contanos qué te gusta";
  }
  if (step === "budget") {
    return budgetValue !== null ? `$ ${CURRENCY_FORMAT.format(budgetValue)}` : "Sin definir";
  }
  return areaValue ?? "Sin definir";
}

export function PreferenceSteps({
  activeStep,
  completed,
  interestCount,
  budgetValue,
  areaValue,
  onChange,
}: PreferenceStepsProps) {
  const activeIndex = STEPS.findIndex((step) => step.id === activeStep);

  return (
    <nav className={styles.stepRail} aria-label="Secciones de preferencias">
      <div className={styles.stepRailIntro}>
        <h2>Tu perfil para encontrar el plan ideal</h2>
        <p>Cuanto más nos contás, mejores recomendaciones creamos para vos. Podés cambiarlo cuando quieras.</p>
      </div>
      <ol className={styles.stepList}>
        {STEPS.map((step, index) => {
          const active = activeStep === step.id;
          const done = completed[step.id];
          const status = stepSummary(step.id, interestCount, budgetValue, areaValue);
          return (
            <li
              key={step.id}
              className={styles.stepItem}
              data-active={active || undefined}
              data-past={index < activeIndex || undefined}
              data-first={index === 0 || undefined}
            >
              <button
                type="button"
                className={active ? styles.stepButtonActive : styles.stepButton}
                aria-current={active ? "step" : undefined}
                onClick={() => onChange(step.id)}
              >
                <span className={styles.stepNumber} aria-hidden="true">
                  {step.number}
                </span>
                <span className={styles.stepCopy}>
                  <strong>{step.label}</strong>
                  <small>{status}</small>
                </span>
                {done ? <Icon name="pencil" size={14} className={styles.stepPencil} /> : null}
              </button>
            </li>
          );
        })}
      </ol>
      <p className={styles.stepRailNote}>
        <Icon name="lock" size={15} />
        Tus preferencias son privadas y solo se usan para mejorar tus recomendaciones.
      </p>
    </nav>
  );
}
