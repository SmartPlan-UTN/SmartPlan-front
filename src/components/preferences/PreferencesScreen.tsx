import Link from "next/link";

import { Icon } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

import { PreferencesForm } from "./PreferencesForm";
import styles from "./preferences.module.css";

/**
 * CU8/CU18 (PAN 15) - Edit preferences. `AppShell` already mounts the wave
 * background for every screen (`idle`, since `/preferences` isn't in
 * `section-mood.ts`) — `.backdrop`/`.wrapper` just keep this screen's
 * content at its own 700px max width on top of it, same split as
 * `explore`'s `.backdrop`/`.page` for Results.jsx's background.
 */
export function PreferencesScreen() {
  return (
    <div className={styles.backdrop}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <Link href={ROUTES.home} className={styles.backLink} aria-label="Volver">
            <Icon name="arrow-left" size={20} />
          </Link>
          <div>
            <h1 className={`sp-h2 ${styles.heading}`}>Preferencias</h1>
            <p className={styles.subheading}>
              Ajustá estos detalles para recibir planes a tu medida.
            </p>
          </div>
        </div>

        <PreferencesForm />
      </div>
    </div>
  );
}
