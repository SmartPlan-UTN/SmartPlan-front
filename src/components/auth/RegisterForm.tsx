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
import { PasswordStrength } from "./PasswordStrength";
import { TermsDialog } from "./TermsDialog";
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH, REQUIRED_MESSAGE } from "./validation";

interface FieldErrors {
  name?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  accepted?: string;
}

/** Generic, user-facing message for each CU2 error code. Shares
 * `ATTEMPT_LIMIT_EXCEEDED`/`TOO_MANY_REQUESTS` handling with `LoginForm`'s
 * `loginErrorMessage` — see that comment for why both codes are handled. */
function registerErrorMessage(error: ApiError): string {
  switch (error.code) {
    case "EMAIL_ALREADY_REGISTERED":
      return "Ya existe una cuenta con este email.";
    case "ATTEMPT_LIMIT_EXCEEDED":
    case "TOO_MANY_REQUESTS":
      return "Hiciste demasiados intentos. Esperá un momento antes de volver a intentar.";
    case "VALIDATION_FAILED":
      return "Revisá los datos ingresados.";
    default:
      return error.isNetworkError
        ? error.message
        : "No pudimos crear la cuenta. Intentá de nuevo.";
  }
}

/**
 * Maps the backend's per-field validation errors (`400 VALIDATION_FAILED`,
 * `errors: [{ field, messages }]`) to this form's fields. `confirmPassword`
 * is never sent to the backend, so it never comes back here either.
 */
function fieldErrorsFrom(error: ApiError): FieldErrors {
  const rawErrors = error.data?.errors;
  if (!Array.isArray(rawErrors)) {
    return {};
  }

  const fieldErrors: FieldErrors = {};
  const knownFields = ["name", "lastName", "email", "password"] as const;

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

    const field = knownFields.find((candidate) => candidate === detail.field);
    if (field) {
      fieldErrors[field] = message;
    }
  }

  return fieldErrors;
}

function validate(
  name: string,
  lastName: string,
  email: string,
  password: string,
  confirmPassword: string,
  accepted: boolean,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!name.trim()) {
    errors.name = REQUIRED_MESSAGE;
  }

  if (!lastName.trim()) {
    errors.lastName = REQUIRED_MESSAGE;
  }

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

  if (!confirmPassword) {
    errors.confirmPassword = REQUIRED_MESSAGE;
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Las contraseñas no coinciden";
  }

  if (!accepted) {
    errors.accepted = "Tenés que aceptar los términos y condiciones";
  }

  return errors;
}

/** CU2 - Signup form (PAN 04). Rendered inside the white card that
 * `app/signup/layout.tsx` provides. A successful signup opens a session
 * immediately, same as login. */
export function RegisterForm() {
  const { register } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, toggleShowPassword] = useToggle(false);
  const [showConfirmPassword, toggleShowConfirmPassword] = useToggle(false);
  const [accepted, setAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setFormError(null);

    const errors = validate(
      name,
      lastName,
      email,
      password,
      confirmPassword,
      accepted,
    );
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      // `confirmPassword` and `accepted` are client-only: CU2's contract
      // (`register-user.dto.ts`) only takes these four fields.
      await register({
        name: name.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });
      router.replace(ROUTES.home);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(registerErrorMessage(error));
        setFieldErrors(fieldErrorsFrom(error));
      } else {
        setFormError("No pudimos crear la cuenta. Intentá de nuevo.");
      }
      setSubmitting(false);
    }
    // No `finally`: on success, `router.replace` unmounts this form once the
    // destination renders. Only the error path needs to re-enable the
    // submit button.
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
    <>
      <div className={`${styles.header} ${styles.headerRegister}`}>
        <h1 className="sp-h2">Crear cuenta</h1>
        <p className={`sp-small ${styles.subtitle}`}>
          Empezá a planificar tus experiencias ✦
        </p>
      </div>

      <form
        className={`${styles.form} ${styles.formRegister}`}
        onSubmit={handleSubmit}
        noValidate
      >
        {formError ? (
          <p className={styles.formError} role="alert">
            <Icon name="circle-alert" size={18} />
            {formError}
          </p>
        ) : null}

        <div className={styles.row2}>
          <AuthField
            label="Nombre"
            type="text"
            autoComplete="given-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            error={fieldErrors.name}
            disabled={submitting}
            placeholder="Martina"
            required
          />
          <AuthField
            label="Apellido"
            type="text"
            autoComplete="family-name"
            value={lastName}
            onChange={(event) => {
              setLastName(event.target.value);
            }}
            error={fieldErrors.lastName}
            disabled={submitting}
            placeholder="García"
            required
          />
        </div>

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

        <div>
          <AuthField
            label="Contraseña"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
            error={fieldErrors.password}
            disabled={submitting}
            placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
            required
            rightSlot={{
              icon: showPassword ? "eye-off" : "eye",
              label: showPassword ? "Ocultar contraseña" : "Mostrar contraseña",
              pressed: showPassword,
              onClick: toggleShowPassword,
            }}
          />
          <PasswordStrength password={password} />
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

        <div>
          <label className={styles.terms}>
            <input
              type="checkbox"
              className={styles.checkboxInput}
              checked={accepted}
              onChange={(event) => {
                setAccepted(event.target.checked);
                if (event.target.checked) {
                  setFieldErrors((current) => ({ ...current, accepted: undefined }));
                }
              }}
              required
            />
            <span
              className={
                accepted
                  ? `${styles.checkboxBox} ${styles.checkboxBoxChecked}`
                  : styles.checkboxBox
              }
              aria-hidden="true"
            >
              {accepted ? <Icon name="check" size={12} color="var(--white)" stroke={3} /> : null}
            </span>
            <p className={styles.termsText}>
              Acepto los{" "}
              <button
                type="button"
                className={styles.termsLink}
                onClick={(event) => {
                  // Prevents the label's default behavior (toggling the
                  // checkbox) so opening the popup doesn't also accept the
                  // terms on the user's behalf.
                  event.preventDefault();
                  event.stopPropagation();
                  setShowTerms(true);
                }}
              >
                términos y condiciones
              </button>
            </p>
          </label>
          <p
            className={
              fieldErrors.accepted
                ? styles.fieldError
                : `${styles.fieldError} ${styles.fieldErrorHidden}`
            }
            role={fieldErrors.accepted ? "alert" : undefined}
          >
            {fieldErrors.accepted || " "}
          </p>
        </div>

        <Button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
      </form>

      {showTerms ? <TermsDialog onClose={() => setShowTerms(false)} /> : null}

      <p className={`${styles.footer} ${styles.footerRegister}`}>
        ¿Ya tenés cuenta?{" "}
        <Link href={ROUTES.login} className={styles.footerLink}>
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
