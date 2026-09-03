import type { Metadata } from "next";

import { AdminDashboard } from "@/components/administration";

export const metadata: Metadata = {
  title: "Panel de control",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
