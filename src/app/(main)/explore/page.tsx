import type { Metadata } from "next";

import { ActivitySearch } from "@/components/activity";
import { Container } from "@/components/layout";

import styles from "./explore.module.css";

export const metadata: Metadata = {
  title: "Explorar",
};

export default function ExplorePage() {
  return (
    <Container>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className="sp-h2">Explorar</h1>
          <p className={`sp-body ${styles.subtitle}`}>
            Buscá actividades cerca tuyo.
          </p>
        </div>

        <ActivitySearch />
      </div>
    </Container>
  );
}
