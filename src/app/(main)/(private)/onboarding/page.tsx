import type { Metadata } from "next";

import { PreferencesOnboarding } from "@/components/preferences";

export const metadata: Metadata = {
  title: "Tus preferencias",
};

export default function OnboardingPage() {
  return <PreferencesOnboarding />;
}
