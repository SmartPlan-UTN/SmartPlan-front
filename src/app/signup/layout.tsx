import type { ReactNode } from "react";

import { AuthSplitShell } from "@/components/auth";
import { ROUTES } from "@/lib/routes";

export default function SignupLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <AuthSplitShell
      cardVariant="register"
      backHref={ROUTES.login}
      backLabel="Volver a iniciar sesión"
    >
      {children}
    </AuthSplitShell>
  );
}
