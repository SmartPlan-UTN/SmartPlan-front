import type { Metadata } from "next";

import { SecurityScreen } from "@/components/security";

export const metadata: Metadata = {
  title: "Seguridad",
};

export default function SecurityPage() {
  return <SecurityScreen />;
}
