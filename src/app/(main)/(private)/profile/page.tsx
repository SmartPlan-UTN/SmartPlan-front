import type { Metadata } from "next";

import { ProfileScreen } from "@/components/profile";

export const metadata: Metadata = {
  title: "Mi perfil",
};

export default function ProfilePage() {
  return <ProfileScreen />;
}
