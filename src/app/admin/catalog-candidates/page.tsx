import type { Metadata } from "next";

import { AdminCatalogCandidatesView } from "@/components/administration";

export const metadata: Metadata = { title: "Candidatos del catálogo" };

export default function AdminCatalogCandidatesPage() {
  return <AdminCatalogCandidatesView />;
}
