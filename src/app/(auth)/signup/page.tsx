import type { Metadata } from "next";

import { PendingScreen } from "@/components/layout";

export const metadata: Metadata = {
  title: "Create cuenta",
};

export default function SignupPage() {
  return (
    <PendingScreen
      title="Create cuenta"
      description="El alta de user con validación inline y el medidor de fortaleza de contraseña."
      referencias="CU2 · PAN 04"
      tono="dark"
    />
  );
}
