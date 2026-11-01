import type { Metadata } from "next";

import { AdminMcpView } from "@/components/administration";

export const metadata: Metadata = {
  title: "Servidor MCP",
};

export default function AdminMcpPage() {
  return <AdminMcpView />;
}
