import { MoodBackground } from "@/components/ui";

import { ChangePasswordForm } from "./ChangePasswordForm";
import { DangerZone } from "./DangerZone";
import { ProfileForm } from "./ProfileForm";
import styles from "./profile.module.css";

/**
 * CU5/CU6/CU7 - Edit profile (PAN 14). Composes the personal-data card, the
 * password-change card, and the delete-account danger zone, matching the
 * v2 prototype's `Profile.jsx`, which renders all three on the same
 * screen.
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
        <ChangePasswordForm />
        <DangerZone />
      </div>
    </div>
  );
}
