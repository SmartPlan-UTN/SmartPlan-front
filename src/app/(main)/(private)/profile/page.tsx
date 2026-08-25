import type { Metadata } from "next";

import { ProfileForm } from "@/components/profile";

export const metadata: Metadata = {
  title: "Mi perfil",
};

export default function ProfilePage() {
  return <ProfileForm />;
}
