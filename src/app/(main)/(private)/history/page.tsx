import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";

export const metadata: Metadata = {
  title: "Historial",
};

export default function HistoryPage() {
  return (
    <PendingScreen
      title="Historial"
      description="Los planes generados y guardados, con su estado y la retroalimentación de cada uno."
      references="CU23 · PAN 13"
    />
  );
}
