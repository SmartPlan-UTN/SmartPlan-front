import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Restablecer contraseña",
};

interface ResetPasswordPageProps {
  // The link SmartPlan-back's recovery email sends is
  // `${FRONTEND_URL}/reset-password?token=<opaque-token>`.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const parameters = await searchParams;
  const value = parameters.token;
  const token = typeof value === "string" && value.length > 0 ? value : null;

  return <ResetPasswordForm token={token} />;
}
