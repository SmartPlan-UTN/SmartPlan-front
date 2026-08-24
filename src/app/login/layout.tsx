import type { ReactNode } from "react";

import { AuthSplitShell } from "@/components/auth";

export default function LoginLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <AuthSplitShell cardVariant="login">{children}</AuthSplitShell>;
}
