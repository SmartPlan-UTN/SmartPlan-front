"use client";

import {
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";

import { Icon } from "@/components/ui";
import { useTypewriter } from "@/hooks";
import { cn } from "@/lib/utils";
import type { PlanRequestContext } from "@/types";

import { ContextChips } from "./ContextChips";
import styles from "./composer.module.css";

const MIN_QUERY_LENGTH = 3;
const MAX_TEXTAREA_HEIGHT = 116;

/**
 * The animated placeholder doubles as the product's explanation: each
 * phrase is an intention with a different shape (company, moment, limit,
 * distance) so that reading two of them is enough to understand what can
 * be written here. Module scope, not a literal in the render: `useTypewriter`
 * restarts whenever this array's identity changes.
 */
const PLACEHOLDER_PHRASES = [
  "Una tarde de vinos con amigos, sin manejar…",
  "Algo tranquilo para hoy a la noche, cerca del centro…",
  "Un domingo al aire libre con los chicos…",
  "Una cita al atardecer, con buena comida y vista…",
  "Un día en la montaña y volver antes de que oscurezca…",
];

/**
 * How prominent this instance is. The hero gets the full treatment; the
 * closing field is the same control, quieter, so the page's last screen
 * reads as an invitation rather than a second hero competing with the
 * first.
 */
export type ComposerVariant = "hero" | "compact";

/**
 * What a parent can do to the composer from outside it.
 *
 * The alternative — lifting `text` into every parent — would make the
 * component controlled and force each caller to reimplement autosize,
 * caret placement and validation reset. This keeps the composer the owner
 * of its own field and exposes only the two gestures a page legitimately
 * needs: put words in it, and put the caret in it.
 */
export interface PlanComposerHandle {
  /** Fills the field, focuses it, and leaves the caret at the end. */
  fill: (query: string) => void;
  focus: () => void;
}

export interface PlanComposerProps {
  submitting: boolean;
  variant?: ComposerVariant;
  /**
   * DOM id for the composer's wrapper. Two composers render on the
   * landing, so this cannot be a constant: duplicate ids break both
   * `getElementById` scrolling and `aria-describedby`.
   */
  id?: string;
  suggestions?: readonly string[];
  /** Rendered in the rail under the field, after the context chips. */
  trailing?: ReactNode;
  /**
   * Rendered in the hint line under the field (unless a validation error or
   * the starters are showing). Where "Sorpréndeme" lives (CU19).
   */
  belowField?: ReactNode;
  /** Hides the optional context chips, for placements that supply their own. */
  hideContext?: boolean;
  onTextChange?: (text: string) => void;
  onFocusChange?: (focused: boolean) => void;
  onSubmit: (query: string, context: PlanRequestContext) => void;
  ref?: Ref<PlanComposerHandle>;
}

function autosize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
}

/**
 * Natural-language plan composer (CU17): the single control the whole
 * landing is built around.
 *
 * Deliberately small. One line tall at rest, with everything optional
 * pushed out of the field and under it — context chips, "Sorpréndeme", and
 * a hint slot — so the thing a person looks at first is a place to write,
 * not a form. The field carries only what a search needs: an icon, the
 * text, and the action.
 *
 * The placeholder types itself through `useTypewriter`. That animation is
 * decorative and lives in an `aria-hidden` overlay: the textarea keeps a
 * real, static `placeholder` underneath for assistive technology, for a
 * no-JS render, and for `prefers-reduced-motion`, where the overlay shows
 * one phrase without animating it. It pauses the moment the field is
 * focused or holds text, so it never types underneath a person who is
 * writing.
 */
export function PlanComposer({
  submitting,
  variant = "hero",
  id = "plan-composer",
  suggestions = [],
  trailing,
  belowField,
  hideContext = false,
  onTextChange,
  onFocusChange,
  onSubmit,
  ref,
}: PlanComposerProps) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [context, setContext] = useState<PlanRequestContext>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const empty = text.length === 0;
  const idle = empty && !focused;
  const { text: ghost, animating } = useTypewriter(PLACEHOLDER_PHRASES, empty && !focused);
  const errorId = `${id}-error`;

  function handleTextChange(value: string) {
    setText(value);
    if (validationError) setValidationError(null);
    onTextChange?.(value);
  }

  function handleFocusChange(next: boolean) {
    setFocused(next);
    onFocusChange?.(next);
  }

  function submit() {
    if (submitting) return;
    const trimmed = text.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setValidationError("Contale un poco más qué tenés ganas de hacer.");
      textareaRef.current?.focus();
      return;
    }
    onSubmit(trimmed, context);
  }

  /**
   * Shared by the starter links and by the imperative handle, so a quick
   * intent typed in from outside behaves exactly like one clicked inside:
   * same autosize, same caret at the end, same absence of a submit.
   */
  function fill(query: string) {
    handleTextChange(query);

    const field = textareaRef.current;
    // Focus synchronously. Deferring it to the next frame makes it a race:
    // the clicked chip unmounts as soon as the field stops being idle, so
    // in the gap between the click and the frame, focus has already fallen
    // back to the document body.
    field?.focus();

    // The caret and the height do have to wait — both need React to have
    // committed the new value to the DOM first.
    requestAnimationFrame(() => {
      if (!field) return;
      autosize(field);
      field.setSelectionRange(query.length, query.length);
    });
  }

  useImperativeHandle(ref, () => ({
    fill,
    focus: () => textareaRef.current?.focus(),
  }));

  return (
    <div
      id={id}
      className={cn(styles.composer, variant === "compact" && styles.composerCompact)}
    >
      <div
        className={cn(styles.glow, focused && styles.glowActive)}
        aria-hidden="true"
      />

      <div
        className={cn(
          styles.field,
          focused && styles.fieldFocused,
          validationError && styles.fieldInvalid,
        )}
      >
        <span className={styles.fieldIcon} aria-hidden="true">
          <Icon name="search" size={17} stroke={1.9} />
        </span>

        <div className={styles.inputArea}>
          <textarea
            ref={textareaRef}
            className={cn(styles.textarea, idle && styles.textareaGhosted)}
            value={text}
            rows={1}
            placeholder="Escribí tu idea…"
            aria-label="Contale a smartplan qué querés hacer"
            aria-invalid={validationError != null}
            aria-describedby={validationError ? errorId : undefined}
            onChange={(event) => {
              handleTextChange(event.target.value);
              autosize(event.target);
            }}
            onFocus={() => handleFocusChange(true)}
            onBlur={() => handleFocusChange(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            disabled={submitting}
          />

          {idle ? (
            <p className={styles.ghost} aria-hidden="true">
              {ghost}
              {animating ? <span className={styles.caret} /> : null}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          className={styles.submit}
          onClick={submit}
          disabled={submitting}
          aria-label="Planificar"
        >
          {submitting ? (
            <span className={styles.submitDots} aria-hidden="true">
              <span className={styles.submitDot} />
              <span className={styles.submitDot} />
              <span className={styles.submitDot} />
            </span>
          ) : (
            <>
              <span className={styles.submitLabel}>Planificar</span>
              <Icon name="arrow-right" size={15} aria-hidden="true" />
            </>
          )}
        </button>
      </div>

      {hideContext && !trailing ? null : (
        <div className={styles.rail}>
          {hideContext ? null : <ContextChips value={context} onChange={setContext} />}
          {trailing ? (
            <>
              {hideContext ? null : (
                <span className={styles.railSeparator} aria-hidden="true" />
              )}
              {trailing}
            </>
          ) : null}
        </div>
      )}

      <div className={styles.hintSlot}>
        {validationError ? (
          <p id={errorId} className={styles.error} role="alert">
            {validationError}
          </p>
        ) : idle && suggestions.length > 0 ? (
          <p className={styles.starters}>
            <span className={styles.startersLabel}>Probá con</span>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className={styles.starter}
                disabled={submitting}
                onClick={() => fill(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </p>
        ) : (
          (belowField ?? null)
        )}
      </div>
    </div>
  );
}
