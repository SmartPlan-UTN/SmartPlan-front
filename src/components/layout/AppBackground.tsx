"use client";

import { usePathname } from "next/navigation";

import { MoodBackground } from "@/components/ui";

import { moodForRoute } from "./section-mood";
import styles from "./layout.module.css";

/**
 * The app's animated wave background, mounted once for the whole shell.
 *
 * It lives here rather than in each screen for the tide: `AppShell` is a
 * layout, so it survives navigation, and a background that is never
 * unmounted keeps its wave phase across routes. That's what lets a
 * navigation read as a swell passing through the same water instead of a
 * new animation starting from zero — which is exactly what happened while
 * each screen mounted its own copy.
 *
 * `pathname` drives both halves: the palette for the section, and the
 * `tideKey` whose change breaks the wave.
 */
export function AppBackground() {
  const pathname = usePathname();

  return (
    <div className={styles.appBackground} aria-hidden="true">
      <MoodBackground mood={moodForRoute(pathname)} tideKey={pathname} />
    </div>
  );
}
