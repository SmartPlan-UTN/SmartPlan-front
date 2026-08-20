import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";

export const metadata: Metadata = {
  title: "Administración",
};

export default function AdminPage() {
  return (
    <PendingScreen
      title="Panel de administración"
      description="Las métricas del sistema y la gestión de users, activities, plans y ratings."
      referencias="CU53–CU60 · REP-01"
    />
  );
}
