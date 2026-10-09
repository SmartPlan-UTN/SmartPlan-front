import { forwardRef, useState, type ButtonHTMLAttributes } from "react";

import { Icon } from "@/components/ui";

import styles from "./IconAction.module.css";

type Tone = "quiet" | "add" | "added";

interface IconActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Its accessible name: icon-only buttons always say what they do. */
  "aria-label": string;
  /** A short visual hint on pointer devices (and keyboard focus). */
  tip?: string;
  tone?: Tone;
}

/**
 * A round icon-only action with SmartPlan's states: a designed hover,
 * pressed and focus ring, a 44px hit area on touch, and a small tooltip
 * where a pointer can hover. The tooltip is decoration; the name is the
 * button's `aria-label`.
 */
export const IconAction = forwardRef<HTMLButtonElement, IconActionProps>(
  function IconAction({ tip, tone = "quiet", className = "", ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        data-tip={tip}
        className={`${styles.action} ${styles[tone]} ${className}`}
        {...props}
      />
    );
  },
);

interface RouteToggleProps {
  name: string;
  /** Its number in the route when it is a stop; null when it is not. */
  stopNumber: number | null;
  disabled?: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

/**
 * + adds the activity; it becomes ✓ (a piece of the dark route); pressing ✓
 * takes it out again, right here, without looking for it in the route. The
 * ring only plays on the press that added it, never when a row mounts.
 */
export function RouteToggle({
  name,
  stopNumber,
  disabled = false,
  onAdd,
  onRemove,
}: RouteToggleProps) {
  const added = stopNumber !== null;
  const [popped, setPopped] = useState(false);
  if (popped && !added) setPopped(false);

  return (
    <IconAction
      tone={added ? "added" : "add"}
      className={popped ? styles.pop : undefined}
      aria-label={added ? `Quitar ${name} del recorrido` : `Agregar ${name}`}
      tip={added ? `Parada ${stopNumber} · Quitar` : "Sumar al recorrido"}
      disabled={disabled}
      onClick={() => {
        if (added) {
          onRemove();
        } else {
          setPopped(true);
          onAdd();
        }
      }}
    >
      <span className={`${styles.glyph} ${styles.glyphOff}`} aria-hidden="true">
        <Icon name="plus" size={17} />
      </span>
      <span className={`${styles.glyph} ${styles.glyphOn}`} aria-hidden="true">
        <Icon name="check" size={16} />
      </span>
    </IconAction>
  );
}
