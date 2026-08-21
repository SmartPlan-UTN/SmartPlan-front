import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default function RecoverPasswordPage() {
  return (
    <PendingScreen
      title="Recuperar contraseña"
      description="El pedido del link de recuperación y el cambio de contraseña con token."
      references="CU3 · PAN 05"
      tone="dark"
    />
  );
}
