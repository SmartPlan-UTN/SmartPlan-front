import type { ReactNode } from "react";

import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

import styles from "./layout.module.css";

export type ScreenTone = "light" | "dark";

export interface PendingScreenProps {
  title: string;
  description: string;
  /** Screen traceability, e.g. `"CU39–CU43 · PAN 12"`. */
  references: string;
  /** `dark` for session screens, which sit over the `--char` surface. */
  tone?: ScreenTone;
  children?: ReactNode;
}

/**
 * Placeholder for a screen whose route already exists but whose use case has
 * not been implemented yet.
 *
 * It exists so F19's navigation can be fully exercised without hitting a
 * 404, and so it stays documented which CU completes it. It gets removed
 * once the last screen is done.
 */
export function PendingScreen({
  title,
  description,
  references,
  tone = "light",
  children,
}: PendingScreenProps) {
  const dark = tone === "dark";

  return (
    <section className={styles.pendingScreen}>
      <Badge variant={dark ? "dark" : "tag"}>{references}</Badge>
      <h1 className="sp-h2">{title}</h1>
      <p className="sp-body-lg">{description}</p>
      <p
        className={cn(
          "sp-small",
          dark ? styles.pendingNoteDark : styles.pendingNote,
        )}
      >
        La pantalla todavía no está implementada. F19 deja la ruta, el layout y la
        navegación listos para que el caso de uso la complete.
      </p>
      {children}
    </section>
  );
}
