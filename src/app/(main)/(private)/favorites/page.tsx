import type { Metadata } from "next";

import { CollectionsPanel } from "@/components/collection";
import { MoodBackground } from "@/components/ui";

import styles from "./favorites.module.css";

export const metadata: Metadata = {
  title: "Favoritos",
};

export default function FavoritesPage() {
  return (
    <section className={styles.screen} aria-labelledby="saved-title">
      <MoodBackground
        mood="idle"
        style={{ position: "fixed", top: "var(--navbar-h)" }}
      />

      <div className={styles.contentLayer}>
        <header className={styles.header}>
          <p className={`sp-label ${styles.eyebrow}`}>Para vos</p>
          <h1 id="saved-title" className="sp-h2">
            Tus favoritos
          </h1>

          <nav
            className={styles.sectionNav}
            aria-label="Favoritos y colecciones"
          >
            <ul className={styles.sectionList}>
              <li>
                <span className={styles.pendingSection} aria-disabled="true">
                  Planes
                </span>
              </li>
              <li>
                <span className={styles.pendingSection} aria-disabled="true">
                  Actividades
                </span>
              </li>
              <li>
                <span className={styles.activeSection} aria-current="page">
                  Colecciones
                </span>
              </li>
            </ul>
          </nav>
        </header>

        <CollectionsPanel />
      </div>
    </section>
  );
}
