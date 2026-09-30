import { Icon } from "@/components/ui";
import type { PlanVisibility } from "@/types";

import styles from "./IdeaStep.module.css";

interface IdeaStepProps {
  title: string;
  description: string;
  peopleCount: number;
  visibility: PlanVisibility;
  titleError: string | null;
  peopleError: string | null;
  isSaving: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPeopleCountChange: (value: number) => void;
  onVisibilityChange: (value: PlanVisibility) => void;
}

export function IdeaStep({
  title,
  description,
  peopleCount,
  visibility,
  titleError,
  peopleError,
  isSaving,
  onTitleChange,
  onDescriptionChange,
  onPeopleCountChange,
  onVisibilityChange,
}: IdeaStepProps) {
  return (
    <div className={styles.ideaGrid}>
      <div className={styles.ideaCopy}>
        <span className={styles.eyebrow}>01 / LA IDEA</span>
        <p>
          Un buen plan no necesita estar resuelto. Empecemos por saber cómo lo
          imaginás.
        </p>
        <div className={styles.stamp} aria-hidden="true">
          <Icon name="route" size={22} />
          <span>
            Hecho por vos
            <br />
            para disfrutar en compañía
          </span>
        </div>
      </div>

      <div className={styles.ideaFields}>
        <label className={styles.field}>
          <span>
            Nombre del plan <i aria-hidden="true">*</i>
          </span>
          <input
            value={title}
            maxLength={150}
            placeholder="Ej. Un sábado entre viñas"
            aria-invalid={Boolean(titleError)}
            aria-describedby={titleError ? "composer-title-error" : undefined}
            onChange={(event) => onTitleChange(event.target.value)}
            disabled={isSaving}
          />
          {titleError ? (
            <small id="composer-title-error" role="alert">
              {titleError}
            </small>
          ) : null}
        </label>

        <label className={styles.field}>
          <span>Una nota para recordar la idea</span>
          <textarea
            value={description}
            maxLength={2000}
            placeholder="¿Qué hace especial a este plan?"
            onChange={(event) => onDescriptionChange(event.target.value)}
            disabled={isSaving}
          />
        </label>

        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span>¿Cuántas personas?</span>
            <input
              type="number"
              min={1}
              max={1000}
              value={peopleCount}
              aria-invalid={Boolean(peopleError)}
              aria-describedby={
                peopleError ? "composer-people-error" : undefined
              }
              onChange={(event) =>
                onPeopleCountChange(Number(event.target.value))
              }
              disabled={isSaving}
            />
            {peopleError ? (
              <small id="composer-people-error" role="alert">
                {peopleError}
              </small>
            ) : null}
          </label>

          <fieldset className={`${styles.field} ${styles.visibilityField}`}>
            <legend>Visibilidad</legend>
            <div className={styles.visibilityOptions}>
              {(
                [
                  ["private", "Solo yo", "lock"],
                  ["public", "Público", "eye"],
                ] as const
              ).map(([value, label, icon]) => (
                <label
                  className={`${styles.visibilityOption} ${visibility === value ? styles.visibilitySelected : ""}`}
                  key={value}
                >
                  <input
                    type="radio"
                    name="plan-visibility"
                    value={value}
                    checked={visibility === value}
                    onChange={() => onVisibilityChange(value)}
                    disabled={isSaving}
                  />
                  <Icon name={icon} size={16} aria-hidden="true" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
}
