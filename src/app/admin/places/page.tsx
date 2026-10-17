import type { Metadata } from "next";

import { AdminPlacesView } from "@/components/administration";

export const metadata: Metadata = { title: "Administrar lugares" };

export default function AdminPlacesPage() {
  return <AdminPlacesView />;
}
