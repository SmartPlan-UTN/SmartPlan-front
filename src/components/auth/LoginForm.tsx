"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, Icon } from "@/components/ui";
import { useToggle } from "@/hooks";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";

import { AuthField } from "./AuthField";
import styles from "./AuthForm.module.css";
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH, REQUIRED_MESSAGE } from "./validation";

export interface LoginFormProps {
  /** Where to return to after logging in. `null` falls back to Home, or to
   * Admin when the account's role is `admin`. */
  destination: string | null;
}

interface FieldErrors {
  email?: string;
  password?: string;
}

/**
 * Generic, user-facing message for each CU1 error code.
 *
 * `ATTEMPT_LIMIT_EXCEEDED` is the code SmartPlan-back's login rate limiter
 * actually sends (`src/auth/security/attempt-limiter.service.ts`);
 * `TOO_MANY_REQUESTS` is kept too, since it's the generic fallback code the
 * backend's exception filter uses for any other 429 without its own code
 * (`CODES_BY_STATUS` in `src/common/errors/http-exception-filter.ts`).
 */
function loginErrorMessage(error: ApiError): string {
  switch (error.code) {
    case "INVALID_CREDENTIALS":
      return "El email o la contraseña son incorrectos.";
    case "ACCOUNT_SUSPENDED":
      return "Tu cuenta está suspendida. Contactá a soporte para más información.";
    case "ACCOUNT_BANNED":
      return "Tu cuenta fue dada de baja. Contactá a soporte si creés que es un error.";
    case "ATTEMPT_LIMIT_EXCEEDED":
    case "TOO_MANY_REQUESTS":
      return "Hiciste demasiados intentos. Esperá un momento antes de volver a intentar.";
    case "VALIDATION_FAILED":
      return "Revisá los datos ingresados.";
    default:
      return error.isNetworkError
        ? error.message
        : "No pudimos iniciar sesión. Intentá de nuevo.";
  }
}

/**
 * Maps the backend's per-field validation errors (`400 VALIDATION_FAILED`,
 * `errors: [{ field, messages }]`) to this form's two fields. `error.data`
 * is untyped JSON from the server, so every step is guarded instead of cast.
 */
function fieldErrorsFrom(error: ApiError): FieldErrors {
  const rawErrors = error.data?.errors;
  if (!Array.isArray(rawErrors)) {
    return {};
  }

  const fieldErrors: FieldErrors = {};

  for (const item of rawErrors) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const detail = item as Record<string, unknown>;
    const message =
      Array.isArray(detail.messages) && typeof detail.messages[0] === "string"
        ? detail.messages[0]
        : undefined;

    if (!message) {
      continue;
    }

    if (detail.field === "email") {
      fieldErrors.email = message;
    } else if (detail.field === "password") {
      fieldErrors.password = message;
    }
  }

  return fieldErrors;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors.email = REQUIRED_MESSAGE;
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = "Ingresá un email válido";
  }

  if (!password) {
    errors.password = REQUIRED_MESSAGE;
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }

  return errors;
}

/** CU1 - Login form (PAN 04). Rendered inside the white card that
 * `app/login/layout.tsx` provides. */
export function LoginForm({ destination }: LoginFormProps) {
  const { login } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, toggleShowPassword] = useToggle(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setFormError(null);

    const errors = validate(email, password);
    setFieldErrors(errors);
    if (errors.email || errors.password) {
      return;
    }

    setSubmitting(true);
    try {
      const user = await login({ email: email.trim(), password });
      const target =
        destination ?? (user.role.key === "admin" ? ROUTES.admin : ROUTES.home);
      router.replace(target);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(loginErrorMessage(error));
        setFieldErrors(fieldErrorsFrom(error));
      } else {
        setFormError("No pudimos iniciar sesión. Intentá de nuevo.");
      }
      setSubmitting(false);
    }
    // No `finally`: on success, `router.replace` unmounts this form once the
    // destination renders, and touching state after that would be a no-op
    // at best. Only the error path needs to re-enable the submit button.
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
    <>
      <div className={`${styles.header} ${styles.headerLogin}`}>
        <h1 className="sp-h2">Iniciar sesión</h1>
        <p className={`sp-small ${styles.subtitle}`}>Bienvenido de vuelta ✦</p>
      </div>

      <form
        className={`${styles.form} ${styles.formLogin}`}
        onSubmit={handleSubmit}
        noValidate
      >
        {formError ? (
          <p className={styles.formError} role="alert">
            <Icon name="circle-alert" size={18} />
            {formError}
          </p>
        ) : null}

        <AuthField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          error={fieldErrors.email}
          disabled={submitting}
          placeholder="tu@email.com"
          required
        />

        <div className={styles.passwordGroup}>
          <AuthField
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            error={fieldErrors.password}
            disabled={submitting}
            placeholder="••••••••"
            required
            rightSlot={{
              icon: showPassword ? "eye-off" : "eye",
              label: showPassword ? "Ocultar contraseña" : "Mostrar contraseña",
              pressed: showPassword,
              onClick: toggleShowPassword,
            }}
          />
          <Link href={ROUTES.recoverPassword} className={styles.forgotLink}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Iniciando sesión…" : "Iniciar sesión"}
        </Button>
      </form>

      <p className={`${styles.footer} ${styles.footerLogin}`}>
        ¿No tenés cuenta?{" "}
        <Link href={ROUTES.signup} className={styles.footerLink}>
          Registrarse
        </Link>
      </p>
    </>
  );
}
