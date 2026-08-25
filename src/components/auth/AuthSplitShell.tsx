import type { ReactNode } from "react";

import { Icon, Logo } from "@/components/ui";

import styles from "./AuthSplitShell.module.css";

const CHIPS: {
  icon: "martini" | "coffee" | "palette";
  label: string;
  /** Each chip gets a distinct levitation curve (`tokens.css`) so the row
   * doesn't float in lockstep. */
  floatClass: "sp-float-1" | "sp-float-2" | "sp-float-3";
}[] = [
  { icon: "martini", label: "Cócteles & Vida nocturna", floatClass: "sp-float-1" },
  { icon: "coffee", label: "Brunch & Café", floatClass: "sp-float-2" },
  { icon: "palette", label: "Cultura & Arte", floatClass: "sp-float-3" },
];

export interface AuthSplitShellProps {
  children: ReactNode;
  /** The v2 prototype gives the register card a touch less padding than
   * login, since it holds more fields. */
  cardVariant: "login" | "register";
}

/**
 * Split-screen shell for the CU1/CU2 auth screens (PAN 04), per the v2
 * "EMBER" system design: branding panel on the left (hidden below the `md`
 * breakpoint), form card over a light surface on the right.
 *
 * Used by `app/login/layout.tsx` and `app/signup/layout.tsx`, which live
 * outside the `(auth)` route group so this shell doesn't affect password
 * recovery, which still uses the older dark `(auth)/layout.tsx` shell until
 * its own CU is implemented.
 */
export function AuthSplitShell({ children, cardVariant }: AuthSplitShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.leftPanel}>
        <Logo
          variant="white"
          kind="full"
          height={28}
          className={styles.leftLogo}
        />

        <div className={styles.chips}>
          {CHIPS.map(({ icon, label, floatClass }) => (
            <span key={label} className={`${styles.chip} ${floatClass}`}>
              <Icon name={icon} size={16} />
              {label}
            </span>
          ))}
        </div>

        <div>
          <p className={styles.headline}>
            Planes perfectos,
            <br />
            experiencias únicas.
          </p>
          <p className={styles.tagline}>Tu próxima aventura empieza acá.</p>
        </div>
      </div>

      <div className={styles.rightPanel}>
        {/* "¿Sos admin?" from the v2 design. Deliberately inert — see the
         * comment on `.adminLink` below. */}
        <span className={styles.adminLink}>
          <Icon name="shield" size={15} />
          ¿Sos admin?
        </span>

        <div className={styles.mobileLogo}>
          <Logo variant="ink" kind="full" height={28} />
        </div>

        <div
          className={`${styles.card} ${
            cardVariant === "register" ? styles.cardRegister : styles.cardLogin
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
