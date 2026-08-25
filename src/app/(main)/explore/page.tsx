import type { Metadata } from "next";

import { ExploreTabs } from "@/components/explore";
import { Container } from "@/components/layout";
import { MoodBackground } from "@/components/ui";

import styles from "./explore.module.css";

export const metadata: Metadata = {
  title: "Explorar",
};

export default function ExplorePage() {
  return (
    <div className={styles.backdrop}>
      <MoodBackground mood="idle" />

      <Container>
        <div className={styles.page}>
          {/* SmartPlanSystemDesign's Results screen has no visible page
              title — it goes straight from the navbar into the search bar
              — but a page still needs a heading landmark. */}
          <h1 className="sp-sr-only">Explorar</h1>
          <ExploreTabs />
        </div>
      </Container>
    </div>
  );
}
