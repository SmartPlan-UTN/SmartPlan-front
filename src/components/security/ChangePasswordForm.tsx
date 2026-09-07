"use client";

import { useState, type FormEvent } from "react";

import { Button, Field, Icon, PasswordStrength } from "@/components/ui";
import { useToggle } from "@/hooks";
import { ApiError, changePassword } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH, REQUIRED_MESSAGE } from "@/lib/utils";

import styles from "./security.module.css";

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const EMPTY_FIELDS = { currentPassword: "", newPassword: "", confirmPassword: "" };

const HAS_UPPERCASE = /[A-Z]/;
const HAS_DIGIT = /[0-9]/;
const HAS_SYMBOL = /[!@#$%^&*]/;

interface PasswordRequirement {
  label: string;
  met: boolean;
}

/**
 * The three checklist rows from `Security.jsx`'s `PasswordRules`. All three
 * are real requirements (CU6): `validate()` below and `change-password.dto.ts`
 * both reject a `newPassword` missing any of them, so a row left unmet here
 * is exactly why "Guardar cambios" will fail.
 */
function passwordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      label: `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`,
      met: password.length >= MIN_PASSWORD_LENGTH,
    },
    { label: "Al menos una mayúscula", met: HAS_UPPERCASE.test(password) },
    {
      label: "Incluir números y símbolos",
      met: HAS_DIGIT.test(password) && HAS_SYMBOL.test(password),
    },
  ];
}

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
  } else if (!HAS_UPPERCASE.test(newPassword)) {
    errors.newPassword = "La contraseña debe incluir al menos una mayúscula";
  } else if (!HAS_DIGIT.test(newPassword) || !HAS_SYMBOL.test(newPassword)) {
    errors.newPassword = "La contraseña debe incluir números y símbolos";
  }

  if (!confirmPassword) {
    errors.confirmPassword = REQUIRED_MESSAGE;
  } else if (confirmPassword !== newPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden";
  }

  return errors;
}

/**
 * CU6 - Change password (PAN 14)'s form, per the v2 system design's
 * `Security.jsx`. Collapsed until "Cambiar contraseña" is clicked — see the
 * `editing` state below for why.
 *
 * Has a "Contraseña actual" field the prototype's form doesn't: SmartPlan-
 * back's `change-password.dto.ts` requires the current password to verify
 * identity before accepting a new one, so the field stays even though
 * neither `Security.jsx` nor `Profile.jsx`'s card asks for it.
 *
 * On success, the backend revokes every *other* session for the account and
 * every pending recovery token, but reissues this one, returning a fresh
 * `AuthenticationResponse` — same shape as login/refresh. `applyAuthentication`
 * feeds that straight into `SessionProvider` instead of the form logging out
 * and redirecting to Login: changing your own password from inside the app
 * you're currently using shouldn't also sign you out of it.
 *
 * Renders the prototype's full three-row password-requirements checklist
 * ("Mínimo N caracteres", "Al menos una mayúscula", "Incluir números y
 * símbolos" — see `passwordRequirements()`). All three are real, enforced
 * rules: `validate()` below rejects a `newPassword` missing any of them,
 * and `change-password.dto.ts` enforces the same on the backend.
 */
export function ChangePasswordForm() {
  const { applyAuthentication } = useSession();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, toggleShowCurrent] = useToggle(false);
  const [showNew, toggleShowNew] = useToggle(false);
  const [showConfirm, toggleShowConfirm] = useToggle(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Collapsed until "Cambiar contraseña" is clicked (CU6): landing on
  // /security with three empty password fields already open invited typing
  // into them by accident, same reasoning as `ProfileForm`'s edit gate.
  const [editing, setEditing] = useState(false);
  const [saveConfirmed, setSaveConfirmed] = useState(false);

  // Clears the draft in place instead of navigating away: same behavior as
  // `ProfileForm`'s own Cancelar, on the same screen family — the
  // prototype's `Security.jsx` sends Cancelar back to the previous screen,
  // but there's no unsaved-elsewhere state to protect here, just this form.
  function resetForm() {
    setCurrentPassword(EMPTY_FIELDS.currentPassword);
    setNewPassword(EMPTY_FIELDS.newPassword);
    setConfirmPassword(EMPTY_FIELDS.confirmPassword);
    setFieldErrors({});
    setFormError(null);
  }

  function cancelEditing() {
    resetForm();
    setEditing(false);
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
      const authentication = await changePassword({ currentPassword, newPassword });
      // Every *other* session was revoked server-side, but this one got
      // fresh tokens in the same response — apply them instead of logging
      // out, so changing the password doesn't also sign this device out.
      applyAuthentication(authentication);
      resetForm();
      setEditing(false);
      setSaveConfirmed(true);
      setTimeout(() => setSaveConfirmed(false), 3000);
    } catch (error) {
      if (error instanceof ApiError && error.code === "INVALID_CURRENT_PASSWORD") {
        setFieldErrors({ currentPassword: "La contraseña actual es incorrecta." });
      } else if (error instanceof ApiError) {
        setFormError(saveErrorMessage(error));
        setFieldErrors(fieldErrorsFrom(error));
      } else {
        setFormError("No pudimos actualizar la contraseña. Intentá de nuevo.");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardStrip} />

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon} aria-hidden="true">
            <Icon name="lock" size={18} />
          </span>
          <div>
            <p className={`sp-small ${styles.sectionTitle}`}>Cambiar contraseña</p>
            <p className={`sp-small ${styles.sectionSubtitle}`}>
              Actualizá tu contraseña periódicamente.
            </p>
          </div>
        </div>

        <div className={styles.divider} />

        {!editing ? (
          <Button
            type="button"
            variant="ghostLight"
            onClick={() => setEditing(true)}
          >
            <Icon name="lock" size={14} aria-hidden="true" />
            Cambiar contraseña
          </Button>
        ) : null}

        {!editing && saveConfirmed ? (
          <p className={styles.formNotice} role="status">
            <Icon name="circle-check" size={18} />
            Contraseña actualizada correctamente
          </p>
        ) : null}

        {editing && formError ? (
          <p className={styles.formError} role="alert">
            <Icon name="circle-alert" size={18} />
            {formError}
          </p>
        ) : null}

        {editing ? (
          <>
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
              <ul className={styles.requirements} aria-hidden="true">
                {passwordRequirements(newPassword).map((requirement) => (
                  <li
                    key={requirement.label}
                    className={
                      requirement.met
                        ? `${styles.requirement} ${styles.requirementMet}`
                        : styles.requirement
                    }
                  >
                    <span className={styles.requirementDot}>
                      {requirement.met ? <Icon name="check" size={10} /> : null}
                    </span>
                    {requirement.label}
                  </li>
                ))}
              </ul>
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
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                <Icon name="shield-check" size={15} />
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </>
        ) : null}
      </form>
    </div>
  );
}
