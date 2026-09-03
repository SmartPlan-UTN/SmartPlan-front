import type { ReactNode } from "react";

import { AuthSplitShell } from "@/components/auth";

export default function RecoverPasswordLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <AuthSplitShell cardVariant="login">{children}</AuthSplitShell>;
}
