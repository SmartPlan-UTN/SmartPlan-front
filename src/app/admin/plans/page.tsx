import type { Metadata } from "next";

import { AdminPlansView } from "@/components/administration";

export const metadata: Metadata = { title: "Administrar planes" };

export default function AdminPlansPage() {
  return <AdminPlansView />;
}
