"use client";

import { useRouter } from "next/navigation";

import { ROUTES } from "@/lib/routes";

import { PreferencesForm } from "./PreferencesForm";
import styles from "./preferences.module.css";

/**
 * US02/US8 — Optional first preferences setup, shown right after a
 * successful sign-up (CU2) and before Inicio. It reuses the PAN 15 form, so
 * validation and persistence are the same as in Preferencias; saving or
 * skipping both continue to Inicio with the session still open.
 */
export function PreferencesOnboarding() {
  const router = useRouter();
  const goHome = () => router.replace(ROUTES.home);

  return (
    <section className={styles.wrapper}>
      <PreferencesForm onboarding={{ onSaved: goHome, onSkip: goHome }} />
    </section>
  );
}
