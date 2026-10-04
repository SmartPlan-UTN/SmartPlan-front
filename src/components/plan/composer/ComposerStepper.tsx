import { Icon } from "@/components/ui";

import styles from "./ComposerStepper.module.css";

export type ComposerStep = 0 | 1 | 2;

const STEP_LABELS = ["Plan", "Recorrido", "Revisión"] as const;

interface ComposerStepperProps {
  currentStep: ComposerStep;
  disabled: boolean;
  onStepChange: (step: ComposerStep) => void;
}

export function ComposerStepper({
  currentStep,
  disabled,
  onStepChange,
}: ComposerStepperProps) {
  return (
    <nav className={styles.stepper} aria-label="Progreso de creación">
      <ol>
        {STEP_LABELS.map((label, index) => {
          const itemStep = index as ComposerStep;
          const complete = itemStep < currentStep;
          const current = itemStep === currentStep;

          return (
            <li key={label} className={styles.item}>
              <button
                type="button"
                className={`${styles.step} ${current ? styles.current : ""} ${complete ? styles.complete : ""}`}
                aria-current={current ? "step" : undefined}
                aria-label={`Paso ${index + 1}: ${label}${complete ? ", volver a este paso" : ""}`}
                disabled={disabled || itemStep > currentStep}
                onClick={() => onStepChange(itemStep)}
              >
                <span className={styles.number}>
                  {complete ? (
                    <Icon name="check" size={12} stroke={3} aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className={styles.label}>{label}</span>
              </button>
              {index < STEP_LABELS.length - 1 ? (
                <span
                  className={`${styles.line} ${complete ? styles.lineComplete : ""}`}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
