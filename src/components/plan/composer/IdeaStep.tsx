import { useRef, useState } from "react";

import { Button, Icon } from "@/components/ui";

import {
  DESCRIPTION_MAX,
  PEOPLE_MAX,
  PEOPLE_MIN,
  TITLE_MAX,
  validatePeople,
  validateTitle,
} from "./limits";
import styles from "./IdeaStep.module.css";

/** Counters stay out of the way until the limit is actually near. */
const COUNTER_FROM = 0.8;
const TITLE_STARTERS = [
  "Una tarde sin apuro",
  "Algo rico para compartir",
  "Un lugar nuevo por descubrir",
] as const;

interface IdeaStepProps {
  title: string;
  description: string;
  peopleCount: number;
  titleError: string | null;
  descriptionError: string | null;
  peopleError: string | null;
  isSaving: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPeopleCountChange: (value: number) => void;
  onContinue: () => void;
}

/**
 * Step 1 keeps the name editable, with optional ideas and the basic plan details.
 */
export function IdeaStep({
  title,
  description,
  peopleCount,
  titleError,
  descriptionError,
  peopleError,
  isSaving,
  onTitleChange,
  onDescriptionChange,
  onPeopleCountChange,
  onContinue,
}: IdeaStepProps) {
  const [noteOpen, setNoteOpen] = useState(
    Boolean(description) || Boolean(descriptionError),
  );
  const [titleTouched, setTitleTouched] = useState(false);
  const [peopleTouched, setPeopleTouched] = useState(false);
  const people = Number.isFinite(peopleCount) ? peopleCount : 0;
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const visibleTitleError =
    titleError ?? (titleTouched && title.length > 0 ? validateTitle(title) : null);
  const visiblePeopleError =
    peopleError ?? (peopleTouched ? validatePeople(peopleCount) : null);

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onContinue();
      }}
    >
      <div className={styles.copy}>
        <div className={styles.nameField}>
          <label htmlFor="composer-title" className={styles.nameLabel}>
            Nombre del plan
          </label>
          <textarea
            id="composer-title"
            ref={titleRef}
            className={styles.nameInput}
            rows={1}
            value={title}
            maxLength={TITLE_MAX}
            placeholder="Escribí un nombre"
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(visibleTitleError)}
            aria-describedby={visibleTitleError ? "composer-title-error" : undefined}
            onBlur={() => setTitleTouched(true)}
            onChange={(event) =>
              onTitleChange(event.target.value.replace(/\s*\n\s*/g, " "))
            }
            onKeyDown={(event) => {
              // A name is one line: Enter moves on instead of breaking it.
              if (event.key === "Enter") {
                event.preventDefault();
                onContinue();
              }
            }}
            disabled={isSaving}
          />
          {visibleTitleError ? (
            <small id="composer-title-error" role="alert">
              {visibleTitleError}
            </small>
          ) : null}
          {title.length === 0 ? (
            <details className={styles.starters}>
              <summary>Ideas para empezar</summary>
              <div className={styles.starterList}>
                {TITLE_STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    className={styles.starter}
                    disabled={isSaving}
                    onClick={() => {
                      onTitleChange(starter);
                      titleRef.current?.focus();
                      requestAnimationFrame(() => {
                        const field = titleRef.current;
                        if (!field) return;
                        field.setSelectionRange(starter.length, starter.length);
                      });
                    }}
                  >
                    {starter}
                    <Icon name="plus" size={12} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </details>
          ) : null}
          {title.length >= TITLE_MAX * COUNTER_FROM ? (
            <span className={styles.counter}>
              {title.length}/{TITLE_MAX}
            </span>
          ) : null}
        </div>

        <div className={styles.people}>
          <span aria-hidden="true">Somos</span>
          <div className={styles.stepper}>
            <button
              type="button"
              aria-label="Una persona menos"
              onClick={() => onPeopleCountChange(Math.max(PEOPLE_MIN, people - 1))}
              disabled={isSaving || people <= PEOPLE_MIN}
            >
              <Icon name="minus" size={16} aria-hidden="true" />
            </button>
            <input
              id="composer-people"
              type="number"
              inputMode="numeric"
              min={PEOPLE_MIN}
              max={PEOPLE_MAX}
              step={1}
              value={Number.isNaN(peopleCount) ? "" : peopleCount}
              aria-label="Cantidad de personas"
              aria-invalid={Boolean(visiblePeopleError)}
              aria-describedby={visiblePeopleError ? "composer-people-error" : undefined}
              onBlur={() => setPeopleTouched(true)}
              onChange={(event) =>
                onPeopleCountChange(
                  event.target.value === "" ? Number.NaN : Number(event.target.value),
                )
              }
              disabled={isSaving}
            />
            <button
              type="button"
              aria-label="Una persona más"
              onClick={() => onPeopleCountChange(Math.min(PEOPLE_MAX, people + 1))}
              disabled={isSaving || people >= PEOPLE_MAX}
            >
              <Icon name="plus" size={16} aria-hidden="true" />
            </button>
          </div>
          <span aria-hidden="true">{people === 1 ? "persona" : "personas"}</span>
        </div>
        {visiblePeopleError ? (
          <small
            id="composer-people-error"
            className={styles.error}
            role="alert"
          >
            {visiblePeopleError}
          </small>
        ) : null}

        {noteOpen ? (
          <div className={styles.note}>
            <label htmlFor="composer-note">
              Nota <em>opcional</em>
            </label>
            <textarea
              id="composer-note"
              value={description}
              maxLength={DESCRIPTION_MAX}
              placeholder="¿Qué hace especial a este plan?"
              aria-invalid={Boolean(descriptionError)}
              aria-describedby={
                descriptionError ? "composer-note-error" : undefined
              }
              onChange={(event) => onDescriptionChange(event.target.value)}
              disabled={isSaving}
            />
            {description.length >= DESCRIPTION_MAX * COUNTER_FROM ? (
              <span className={styles.counter}>
                {description.length.toLocaleString("es-AR")}/
                {DESCRIPTION_MAX.toLocaleString("es-AR")}
              </span>
            ) : null}
            {descriptionError ? (
              <small id="composer-note-error" role="alert">
                {descriptionError}
              </small>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            className={styles.addNote}
            onClick={() => setNoteOpen(true)}
            disabled={isSaving}
          >
            <Icon name="plus" size={14} aria-hidden="true" />
            Agregar una nota
          </button>
        )}

        <div className={styles.actions}>
          {/* Always pressable: pressing it with something missing says what
              (a disabled button would not), and the composer validates. */}
          <Button type="submit" variant="primary" size="lg" disabled={isSaving}>
            Elegir actividades
            <Icon name="arrow-right" size={16} aria-hidden="true" />
          </Button>
          <p>No se guarda nada hasta que confirmes.</p>
        </div>
      </div>

    </form>
  );
}
