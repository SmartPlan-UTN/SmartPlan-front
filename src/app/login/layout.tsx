import type { ReactNode } from "react";

import { AuthSplitShell, LoginHighlights } from "@/components/auth";
import { ROUTES } from "@/lib/routes";

export default function LoginLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <AuthSplitShell
      cardVariant="login"
      backHref={ROUTES.home}
      footer={<LoginHighlights />}
    >
      {children}
    </AuthSplitShell>
  );
}
