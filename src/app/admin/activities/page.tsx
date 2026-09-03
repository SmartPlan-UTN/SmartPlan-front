import type { Metadata } from "next";

import { AdminActivitiesView } from "@/components/administration";

export const metadata: Metadata = { title: "Administrar actividades" };

export default function AdminActivitiesPage() {
  return <AdminActivitiesView />;
}
