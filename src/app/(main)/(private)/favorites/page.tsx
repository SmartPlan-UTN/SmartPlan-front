import type { Metadata } from "next";

import { CollectionsPanel } from "@/components/collection";
import { SavedActivitiesPanel } from "@/components/favorites";
import { Screen } from "@/components/layout";

import styles from "./favorites.module.css";

export const metadata: Metadata = {
  title: "Favoritos",
};

export default function FavoritesPage() {
  return (
    <Screen labelledBy="saved-title">
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
              <span className={styles.activeSection} aria-current="page">
                Actividades
              </span>
            </li>
            <li>
              <span className={styles.pendingSection} aria-disabled="true">
                Colecciones
              </span>
            </li>
          </ul>
        </nav>
      </header>

      <SavedActivitiesPanel />

      <section className={styles.collectionsSection} aria-labelledby="collections-title">
        <h2 id="collections-title" className={`sp-h4 ${styles.sectionTitle}`}>
          Tus colecciones
        </h2>
        <CollectionsPanel />
      </section>
    </Screen>
  );
}
