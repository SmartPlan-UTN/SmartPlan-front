import { passwordRequirements } from "@/lib/utils";

import { Icon } from "./Icon";
import styles from "./PasswordRequirements.module.css";

export interface PasswordRequirementsProps {
  password: string;
}

/** Mandatory password rules. The strength meter remains informational only. */
export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  return (
    <ul
      className={styles.requirements}
      aria-label="Requisitos obligatorios de la contraseña"
    >
      {passwordRequirements(password).map((requirement) => (
        <li
          key={requirement.label}
          className={
            requirement.met
              ? `${styles.requirement} ${styles.requirementMet}`
              : styles.requirement
          }
        >
          <span className={styles.requirementDot} aria-hidden="true">
            {requirement.met ? <Icon name="check" size={10} /> : null}
          </span>
          {requirement.label}
        </li>
      ))}
    </ul>
  );
}
