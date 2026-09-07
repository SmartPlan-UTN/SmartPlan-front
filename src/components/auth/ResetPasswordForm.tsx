"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  Button,
  Field as AuthField,
  Icon,
  PasswordStrength,
} from "@/components/ui";
import { useToggle } from "@/hooks";
import { ApiError } from "@/lib/api";
import { resetPassword } from "@/lib/auth/api";
import { ROUTES } from "@/lib/routes";
import { REQUIRED_MESSAGE } from "@/lib/utils";

import styles from "./AuthForm.module.css";

export interface ResetPasswordFormProps {
  /** Read from `?token=` by `app/reset-password/page.tsx`. `null` when the
   * screen was opened without one — same broken-link treatment as a token
   * the backend rejects. */
  token: string | null;
}

interface FieldErrors {
  newPassword?: string;
  confirmPassword?: string;
}

/** The reset endpoint accepts 8-128 characters, independently of the
 * stricter minimum used by the already-established login/profile forms. */
const MIN_RESET_PASSWORD_LENGTH = 8;

/** The three ways a recovery token stops being usable (CU3). Each gets its
 * own copy, but the same recourse: request a new link. */
const TOKEN_ERROR_MESSAGES: Record<string, string> = {
  INVALID_RECOVERY_TOKEN: "Este enlace de recuperación no es válido.",
  EXPIRED_RECOVERY_TOKEN: "Este enlace de recuperación venció.",
  RECOVERY_TOKEN_ALREADY_USED: "Este enlace de recuperación ya fue usado.",
};

function requestErrorMessage(error: ApiError): string {
  switch (error.code) {
    case "ATTEMPT_LIMIT_EXCEEDED":
    case "TOO_MANY_REQUESTS":
      return "Hiciste demasiados intentos. Esperá un momento antes de volver a intentar.";
    case "VALIDATION_FAILED":
      return "Revisá los datos ingresados.";
    default:
      return error.isNetworkError
        ? error.message
        : "No pudimos actualizar la contraseña. Intentá de nuevo.";
  }
}

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

    // The DTO's field is `newPassword`; there's no `confirmPassword` on the
    // backend to map from — it's client-only, like in `RegisterForm`.
    if (message && detail.field === "newPassword") {
      fieldErrors.newPassword = message;
    }
  }

  return fieldErrors;
}

function validate(newPassword: string, confirmPassword: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!newPassword) {
    errors.newPassword = REQUIRED_MESSAGE;
  } else if (newPassword.length < MIN_RESET_PASSWORD_LENGTH) {
    errors.newPassword = `La contraseña debe tener al menos ${MIN_RESET_PASSWORD_LENGTH} caracteres`;
  }

  if (!confirmPassword) {
    errors.confirmPassword = REQUIRED_MESSAGE;
  } else if (confirmPassword !== newPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden";
  }

  return errors;
}

/** CU3, step 2 - Set a new password from the recovery email's link (PAN 05).
 * Rendered inside the white card that `app/reset-password/layout.tsx`
 * provides. */
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, toggleShowPassword] = useToggle(false);
  const [showConfirmPassword, toggleShowConfirmPassword] = useToggle(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  // A missing token never reaches the backend to get its own error code, so
  // it's seeded directly with the same copy `INVALID_RECOVERY_TOKEN` gets.
  const [tokenError, setTokenError] = useState<string | null>(
    token ? null : TOKEN_ERROR_MESSAGES.INVALID_RECOVERY_TOKEN,
  );

  async function submit() {
    if (!token) {
      return;
    }

    setFormError(null);

    const errors = validate(newPassword, confirmPassword);
    setFieldErrors(errors);
    if (errors.newPassword || errors.confirmPassword) {
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ token, newPassword });
      setSucceeded(true);
    } catch (error) {
      if (error instanceof ApiError && error.code && error.code in TOKEN_ERROR_MESSAGES) {
        // The token itself is what's wrong: resubmitting the same form can
        // only fail again, so this isn't a form error — it replaces the view.
        setTokenError(TOKEN_ERROR_MESSAGES[error.code]);
      } else if (error instanceof ApiError) {
        setFormError(requestErrorMessage(error));
        setFieldErrors(fieldErrorsFrom(error));
        setSubmitting(false);
      } else {
        setFormError("No pudimos actualizar la contraseña. Intentá de nuevo.");
        setSubmitting(false);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  if (tokenError) {
    return (
      <div className={styles.successState}>
        <span className={`${styles.successIcon} ${styles.errorIcon}`} aria-hidden="true">
          <Icon name="triangle-alert" size={32} />
        </span>

        <h1 className={`sp-h2 ${styles.successTitle}`}>{tokenError}</h1>
        <p className={`sp-small ${styles.successMessage}`}>
          Pedí un enlace nuevo para poder restablecer tu contraseña.
        </p>

        <Link href={ROUTES.recoverPassword} className={styles.primaryLinkButton}>
          Pedir un enlace nuevo
        </Link>

        <Link href={ROUTES.login} className={styles.backLink}>
          ← Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  if (succeeded) {
    return (
      <div className={styles.successState}>
        <span className={styles.successIcon} aria-hidden="true">
          <Icon name="circle-check" size={32} />
        </span>

        <h1 className={`sp-h2 ${styles.successTitle}`}>¡Contraseña actualizada!</h1>
        <p className={`sp-small ${styles.successMessage}`}>
          Ya podés iniciar sesión con tu nueva contraseña.
        </p>

        <Link href={ROUTES.login} className={styles.primaryLinkButton}>
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className={`${styles.header} ${styles.headerLogin}`}>
        <h1 className="sp-h2">Restablecer contraseña</h1>
        <p className={`sp-small ${styles.subtitle}`}>
          Elegí una contraseña nueva para tu cuenta.
        </p>
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

        <div>
          <AuthField
            label="Contraseña nueva"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
            }}
            error={fieldErrors.newPassword}
            disabled={submitting}
            placeholder={`Mínimo ${MIN_RESET_PASSWORD_LENGTH} caracteres`}
            required
            rightSlot={{
              icon: showPassword ? "eye-off" : "eye",
              label: showPassword ? "Ocultar contraseña" : "Mostrar contraseña",
              pressed: showPassword,
              onClick: toggleShowPassword,
            }}
          />
          <PasswordStrength password={newPassword} />
        </div>

        <AuthField
          label="Confirmar contraseña"
          type={showConfirmPassword ? "text" : "password"}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
          }}
          error={fieldErrors.confirmPassword}
          disabled={submitting}
          placeholder="Repetí tu contraseña"
          required
          rightSlot={{
            icon: showConfirmPassword ? "eye-off" : "eye",
            label: showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña",
            pressed: showConfirmPassword,
            onClick: toggleShowConfirmPassword,
          }}
        />

        <Button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Actualizando…" : "Actualizar contraseña"}
        </Button>
      </form>
    </>
  );
}
