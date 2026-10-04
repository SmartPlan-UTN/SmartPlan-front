"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Button, Field, Icon } from "@/components/ui";
import { AuthenticatedImage } from "@/components/media";
import { ApiError, deleteAvatar, getProfile, updateProfile, uploadAvatar } from "@/lib/api";
import { REQUIRED_MESSAGE } from "@/lib/utils";
import type { UserProfile } from "@/types";

import styles from "./profile.module.css";

interface FieldErrors {
  name?: string;
  lastName?: string;
}

/** Matches `SmartPlan-back`'s `update-profile.dto.ts`: `name`/`lastName`
 * are each 1-80 characters. */
const MAX_NAME_LENGTH = 80;

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
    }
  }

  return fieldErrors;
}

function validate(name: string, lastName: string): FieldErrors {
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

  return errors;
}

type LoadStatus = "loading" | "loaded" | "error";

/**
 * CU5 - Edit profile (PAN 14), per the v2 system design's `Profile.jsx`.
 * Loads the signed-in user's name, last name, and email, and saves changes
 * to name/last name. Email is shown but never editable — `GET`/
 * `PATCH /users/me` don't accept changing it, and role/status aren't shown
 * at all, matching the prototype (neither appears on this screen there).
 */
export function ProfileForm() {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [retryToken, setRetryToken] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  // Read-only until "Editar perfil" is clicked (CU5): landing on the screen
  // with the fields already open for editing made it too easy to change
  // something by accident while just checking your own data.
  const [editing, setEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
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
    setFieldErrors({});
    setFormError(null);
  }

  function startEditing() {
    setEditing(true);
  }

  function cancelEditing() {
    resetDraft();
    setEditing(false);
  }

  async function submit() {
    setFormError(null);

    const errors = validate(name, lastName);
    setFieldErrors(errors);
    if (errors.name || errors.lastName) {
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProfile({
        name: name.trim(),
        lastName: lastName.trim(),
      });
      setProfile(updated);
      setName(updated.name);
      setLastName(updated.lastName);
      setEditing(false);
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
      <p className={`sp-body ${styles.loading}`} role="status">
        Cargando tu perfil…
      </p>
    );
  }

  if (status === "error" || !profile) {
    return (
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
    );
  }

  const initials = `${profile.name[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase();

  async function changeAvatar(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setAvatarError('Usá JPG, PNG o WebP de hasta 5 MB.');
      return;
    }
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      await uploadAvatar(file);
      setProfile(await getProfile());
    } catch {
      setAvatarError('No pudimos guardar tu foto. Intentá de nuevo.');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      await deleteAvatar();
      setProfile(await getProfile());
    } catch {
      setAvatarError('No pudimos quitar tu foto. Intentá de nuevo.');
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader} />

        <div className={styles.identity}>
          <div className={styles.avatar}>
            {profile.avatarUrl ? <AuthenticatedImage url={profile.avatarUrl} alt={`Avatar de ${profile.name}`} width={72} height={72} /> : <span aria-hidden="true">{initials}</span>}
          </div>
          <div className={styles.identityText}>
            <p className={`sp-h3 ${styles.name}`}>
              {profile.name} {profile.lastName}
            </p>
            <p className={`sp-small ${styles.email}`}>{profile.email}</p>
          </div>
        </div>

        <div className={styles.avatarActions}>
          <label
            className={`${styles.avatarUpload} ${avatarBusy ? styles.avatarUploadDisabled : ""}`}
          >
            <Icon name="image-plus" size={16} aria-hidden="true" />
            <span>{avatarBusy ? "Procesando foto..." : "Elegir foto"}</span>
            <input
              className={styles.avatarFileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-describedby="avatar-upload-help"
              disabled={avatarBusy}
              onChange={(event) => {
                void changeAvatar(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          <span id="avatar-upload-help" className={styles.avatarHint}>
            JPG, PNG o WebP · Hasta 5 MB
          </span>
          {profile.avatarUrl ? (
            <Button
              type="button"
              variant="ghostEmber"
              size="sm"
              disabled={avatarBusy}
              onClick={() => void removeAvatar()}
            >
              <Icon name="trash-2" size={14} aria-hidden="true" />
              Quitar foto
            </Button>
          ) : null}
          {avatarError ? (
            <p className={styles.avatarError} role="alert">
              {avatarError}
            </p>
          ) : null}
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.divider} />

          <div className={styles.sectionHeader}>
            <p className={`sp-label ${styles.sectionLabel}`}>Información personal</p>
            {!editing ? (
              <Button type="button" variant="ghostLight" onClick={startEditing}>
                <Icon name="pencil" size={14} aria-hidden="true" />
                Editar perfil
              </Button>
            ) : null}
          </div>

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
              disabled={!editing || saving}
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
              disabled={!editing || saving}
              required
            />
          </div>

          <Field label="Email" type="email" value={profile.email} disabled />

          <div className={styles.divider} />

          {editing ? (
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
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          ) : null}
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
    </>
  );
}
