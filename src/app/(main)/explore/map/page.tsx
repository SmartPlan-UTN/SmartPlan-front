import type { Metadata } from "next";
import { Suspense } from "react";

import { MapView } from "@/components/explore";
import { Container } from "@/components/layout";
import { FloatingBackLink } from "@/components/ui";
import { ROUTES } from "@/lib/routes";

import styles from "../explore.module.css";

export const metadata: Metadata = {
  title: "Mapa",
};

export default function ExploreMapPage() {
  return (
    <Container>
      <div className={styles.page}>
        <FloatingBackLink href={ROUTES.explore} label="Volver a la lista" />

        <h1 className="sp-h3">Actividades en el mapa</h1>
        {/* `MapView` reads the filters carried over from the list view via
            `useSearchParams`, which requires a Suspense boundary. */}
        <Suspense fallback={null}>
          <MapView />
        </Suspense>
      </div>
    </Container>
  );
}
