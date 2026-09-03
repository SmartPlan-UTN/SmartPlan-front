"use client";

import { useState } from "react";

import { CollectionsPanel } from "@/components/collection";
import { SavedActivitiesPanel, SavedPlansPanel } from "@/components/favorites";
import { Screen } from "@/components/layout";

import styles from "./favorites.module.css";

type Tab = "activities" | "plans";

export function FavoritesTabs() {
  const [activeTab, setActiveTab] = useState<Tab>("activities");

  return (
    <Screen labelledBy="saved-title">
      <header className={styles.header}>
        <p className={`sp-label ${styles.eyebrow}`}>Para vos</p>
        <h1 id="saved-title" className="sp-h2">
          Tus favoritos
        </h1>

        <div
          className={styles.sectionNav}
          role="tablist"
          aria-label="Tipo de favorito"
        >
          <button
            type="button"
            id="plans-tab"
            role="tab"
            className={`${styles.tabButton} ${activeTab === "plans" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("plans")}
            aria-controls="plans-panel"
            aria-selected={activeTab === "plans"}
          >
            Planes
          </button>
          <button
            type="button"
            id="activities-tab"
            role="tab"
            className={`${styles.tabButton} ${activeTab === "activities" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("activities")}
            aria-controls="activities-panel"
            aria-selected={activeTab === "activities"}
          >
            Actividades
          </button>
        </div>
      </header>

      <div
        id={`${activeTab}-panel`}
        role="tabpanel"
        aria-labelledby={`${activeTab}-tab`}
      >
        {activeTab === "activities" ? (
          <SavedActivitiesPanel />
        ) : (
          <SavedPlansPanel />
        )}
      </div>

      <section
        className={styles.collectionsSection}
        aria-labelledby="collections-title"
      >
        <h2 id="collections-title" className={`sp-h4 ${styles.sectionTitle}`}>
          Tus colecciones
        </h2>
        <CollectionsPanel />
      </section>
    </Screen>
  );
}
