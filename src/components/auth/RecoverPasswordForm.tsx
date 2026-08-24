"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button, Icon } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { requestPasswordRecovery } from "@/lib/auth/api";
import { ROUTES } from "@/lib/routes";

import { AuthField } from "./AuthField";
import styles from "./AuthForm.module.css";
import { EMAIL_PATTERN, REQUIRED_MESSAGE } from "./validation";

interface FieldErrors {
  email?: string;
}

/**
 * Generic, user-facing message for each CU3 recovery-request error code.
 * `EMAIL_NOT_REGISTERED` is shown on the field instead: it's specific
 * feedback about what was typed, not a form-wide failure.
 */
function requestErrorMessage(error: ApiError): string {
  switch (error.code) {
    case "EMAIL_SERVICE_UNAVAILABLE":
      return "No pudimos enviar el email. Intentá de nuevo en un momento.";
    case "ATTEMPT_LIMIT_EXCEEDED":
    case "TOO_MANY_REQUESTS":
      return "Hiciste demasiados intentos. Esperá un momento antes de volver a intentar.";
    case "VALIDATION_FAILED":
      return "Revisá los datos ingresados.";
    default:
      return error.isNetworkError
        ? error.message
        : "No pudimos enviar el email. Intentá de nuevo.";
  }
}

function validate(email: string): FieldErrors {
  if (!email.trim()) {
    return { email: REQUIRED_MESSAGE };
  }

  if (!EMAIL_PATTERN.test(email.trim())) {
    return { email: "Ingresá un email válido" };
  }

  return {};
}

/** Step indicator shared by both views ("Paso 1 de 2" / "Paso 2 de 2"),
 * matching the v2 prototype's `ForgotPasswordForm`. */
function StepBar({ step }: { step: 1 | 2 }) {
  return (
    <div className={styles.stepBar}>
      <span className={`sp-label ${styles.stepLabel}`}>Paso {step} de 2</span>
      <div className={styles.stepSegments}>
        {[1, 2].map((segment) => (
          <div
            key={segment}
            className={
              segment <= step
                ? `${styles.stepSegment} ${styles.stepSegmentActive}`
                : styles.stepSegment
            }
          />
        ))}
      </div>
    </div>
  );
}

/** CU3, step 1 - Request a recovery email (PAN 05). Rendered inside the
 * white card that `app/recover-password/layout.tsx` provides. */
export function RecoverPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setFormError(null);

    const errors = validate(email);
    setFieldErrors(errors);
    if (errors.email) {
      return;
    }

    setSubmitting(true);
    try {
      await requestPasswordRecovery({ email: email.trim() });
      setSent(true);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "EMAIL_NOT_REGISTERED") {
          setFieldErrors({ email: "No existe ninguna cuenta con este email." });
        } else {
          setFormError(requestErrorMessage(error));
        }
      } else {
        setFormError("No pudimos enviar el email. Intentá de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  if (sent) {
    return (
      <div className={styles.successState}>
        <StepBar step={2} />

        <span className={styles.successIcon} aria-hidden="true">
          <Icon name="mail-check" size={32} />
        </span>

        <h1 className={`sp-h2 ${styles.successTitle}`}>¡Correo enviado!</h1>
        <p className={`sp-small ${styles.successMessage}`}>
          Revisá tu bandeja de entrada. Si no lo encontrás, chequeá en spam o
          reenvialo.
        </p>

        <Button
          type="button"
          variant="ghostEmber"
          className={styles.submit}
          onClick={() => {
            setSent(false);
          }}
        >
          Reenviar
        </Button>

        <Link href={ROUTES.login} className={styles.backLink}>
          ← Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <>
      <StepBar step={1} />

      <div className={`${styles.header} ${styles.headerLogin}`}>
        <h1 className="sp-h2">Recuperar contraseña</h1>
        <p className={`sp-small ${styles.subtitle}`}>
          Ingresá tu email y te enviaremos un enlace para restablecerla.
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

        <Button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Enviando…" : "Enviar enlace de recuperación"}
        </Button>
      </form>

      <Link href={ROUTES.login} className={styles.backLink}>
        ← Volver al inicio de sesión
      </Link>
    </>
  );
}
