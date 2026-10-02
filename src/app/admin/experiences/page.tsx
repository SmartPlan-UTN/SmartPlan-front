import type { Metadata } from "next";

import { AdminExperiencesView } from "@/components/administration";

export const metadata: Metadata = { title: "Moderar experiencias" };

export default function AdminExperiencesPage() {
  return <AdminExperiencesView />;
}
