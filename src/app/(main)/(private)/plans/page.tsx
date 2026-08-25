import type { Metadata } from "next";

import { MyPlansPanel } from "@/components/plan";

import styles from "./plans.module.css";

export const metadata: Metadata = {
  title: "Mis planes",
};

export default function MyPlansPage() {
  return (
    <section className={styles.screen} aria-labelledby="my-plans-title">
      <header className={styles.header}>
        <p className={`sp-label ${styles.eyebrow}`}>Para vos</p>
        <h1 id="my-plans-title" className="sp-h2">
          Mis planes
        </h1>
        <p className={`sp-body ${styles.lead}`}>
          Los planes que armaste, con su itinerario, su duración y lo que
          sale cada uno.
        </p>
      </header>

      <MyPlansPanel />
    </section>
  );
}
