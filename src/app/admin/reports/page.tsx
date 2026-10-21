import type { Metadata } from "next";

import { AdminReportsView } from "@/components/administration";

export const metadata: Metadata = { title: "Denuncias" };

export default function AdminReportsPage() {
  return <AdminReportsView />;
}
