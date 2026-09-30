import { Icon } from "@/components/ui";

import styles from "./ComposerStepper.module.css";

export type ComposerStep = 0 | 1 | 2;

const STEP_LABELS = ["Idea", "Recorrido", "Revisión"] as const;

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
      {STEP_LABELS.map((label, index) => {
        const itemStep = index as ComposerStep;
        const complete = itemStep < currentStep;

        return (
          <div className={styles.stepWrap} key={label}>
            <button
              type="button"
              className={`${styles.stepButton} ${itemStep === currentStep ? styles.stepCurrent : ""} ${complete ? styles.stepComplete : ""}`}
              aria-current={itemStep === currentStep ? "step" : undefined}
              aria-label={`Paso ${index + 1}: ${label}${complete ? ", volver a este paso" : ""}`}
              disabled={disabled || itemStep > currentStep}
              onClick={() => onStepChange(itemStep)}
            >
              <span className={styles.stepNumber}>
                {complete ? (
                  <Icon name="check" size={14} aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span>{label}</span>
            </button>
            {index < STEP_LABELS.length - 1 ? (
              <span
                className={`${styles.stepLine} ${complete ? styles.stepLineComplete : ""}`}
                aria-hidden="true"
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
