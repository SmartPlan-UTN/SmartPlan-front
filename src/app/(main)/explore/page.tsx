import type { Metadata } from "next";

import { ExploreTabs } from "@/components/explore";
import { Container, PageKicker } from "@/components/layout";

import styles from "./explore.module.css";

export const metadata: Metadata = {
  title: "Explorar",
};

export default function ExplorePage() {
  return (
    <div className={styles.backdrop}>
      <Container>
        <div className={styles.page}>
          <ExploreTabs
            intro={
              <header className="sp-page-intro">
                <PageKicker>Explorá a tu manera</PageKicker>
                <h1 className={`sp-page-title ${styles.title}`}>
                  Encontrá algo
                  <span className="sp-page-title-accent">
                    {" "}que te guste.
                  </span>
                </h1>
                <p className="sp-page-lead">
                  Buscá una experiencia o descubrí recorridos que ya tienen
                  sentido juntos.
                </p>
              </header>
            }
          />
        </div>
      </Container>
    </div>
  );
}
