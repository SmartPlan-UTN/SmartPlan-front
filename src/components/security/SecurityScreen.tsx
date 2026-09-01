import Link from "next/link";

import { Icon, MoodBackground } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

import { ChangePasswordForm } from "./ChangePasswordForm";
import styles from "./security.module.css";

/**
 * CU6 - Change password (PAN 14), per the v2 system design's dedicated
 * `Security.jsx` screen.
 *
 * Previously `ChangePasswordForm` was a collapsed-by-default card on
 * `/profile`, next to `ProfileForm` — matching `Profile.jsx`'s own inline
 * password card, which the prototype's `Security.jsx` duplicates as a
 * full standalone screen. The design adds "Seguridad" as its own entry in
 * the user menu, between Preferencias and Cerrar sesión, so this is now a
 * full destination (`/security`) instead of a card sharing the profile
 * screen, with a "Volver" link back to `/profile` instead of a collapse
 * toggle.
 *
 * The prototype's "Sesiones activas" footer card (device, location,
 * "Cerrar todas") is deliberately left out: `SmartPlan-back` has no
 * endpoint to list a user's active sessions or revoke a subset of them
 * (`sessions.controller.ts` only has login, refresh, and logging out
 * *this* session) — showing hardcoded device data would misrepresent a
 * capability that doesn't exist, the same reasoning that already dropped
 * the prototype's password-complexity checklist from blocking submission.
 *
 * `MoodBackground` sits behind `.backdrop`, full-bleed, same split as
 * `ProfileScreen`'s `.backdrop`/`.wrapper`.
 */
export function SecurityScreen() {
  return (
    <div className={styles.backdrop}>
      <MoodBackground mood="idle" />
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <Link
            href={ROUTES.profile}
            className={styles.backLink}
            aria-label="Volver"
          >
            <Icon name="arrow-left" size={20} />
          </Link>
          <div>
            <h1 className={`sp-h2 ${styles.title}`}>Seguridad</h1>
            <p className={`sp-small ${styles.subtitle}`}>
              Mantené tu cuenta protegida.
            </p>
          </div>
        </div>

        <ChangePasswordForm />
      </div>
    </div>
  );
}
