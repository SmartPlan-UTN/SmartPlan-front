import { PreferencesForm } from "./PreferencesForm";
import styles from "./preferences.module.css";

/**
 * CU8/CU18 - Edit preferences (PAN 15). One screen serves both use cases:
 * CU8 is the user-management side of editing preferences, CU18 is the
 * recommendation side of personalizing them, and both point at PAN 15 and
 * the same `/preferences` route — there is no second screen.
 */
export function PreferencesScreen() {
  return (
    <section className={styles.wrapper}>
      <PreferencesForm />
    </section>
  );
}
