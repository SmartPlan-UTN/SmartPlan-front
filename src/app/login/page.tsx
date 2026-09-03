import type { Metadata } from "next";

import { LoginForm } from "@/components/auth";
import {
  ACCOUNT_DELETED_PARAM,
  PASSWORD_CHANGED_PARAM,
  REDIRECT_PARAM,
  safeDestination,
} from "@/lib/routes";

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
  const passwordChanged = parameters[PASSWORD_CHANGED_PARAM] !== undefined;
  const accountDeleted = parameters[ACCOUNT_DELETED_PARAM] !== undefined;

  return (
    <LoginForm
      destination={destination}
      passwordChanged={passwordChanged}
      accountDeleted={accountDeleted}
    />
  );
}
