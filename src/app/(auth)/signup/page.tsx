import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function SignupPage() {
  return (
    <PendingScreen
      title="Crear cuenta"
      description="El alta de usuario con validación inline y el medidor de fortaleza de contraseña."
      references="CU2 · PAN 04"
      tone="dark"
    />
  );
}
