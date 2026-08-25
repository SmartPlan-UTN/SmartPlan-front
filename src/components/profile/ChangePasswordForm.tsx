"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, Field, Icon, PasswordStrength } from "@/components/ui";
import { useToggle } from "@/hooks";
import { ApiError, changePassword } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { passwordChangedLoginRoute } from "@/lib/routes";
import { MIN_PASSWORD_LENGTH, REQUIRED_MESSAGE } from "@/lib/utils";

import styles from "./profile.module.css";

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const EMPTY_FIELDS = { currentPassword: "", newPassword: "", confirmPassword: "" };

/**
 * Generic, user-facing message for each CU6 error code.
 * `INVALID_CURRENT_PASSWORD` is shown on the field instead (see `submit`).
 */
function saveErrorMessage(error: ApiError): string {
  if (error.code === "VALIDATION_FAILED") {
    return "Revisá los datos ingresados.";
  }

  return error.isNetworkError
    ? error.message
    : "No pudimos actualizar la contraseña. Intentá de nuevo.";
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

    if (!message) {
      continue;
    }

    if (detail.field === "currentPassword") {
      fieldErrors.currentPassword = message;
    } else if (detail.field === "newPassword") {
      fieldErrors.newPassword = message;
    }
  }

  return fieldErrors;
}

function validate(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!currentPassword) {
    errors.currentPassword = REQUIRED_MESSAGE;
  }

  if (!newPassword) {
    errors.newPassword = REQUIRED_MESSAGE;
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }

  if (!confirmPassword) {
    errors.confirmPassword = REQUIRED_MESSAGE;
  } else if (confirmPassword !== newPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden";
  }

  return errors;
}

/**
 * CU6 - Change password (PAN 14), per the v2 system design's `Profile.jsx`
 * (the same rules as its "Security" screen). Collapsed by default, like the
 * prototype's toggle card.
 *
 * On success, the backend closes every session for the account — including
 * this one — and every pending recovery token, so there is nothing left to
 * show inline: the local session is closed the same way (`useSession().
 * logout()`, best-effort `DELETE /sessions` plus clearing local state) and
 * the app redirects to Login with an explanatory flag.
 *
 * Doesn't port the prototype's password-requirements checklist ("Mínimo 8
 * caracteres", "Al menos una mayúscula", "Incluir números y símbolos"): the
 * real rule is 12-128 characters with no complexity requirement, and
 * showing pass/fail checks for rules the backend doesn't enforce would
 * misrepresent what's actually required. `PasswordStrength` (a non-normative
 * visual nudge, not a set of requirements) plus the field's own placeholder
 * cover it instead.
 */
export function ChangePasswordForm() {
  const { logout } = useSession();
  const router = useRouter();

  const [expanded, setExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, toggleShowCurrent] = useToggle(false);
  const [showNew, toggleShowNew] = useToggle(false);
  const [showConfirm, toggleShowConfirm] = useToggle(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setCurrentPassword(EMPTY_FIELDS.currentPassword);
    setNewPassword(EMPTY_FIELDS.newPassword);
    setConfirmPassword(EMPTY_FIELDS.confirmPassword);
    setFieldErrors({});
    setFormError(null);
  }

  function toggleExpanded() {
    if (expanded) {
      resetForm();
    }
    setExpanded((value) => !value);
  }

  async function submit() {
    setFormError(null);

    const errors = validate(currentPassword, newPassword, confirmPassword);
    setFieldErrors(errors);
    if (errors.currentPassword || errors.newPassword || errors.confirmPassword) {
      return;
    }

    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      // The backend already revoked every session for this account,
      // including the one making this request: close the local session too
      // (best-effort DELETE /sessions plus clearing local state) and send
      // the user to Login instead of leaving them on a screen that assumes
      // they're still authenticated.
      await logout();
      router.replace(passwordChangedLoginRoute());
    } catch (error) {
      if (error instanceof ApiError && error.code === "INVALID_CURRENT_PASSWORD") {
        setFieldErrors({ currentPassword: "La contraseña actual es incorrecta." });
      } else if (error instanceof ApiError) {
        setFormError(saveErrorMessage(error));
        setFieldErrors(fieldErrorsFrom(error));
      } else {
        setFormError("No pudimos actualizar la contraseña. Intentá de nuevo.");
      }
      setSaving(false);
    }
    // No `finally`: on success, the redirect unmounts this form. Only the
    // error path needs to re-enable the submit button.
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
    <div className={styles.card}>
      <button
        type="button"
        className={expanded ? `${styles.toggleRow} ${styles.toggleRowOpen}` : styles.toggleRow}
        onClick={toggleExpanded}
        aria-expanded={expanded}
      >
        <span className={styles.toggleIcon} aria-hidden="true">
          <Icon name="lock" size={17} />
        </span>
        <span className={styles.toggleText}>
          <p className={`sp-small ${styles.toggleTitle}`}>Cambiar contraseña</p>
          <p className={`sp-small ${styles.toggleSubtitle}`}>
            {expanded
              ? "Completá los campos para actualizar tu contraseña."
              : "Actualizá tu contraseña periódicamente."}
          </p>
        </span>
        <span
          className={expanded ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron}
          aria-hidden="true"
        >
          <Icon name="chevron-down" size={18} />
        </span>
      </button>

      {expanded ? (
        <form className={styles.passwordForm} onSubmit={handleSubmit} noValidate>
          {formError ? (
            <p className={styles.formError} role="alert">
              <Icon name="circle-alert" size={18} />
              {formError}
            </p>
          ) : null}

          <Field
            label="Contraseña actual"
            type={showCurrent ? "text" : "password"}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
            }}
            error={fieldErrors.currentPassword}
            disabled={saving}
            required
            rightSlot={{
              icon: showCurrent ? "eye-off" : "eye",
              label: showCurrent ? "Ocultar contraseña" : "Mostrar contraseña",
              pressed: showCurrent,
              onClick: toggleShowCurrent,
            }}
          />

          <div>
            <Field
              label="Contraseña nueva"
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
              }}
              error={fieldErrors.newPassword}
              disabled={saving}
              placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
              required
              rightSlot={{
                icon: showNew ? "eye-off" : "eye",
                label: showNew ? "Ocultar contraseña" : "Mostrar contraseña",
                pressed: showNew,
                onClick: toggleShowNew,
              }}
            />
            <PasswordStrength password={newPassword} />
          </div>

          <Field
            label="Confirmar contraseña nueva"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
            }}
            error={fieldErrors.confirmPassword}
            disabled={saving}
            placeholder="Repetí tu contraseña nueva"
            required
            rightSlot={{
              icon: showConfirm ? "eye-off" : "eye",
              label: showConfirm ? "Ocultar contraseña" : "Mostrar contraseña",
              pressed: showConfirm,
              onClick: toggleShowConfirm,
            }}
          />

          <div className={styles.divider} />

          <div className={styles.actions}>
            <Button
              type="button"
              variant="ghostLight"
              onClick={toggleExpanded}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Actualizando…" : "Actualizar contraseña"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
