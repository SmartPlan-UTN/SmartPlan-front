"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, Field, Icon, PasswordStrength } from "@/components/ui";
import { useToggle } from "@/hooks";
import { ApiError, changePassword } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { passwordChangedLoginRoute } from "@/lib/routes";
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
 * The three checklist rows from `Security.jsx`'s `PasswordRules`, visually
 * unchanged from the mockup. Only the first is real: `validate()` below
 * enforces just `MIN_PASSWORD_LENGTH` (8-128, no complexity rule), the
 * actual `change-password.dto.ts` contract. The uppercase/digit+symbol rows
 * are informational only — they reflect what was typed but never block
 * submitting, the same non-normative treatment already given to
 * `PasswordStrength`: a UX hint, not a claimed backend requirement. Gating
 * submission on them would reject passwords the backend accepts.
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
 * `Security.jsx`. Always visible — unlike its previous home as a
 * collapsed card on `/profile` (see `SecurityScreen`'s doc comment), this
 * is now the entire point of its own `/security` screen, so there's no
 * toggle to open it.
 *
 * Has a "Contraseña actual" field the prototype's form doesn't: SmartPlan-
 * back's `change-password.dto.ts` requires the current password to verify
 * identity before accepting a new one, so the field stays even though
 * neither `Security.jsx` nor `Profile.jsx`'s card asks for it.
 *
 * On success, the backend closes every session for the account — including
 * this one — and every pending recovery token, so there is nothing left to
 * show inline: the local session is closed the same way (`useSession().
 * logout()`, best-effort `DELETE /sessions` plus clearing local state) and
 * the app redirects to Login with an explanatory flag.
 *
 * Renders the prototype's full three-row password-requirements checklist
 * ("Mínimo N caracteres", "Al menos una mayúscula", "Incluir números y
 * símbolos" — see `passwordRequirements()`), but only the first row is a
 * real, enforced rule: the actual contract is 8-128 characters with no
 * complexity requirement, so the length label uses `MIN_PASSWORD_LENGTH`
 * instead of a literal, and `validate()` below only checks length. The
 * other two rows are informational, same non-normative
 * treatment as the strength bar beside them — they never block submitting
 * a password the backend would accept.
 */
export function ChangePasswordForm() {
  const { logout } = useSession();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, toggleShowCurrent] = useToggle(false);
  const [showNew, toggleShowNew] = useToggle(false);
  const [showConfirm, toggleShowConfirm] = useToggle(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
          <Button type="button" variant="ghostLight" onClick={resetForm} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            <Icon name="shield-check" size={15} />
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
