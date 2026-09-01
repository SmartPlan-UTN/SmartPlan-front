import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";

export const metadata: Metadata = {
  title: "Preferencias",
};

export default function PreferencesPage() {
  return (
    <PendingScreen
      title="Preferencias"
      description="Las categorías de interés, el presupuesto habitual y la zona con la que arrancan tus planes."
      references="CU8, CU18 · PAN 15"
    />
  );
}
