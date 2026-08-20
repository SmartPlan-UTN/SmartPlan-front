import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";

export const metadata: Metadata = {
  title: "Favorites",
};

export default function FavoritesPage() {
  return (
    <PendingScreen
      title="Favorites"
      description="Las solapas de activities, plans y collections guardadas, cada una con su status vacío."
      referencias="CU39–CU43 · PAN 12"
    />
  );
}
