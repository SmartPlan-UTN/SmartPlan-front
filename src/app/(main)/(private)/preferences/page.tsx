import type { Metadata } from "next";

import { PreferencesScreen } from "@/components/preferences";

export const metadata: Metadata = {
  title: "Preferencias",
};

export default function PreferencesPage() {
  return <PreferencesScreen />;
}
