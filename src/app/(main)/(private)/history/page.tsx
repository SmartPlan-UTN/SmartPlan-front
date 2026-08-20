import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";

export const metadata: Metadata = {
  title: "Historial",
};

export default function HistoryPage() {
  return (
    <PendingScreen
      title="Historial"
      description="Los plans generados y guardados, con su status y la retroalimentación de cada uno."
      referencias="CU23 · PAN 13"
    />
  );
}
