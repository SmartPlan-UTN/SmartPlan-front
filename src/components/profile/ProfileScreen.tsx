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
 * The root layout's `AppBackground` owns the single shared wave background;
 * this screen only contributes its content and never mounts another canvas.
 */
export function ProfileScreen() {
  return (
    <div className={styles.backdrop}>
      <div className={styles.wrapper}>
        <header className="sp-page-intro">
          <p className="sp-label sp-page-kicker">Tu cuenta</p>
          <h1 className="sp-page-title">
            Mi <span className="sp-page-title-accent">perfil.</span>
          </h1>
          <p className="sp-page-lead">
            Mantené tus datos al día para que cada plan empiece desde vos.
          </p>
        </header>
        <ProfileForm />
        <DangerZone />
      </div>
    </div>
  );
}
