import styles from "./AuthForm.module.css";
import { MIN_PASSWORD_LENGTH } from "./validation";

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

const VARIETY_PATTERNS = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/];

/** 0 = none, 1 = weak, 2 = medium, 3 = strong — purely a visual nudge, not
 * the backend's actual password policy.
 *
 * Scored mostly by length past `MIN_PASSWORD_LENGTH`, with a mix of
 * character types (lower/upper/digit/symbol) as a shortcut: the previous
 * version required uppercase *and* a digit together for the top score, so a
 * long password made of a single character class (all lowercase, say)
 * could never turn green no matter how long it got. */
function computeStrength(password: string): Strength {
  if (!password) return 0;

  const variety = VARIETY_PATTERNS.filter((pattern) => pattern.test(password)).length;

  let score = 0;
  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (password.length >= MIN_PASSWORD_LENGTH + 4 || variety >= 3) score++;
  if (
    password.length >= MIN_PASSWORD_LENGTH + 8 ||
    (password.length >= MIN_PASSWORD_LENGTH + 4 && variety >= 3)
  )
    score++;

  return Math.min(score, 3) as Strength;
}

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
