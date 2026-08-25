import type { Metadata } from "next";

import { LoginForm } from "@/components/auth";
import { REDIRECT_PARAM, safeDestination } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const parameters = await searchParams;
  const value = parameters[REDIRECT_PARAM];
  // `safeDestination` discards external URLs: without that filter, `?redirect=`
  // would turn the login page into an open redirector to any domain.
  const destination = safeDestination(typeof value === "string" ? value : null);

  return <LoginForm destination={destination} />;
}
