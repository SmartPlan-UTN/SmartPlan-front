import { MoodBackground } from "@/components/ui";

import { DangerZone } from "./DangerZone";
import { ProfileForm } from "./ProfileForm";
import styles from "./profile.module.css";

/**
 * CU5 - Edit profile (PAN 14). Composes the personal-data card, matching
 * the v2 system design's `Profile.jsx`. Its password-change card moved to
 * its own `/security` screen (`SecurityScreen`, CU6) once the design added
 * "Seguridad" as a dedicated entry in the user menu instead of a second
 * card sharing this screen — see `SecurityScreen`'s doc comment.
 * `DangerZone` is the same prototype screen's delete-account card (CU7).
 *
 * `MoodBackground` sits behind `.backdrop`, full-bleed; `.wrapper` keeps the
 * actual content at its own max width on top of it — same split as
 * `explore`'s `.backdrop`/`.page` for Results.jsx's wave background.
 */
export function ProfileScreen() {
  return (
    <div className={styles.backdrop}>
      <MoodBackground mood="idle" />
      <div className={styles.wrapper}>
        <h1 className={`sp-h2 ${styles.heading}`}>Mi perfil</h1>
        <ProfileForm />
        <DangerZone />
      </div>
    </div>
  );
}
