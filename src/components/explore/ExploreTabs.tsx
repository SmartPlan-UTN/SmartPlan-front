"use client";

import { useState } from "react";

import { ActivitySearch } from "@/components/activity";
import { PlanSearch } from "@/components/plan";
import { Chip } from "@/components/ui";

import styles from "./explore.module.css";

type Tab = "activities" | "plans";

/**
 * PAN 11 is one shared results screen for both CU9-CU11 (activities) and
 * CU12 (plans) — there's no separate "Buscar planes" screen or navbar
 * entry, just this tab switch.
 */
export function ExploreTabs() {
  const [tab, setTab] = useState<Tab>("activities");

  return (
    <div>
      <div className={styles.tabRow} role="tablist" aria-label="Qué explorar">
        <Chip
          role="tab"
          aria-selected={tab === "activities"}
          active={tab === "activities"}
          onClick={() => {
            setTab("activities");
          }}
        >
          Actividades
        </Chip>
        <Chip
          role="tab"
          aria-selected={tab === "plans"}
          active={tab === "plans"}
          onClick={() => {
            setTab("plans");
          }}
        >
          Planes
        </Chip>
      </div>

      {tab === "activities" ? <ActivitySearch /> : <PlanSearch />}
    </div>
  );
}
