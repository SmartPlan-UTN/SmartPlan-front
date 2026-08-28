import { MoodBackground } from "@/components/ui";

import { ChangePasswordForm } from "./ChangePasswordForm";
import { ProfileForm } from "./ProfileForm";
import styles from "./profile.module.css";

/**
 * CU5/CU6 - Edit profile (PAN 14). Composes the personal-data card and the
 * password-change card, matching the v2 prototype's `Profile.jsx`, which
 * renders both on the same screen. Its delete-account "danger zone" is the
 * same screen too (CU7) — a separate ticket, not built here.
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
      </div>
    </div>
  );
}
