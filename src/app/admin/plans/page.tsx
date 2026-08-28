import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";

export const metadata: Metadata = { title: "Administrar planes" };

export default function AdminPlansPage() {
  return <PendingScreen title="Administrar planes" description="Gestión de planes registrados." references="CU60 · PAN 22" />;
}
