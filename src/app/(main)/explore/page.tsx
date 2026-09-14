import type { Metadata } from "next";

import { ExploreTabs } from "@/components/explore";
import { Container } from "@/components/layout";

import styles from "./explore.module.css";

export const metadata: Metadata = {
  title: "Explorar",
};

export default function ExplorePage() {
  return (
    <div className={styles.backdrop}>
      <Container>
        <div className={styles.page}>
          <header className="sp-page-intro">
            <p className="sp-label sp-page-kicker">Explorá a tu manera</p>
            <h1 className={`sp-page-title ${styles.title}`}>
              Encontrá algo
              <span className={`sp-page-title-accent ${styles.titleAccent}`}>
                {" "}que te pinte.
              </span>
            </h1>
            <p className="sp-page-lead">
              Buscá una experiencia o descubrí recorridos que ya tienen
              sentido juntos.
            </p>
          </header>
          <ExploreTabs />
        </div>
      </Container>
    </div>
  );
}
