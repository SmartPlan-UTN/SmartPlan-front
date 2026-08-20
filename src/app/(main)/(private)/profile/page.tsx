import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";

export const metadata: Metadata = {
  title: "Mi profile",
};

export default function ProfilePage() {
  return (
    <PendingScreen
      title="Mi profile"
      description="Los data personales con validación inline, el cambio de contraseña y la baja de cuenta."
      referencias="CU5–CU7 · PAN 14"
    />
  );
}
