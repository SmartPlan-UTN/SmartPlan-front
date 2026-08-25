import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";

export const metadata: Metadata = {
  title: "Favoritos",
};

export default function FavoritesPage() {
  return (
    <PendingScreen
      title="Favoritos"
      description="Las solapas de actividades, planes y colecciones guardadas, cada una con su estado vacío."
      references="CU39–CU43 · PAN 12"
    />
  );
}
