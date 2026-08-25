import type { ReactNode } from "react";

import { AuthSplitShell } from "@/components/auth";

export default function SignupLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <AuthSplitShell cardVariant="register">{children}</AuthSplitShell>;
}
