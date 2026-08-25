import Link from "next/link";
import type { ReactNode } from "react";

import styles from "@/components/layout/layout.module.css";
import { Logo } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

/**
 * Layout for the session screens still pending their own CU: password
 * recovery. Login (CU1, `app/login/`) and signup (CU2, `app/signup/`) moved
 * out — they share `AuthSplitShell`, the split-screen shell from the v2
 * system design, and no longer use this dark, blurred card.
 *
 * Renders without the navbar. Someone who hasn't logged in yet has nowhere
 * else to navigate within the application; all they need is a way back home.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className={styles.centeredScreen}>
      <Link href={ROUTES.home} className={styles.brand}>
        <Logo variant="white" kind="full" height={28} priority />
      </Link>

      <div className={styles.centeredCard}>{children}</div>
    </div>
  );
}
