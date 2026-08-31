"use client";

import { useState } from "react";

import { CollectionsPanel } from "@/components/collection";
import { SavedActivitiesPanel, SavedPlansPanel } from "@/components/favorites";
import { Screen } from "@/components/layout";

import styles from "./favorites.module.css";

type Tab = "activities" | "plans";

export default function FavoritesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("activities");

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
              <button
                type="button"
                className={`${styles.tabButton} ${activeTab === "plans" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("plans")}
                aria-current={activeTab === "plans" ? "page" : undefined}
              >
                Planes
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`${styles.tabButton} ${activeTab === "activities" ? styles.activeTab : ""}`}
                onClick={() => setActiveTab("activities")}
                aria-current={activeTab === "activities" ? "page" : undefined}
              >
                Actividades
              </button>
            </li>
            <li>
              <span className={styles.pendingSection} aria-disabled="true">
                Colecciones
              </span>
            </li>
          </ul>
        </nav>
      </header>

      {activeTab === "activities" ? <SavedActivitiesPanel /> : <SavedPlansPanel />}

      <section className={styles.collectionsSection} aria-labelledby="collections-title">
        <h2 id="collections-title" className={`sp-h4 ${styles.sectionTitle}`}>
          Tus colecciones
        </h2>
        <CollectionsPanel />
      </section>
    </Screen>
  );
}
