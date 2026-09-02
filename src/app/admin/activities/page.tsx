import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";

export const metadata: Metadata = { title: "Administrar actividades" };

export default function AdminActivitiesPage() {
  return <PendingScreen title="Administrar actividades" description="Gestión del catálogo de actividades." references="CU53 · PAN 21" />;
}
