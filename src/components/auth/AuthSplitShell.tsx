import type { ReactNode } from "react";
import Link from "next/link";

import { Icon, Logo } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

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
  backHref?: string;
  backLabel?: string;
}

/**
 * Split-screen shell for the CU1/CU2/CU3 auth screens (PAN 04/05), per the
 * v2 "EMBER" system design: branding panel on the left (hidden below the
 * `md` breakpoint), form card over a light surface on the right.
 *
 * Used by `app/login/layout.tsx`, `app/signup/layout.tsx`,
 * `app/recover-password/layout.tsx`, and `app/reset-password/layout.tsx` —
 * each screen lives at the top level, outside a shared route group, so this
 * shell (and its `MoodBackground`) doesn't leak into unrelated routes.
 */
export function AuthSplitShell({
  children,
  cardVariant,
  backHref = ROUTES.home,
  backLabel = "Volver al inicio",
}: AuthSplitShellProps) {
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
        <Link href={backHref} className={styles.backLink}>
          <Icon name="arrow-left" size={15} aria-hidden="true" />
          {backLabel}
        </Link>
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
