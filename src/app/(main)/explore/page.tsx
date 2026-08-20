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
        description="Búsqueda de activities y plans, con filtros, order y la grilla de resultados."
        referencias="CU9–CU12 · PAN 11"
      />
    </Container>
  );
}
