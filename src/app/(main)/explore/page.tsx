import type { Metadata } from "next";

import { Container, PendingScreen } from "@/components/layout";

export const metadata: Metadata = {
  title: "Explorar",
};

export default function ExplorePage() {
  return (
    <Container>
      <PendingScreen
        title="Explorar"
        description="Búsqueda de actividades y planes, con filtros, orden y la grilla de resultados."
        references="CU9–CU12 · PAN 11"
      />
    </Container>
  );
}
