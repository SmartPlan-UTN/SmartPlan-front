import type { Metadata } from "next";

import { AdminUsersView } from "@/components/administration";

export const metadata: Metadata = {
  title: "Administración de usuarios",
};

export default function AdminUsersPage() {
  return <AdminUsersView />;
}
