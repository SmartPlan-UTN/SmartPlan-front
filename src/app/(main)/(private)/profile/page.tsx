import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";

export const metadata: Metadata = {
  title: "Mi perfil",
};

export default function ProfilePage() {
  return (
    <PendingScreen
      title="Mi perfil"
      description="Los datos personales con validación inline, el cambio de contraseña y la baja de cuenta."
      references="CU5–CU7 · PAN 14"
    />
  );
}
