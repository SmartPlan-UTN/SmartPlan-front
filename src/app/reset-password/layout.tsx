import type { ReactNode } from "react";

import { AuthSplitShell } from "@/components/auth";
import { ROUTES } from "@/lib/routes";

export default function ResetPasswordLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <AuthSplitShell
      cardVariant="login"
      backHref={ROUTES.login}
      backLabel="Volver a iniciar sesión"
    >
      {children}
    </AuthSplitShell>
  );
}
