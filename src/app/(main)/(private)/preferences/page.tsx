import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";

export const metadata: Metadata = {
  title: "Preferences",
};

export default function PreferencesPage() {
  return (
    <PendingScreen
      title="Preferences"
      description="Las categorías de interés, el budget habitual y la zona con la que arrancan tus plans."
      referencias="CU8, CU18 · PAN 15"
    />
  );
}
