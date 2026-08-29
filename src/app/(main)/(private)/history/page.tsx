import type { Metadata } from "next";

import { HistoryView } from "@/components/history";

export const metadata: Metadata = {
  title: "Historial",
};

export default function HistoryPage() {
  return <HistoryView />;
}
