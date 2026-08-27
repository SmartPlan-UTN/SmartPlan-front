import { Icon } from "@/components/ui";

import styles from "./preferences.module.css";

export type PreferenceStep = "interests" | "outing" | "location";

interface PreferenceStepsSummary {
  interestCount: number;
  budgetValue: number | null;
  peopleValue: number | null;
  areaLabel: string | null;
  maxDistanceKm: number | null;
}

interface PreferenceStepsProps extends PreferenceStepsSummary {
  activeStep: PreferenceStep;
  completed: Record<PreferenceStep, boolean>;
  onChange: (step: PreferenceStep) => void;
}

const CURRENCY_FORMAT = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

const STEPS: ReadonlyArray<{
  id: PreferenceStep;
  number: number;
  label: string;
}> = [
  { id: "interests", number: 1, label: "Intereses" },
  { id: "outing", number: 2, label: "Tu salida habitual" },
  { id: "location", number: 3, label: "Zona y distancia" },
];

function stepSummary(
  step: PreferenceStep,
  {
    interestCount,
    budgetValue,
    peopleValue,
    areaLabel,
    maxDistanceKm,
  }: PreferenceStepsSummary,
): string {
  if (step === "interests") {
    return interestCount > 0
      ? `${interestCount} ${interestCount === 1 ? "elegido" : "elegidos"}`
      : "Contanos qué te gusta";
  }
  if (step === "outing") {
    const parts: string[] = [];
    if (budgetValue !== null)
      parts.push(`$ ${CURRENCY_FORMAT.format(budgetValue)}`);
    if (peopleValue !== null) {
      parts.push(
        `${peopleValue} ${peopleValue === 1 ? "persona" : "personas"}`,
      );
    }
    return parts.length > 0 ? parts.join(" · ") : "Sin definir";
  }
  const parts: string[] = [];
  if (areaLabel) parts.push(areaLabel);
  if (maxDistanceKm !== null) parts.push(`${maxDistanceKm} km`);
  return parts.length > 0 ? parts.join(" · ") : "Sin definir";
}

export function PreferenceSteps({
  activeStep,
  completed,
  onChange,
  ...summary
}: PreferenceStepsProps) {
  const activeIndex = STEPS.findIndex((step) => step.id === activeStep);

  return (
    <nav className={styles.stepRail} aria-label="Secciones de preferencias">
      <div className={styles.stepRailIntro}>
        <h2>Tu perfil para encontrar el plan ideal</h2>
        <p>
          Cuanto más nos contás, mejores recomendaciones creamos para vos. Podés
          cambiarlo cuando quieras.
        </p>
      </div>
      <ol className={styles.stepList}>
        {STEPS.map((step, index) => {
          const active = activeStep === step.id;
          const done = completed[step.id];
          const status = stepSummary(step.id, summary);
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
                {done ? (
                  <Icon name="pencil" size={14} className={styles.stepPencil} />
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
      <p className={styles.stepRailNote}>
        <Icon name="lock" size={15} />
        Tus preferencias son privadas y solo se usan para mejorar tus
        recomendaciones.
      </p>
    </nav>
  );
}
