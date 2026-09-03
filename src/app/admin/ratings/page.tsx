import type { Metadata } from "next";

import { AdminRatingsView } from "@/components/administration";

export const metadata: Metadata = { title: "Moderar valoraciones" };

export default function AdminRatingsPage() {
  return <AdminRatingsView />;
}
