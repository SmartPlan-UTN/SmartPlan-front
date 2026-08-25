import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function SignupPage() {
  return <RegisterForm />;
}
