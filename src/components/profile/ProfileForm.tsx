"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button, Field, Icon } from "@/components/ui";
import { ApiError, getProfile, updateProfile } from "@/lib/api";
import type { UserProfile } from "@/types";

import styles from "./profile.module.css";

interface FieldErrors {
  name?: string;
  lastName?: string;
  phone?: string;
}

const REQUIRED_MESSAGE = "Este campo es requerido";
/** Matches `SmartPlan-back`'s `update-profile.dto.ts`: `name`/`lastName`
 * are each 1-80 characters. */
const MAX_NAME_LENGTH = 80;

/** Same pattern as `update-profile.dto.ts`'s `PHONE_PATTERN`: digits, spaces,
 * and the punctuation an international number uses (`+54 11 4321 0987`). */
const PHONE_PATTERN = /^[+\d][\d\s()-]{5,29}$/;

/**
 * Generic, user-facing message for each CU5 save error code. Never surfaces
 * `error.message` for an unmapped or 5xx failure — the backend's own
 * fallback for those is an internal, technical, English string, and the
 * ticket explicitly asks not to expose that detail.
 */
function saveErrorMessage(error: ApiError): string {
  if (error.code === "VALIDATION_FAILED") {
    return "Revisá los datos ingresados.";
  }

  if (error.isForbidden) {
    return "No tenés permiso para hacer esto.";
  }

  return error.isNetworkError
    ? error.message
    : "No pudimos guardar los cambios. Intentá de nuevo.";
}

/**
 * Maps the backend's per-field validation errors (`400 VALIDATION_FAILED`,
 * `errors: [{ field, messages }]`) to this form's two fields.
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

    if (detail.field === "name") {
      fieldErrors.name = message;
    } else if (detail.field === "lastName") {
      fieldErrors.lastName = message;
    } else if (detail.field === "phone") {
      fieldErrors.phone = message;
    }
  }

  return fieldErrors;
}

function validate(name: string, lastName: string, phone: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!name.trim()) {
    errors.name = REQUIRED_MESSAGE;
  } else if (name.trim().length > MAX_NAME_LENGTH) {
    errors.name = `Máximo ${MAX_NAME_LENGTH} caracteres`;
  }

  if (!lastName.trim()) {
    errors.lastName = REQUIRED_MESSAGE;
  } else if (lastName.trim().length > MAX_NAME_LENGTH) {
    errors.lastName = `Máximo ${MAX_NAME_LENGTH} caracteres`;
  }

  // Phone is optional: an empty field is valid, only a non-empty one is
  // checked against the format the backend accepts.
  if (phone.trim() && !PHONE_PATTERN.test(phone.trim())) {
    errors.phone = "Ingresá un teléfono válido";
  }

  return errors;
}

type LoadStatus = "loading" | "loaded" | "error";

/**
 * CU5 - Edit profile (PAN 14), per the v2 system design's `Profile.jsx`.
 * Loads the signed-in user's name, last name, email, and phone, and saves
 * changes to name/last name/phone. Email is shown but never editable —
 * `GET`/`PATCH /users/me` don't accept changing it, and role/status aren't
 * shown at all, matching the prototype (neither appears on this screen
 * there).
 *
 * Phone is outside CU5's original scope (`GET`/`PATCH /users/me` didn't
 * carry it), added afterward with its own backend support: nullable
 * `user.phone`, validated the same way on both ends (`PHONE_PATTERN`).
 * Clearing the field sends `null`, not an empty string.
 */
export function ProfileForm() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [retryToken, setRetryToken] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastState, setToastState] = useState<"hidden" | "visible" | "leaving">(
    "hidden",
  );

  useEffect(() => {
    let ignore = false;

    async function load() {
      setStatus("loading");

      try {
        const loaded = await getProfile();
        if (ignore) return;
        setProfile(loaded);
        setName(loaded.name);
        setLastName(loaded.lastName);
        setPhone(loaded.phone ?? "");
        setStatus("loaded");
      } catch {
        // Same reasoning as the save path: whatever failed (network, 5xx,
        // an unexpected 403), there's nothing actionable in the raw detail
        // for someone just trying to see their own profile.
        if (!ignore) {
          setStatus("error");
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [retryToken]);

  function resetDraft() {
    if (!profile) return;
    setName(profile.name);
    setLastName(profile.lastName);
    setPhone(profile.phone ?? "");
    setFieldErrors({});
    setFormError(null);
  }

  async function submit() {
    setFormError(null);

    const errors = validate(name, lastName, phone);
    setFieldErrors(errors);
    if (errors.name || errors.lastName || errors.phone) {
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfile({
        name: name.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
      });
      setProfile(updated);
      setName(updated.name);
      setLastName(updated.lastName);
      setPhone(updated.phone ?? "");
      setToastState("visible");
      setTimeout(() => {
        setToastState("leaving");
      }, 2400);
      setTimeout(() => {
        setToastState("hidden");
      }, 2620);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(saveErrorMessage(error));
        setFieldErrors(fieldErrorsFrom(error));
      } else {
        setFormError("No pudimos guardar los cambios. Intentá de nuevo.");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  if (status === "loading") {
    return (
      <div className={styles.wrapper}>
        <p className="sp-body" role="status">
          Cargando tu perfil…
        </p>
      </div>
    );
  }

  if (status === "error" || !profile) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loadError} role="alert">
          <Icon name="circle-alert" size={24} />
          <p className="sp-body">No pudimos cargar tu perfil. Intentá de nuevo.</p>
          <Button
            type="button"
            variant="ghostLight"
            onClick={() => {
              setRetryToken((token) => token + 1);
            }}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const initials = `${profile.name[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className={styles.wrapper}>
      <h1 className={`sp-h2 ${styles.heading}`}>Mi perfil</h1>

      <div className={styles.card}>
        <div className={styles.cardHeader} />

        <div className={styles.identity}>
          <div className={styles.avatar} aria-hidden="true">
            {initials}
          </div>
          <div className={styles.identityText}>
            <p className={`sp-h3 ${styles.name}`}>
              {profile.name} {profile.lastName}
            </p>
            <p className={`sp-small ${styles.email}`}>{profile.email}</p>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.divider} />

          <p className={`sp-label ${styles.sectionLabel}`}>Información personal</p>

          {formError ? (
            <p className={styles.formError} role="alert">
              <Icon name="circle-alert" size={18} />
              {formError}
            </p>
          ) : null}

          <div className={styles.row2}>
            <Field
              label="Nombre"
              type="text"
              autoComplete="given-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              error={fieldErrors.name}
              disabled={saving}
              required
            />
            <Field
              label="Apellido"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value);
              }}
              error={fieldErrors.lastName}
              disabled={saving}
              required
            />
          </div>

          <Field label="Email" type="email" value={profile.email} disabled />

          <Field
            label="Teléfono"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
            }}
            error={fieldErrors.phone}
            disabled={saving}
            placeholder="+54 11 4321 0987"
          />

          <div className={styles.divider} />

          <div className={styles.actions}>
            <Button
              type="button"
              variant="ghostLight"
              onClick={resetDraft}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </div>

      {toastState !== "hidden" ? (
        <div
          className={
            toastState === "leaving"
              ? `${styles.toast} ${styles.toastOut}`
              : styles.toast
          }
          role="status"
        >
          <Icon name="circle-check" size={16} />
          Cambios guardados correctamente
        </div>
      ) : null}
    </div>
  );
}
