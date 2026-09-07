import type { Metadata } from "next";

import { RecoverPasswordForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default function RecoverPasswordPage() {
  return <RecoverPasswordForm />;
}
