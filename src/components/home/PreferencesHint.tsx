"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getPreferences } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";

import styles from "./preferences-hint.module.css";

/**
 * A one-line note near the composer (CU17): the backend fills in a missing
 * budget, party size, or area from the user's saved preferences whenever
 * the free-text idea doesn't mention them. This says so up front — purely
 * informational, nothing here feeds into the submitted request — so the
 * fallback never reads as hidden magic overriding what someone typed.
 */
export function PreferencesHint() {
  const { authenticated } = useSession();
  const [hasPreferences, setHasPreferences] = useState(false);

  useEffect(() => {
    if (!authenticated) return;
    let active = true;

    getPreferences()
      .then((preferences) => {
        if (!active) return;
        setHasPreferences(
          preferences.usualBudget != null ||
            preferences.usualPeopleCount != null ||
            preferences.preferredArea != null,
        );
      })
      .catch(() => {
        // A soft hint, not worth surfacing a failure for.
      });

    return () => {
      active = false;
    };
  }, [authenticated]);

  if (!hasPreferences) return null;

  return (
    <p className={styles.hint}>
      Vamos a usar tu presupuesto y zona guardados si no los mencionás.{" "}
      <Link href={ROUTES.preferences} className={styles.link}>
        Ajustar
      </Link>
    </p>
  );
}
