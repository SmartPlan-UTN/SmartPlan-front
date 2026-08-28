import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";

export const metadata: Metadata = { title: "Moderar valoraciones" };

export default function AdminRatingsPage() {
  return <PendingScreen title="Moderar valoraciones" description="Revisión de valoraciones pendientes y aprobadas." references="CU55 · PAN 20" />;
}
