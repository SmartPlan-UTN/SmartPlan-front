import Link from "next/link";
import type { ReactNode } from "react";

import styles from "@/components/layout/layout.module.css";
import { Logo } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

/**
 * Layout for session screens: login, signup, and password recovery.
 *
 * Renders without the navbar and over a dark surface with `blur`, as
 * required by the EMBER design. Someone who hasn't logged in yet has
 * nowhere else to navigate within the application; all they need is a way
 * back home.
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
