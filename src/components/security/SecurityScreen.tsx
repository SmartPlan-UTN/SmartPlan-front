import Link from "next/link";

import { Icon, MoodBackground } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

import { ActiveSessionCard } from "./ActiveSessionCard";
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
 * `ActiveSessionCard` is the prototype's "Sesiones activas" footer card,
 * scoped to what `SmartPlan-back` actually knows about the session making
 * the request (`GET /sessions/me`) — see its own doc comment for why it
 * doesn't show the prototype's fake multi-device list.
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
        <ActiveSessionCard />
      </div>
    </div>
  );
}
