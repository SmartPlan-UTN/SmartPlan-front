import styles from "./PasswordStrength.module.css";

export interface PasswordStrengthProps {
  password: string;
}

type Strength = 0 | 1 | 2 | 3;

const LABELS: Record<Strength, string> = {
  0: "",
  1: "Débil",
  2: "Media",
  3: "Fuerte",
};

/** 0 = none, 1 = weak, 2 = medium, 3 = strong. Same heuristic as the v2
 * system design's `PasswordStrength`/`ProfStrengthBar` (length + mixed
 * case/digits) — purely a visual nudge, not the backend's actual password
 * policy (12-128 characters, checked separately). */
function computeStrength(password: string): Strength {
  if (!password) return 0;

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;

  return score as Strength;
}

/**
 * Purely visual password-strength meter. Ported from the v2 system design's
 * `PasswordStrength` (`Login.jsx`) / `ProfStrengthBar` (`Profile.jsx`).
 * Originally lived in `components/auth/` for CU2's signup form; promoted
 * here once CU6's password-change form needed the same meter.
 */
export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = computeStrength(password);

  return (
    <div className={styles.strength} aria-hidden="true">
      <div className={styles.strengthBar}>
        {[1, 2, 3].map((segment) => (
          <div
            key={segment}
            className={
              segment <= strength
                ? `${styles.strengthSeg} ${styles[`strengthFill${strength}`]}`
                : styles.strengthSeg
            }
          />
        ))}
      </div>
      {strength > 0 ? (
        <span className={`${styles.strengthLabel} ${styles[`strengthText${strength}`]}`}>
          Contraseña {LABELS[strength]}
        </span>
      ) : null}
    </div>
  );
}
