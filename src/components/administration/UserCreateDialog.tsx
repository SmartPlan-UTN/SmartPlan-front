"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button, Icon, PasswordRequirements } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { newPasswordValidationMessage } from "@/lib/utils";
import type {
  AdminUser,
  CreateAdminUserInput,
  RoleKey,
  UserStatusKey,
} from "@/types";
import { useScrollLock } from "@/hooks";

import styles from "./administration.module.css";

const ROLE_OPTIONS: Array<{ value: RoleKey; label: string }> = [
  { value: "user", label: "Usuario" },
  { value: "admin", label: "Administrador" },
];

const STATUS_OPTIONS: Array<{ value: UserStatusKey; label: string }> = [
  { value: "active", label: "Activo" },
  { value: "suspended", label: "Suspendido" },
];

const EMPTY_FORM: CreateAdminUserInput = {
  name: "",
  lastName: "",
  email: "",
  password: "",
  role: "user",
  status: "active",
};

export interface UserCreateDialogProps {
  onClose: () => void;
  onCreate: (input: CreateAdminUserInput) => Promise<AdminUser>;
}

/**
 * "Nuevo usuario" (CU57): creates an account from the panel, with the same
 * fields and layout as the user edit form plus an initial password that must
 * meet the registration policy.
 */
export function UserCreateDialog({ onClose, onCreate }: UserCreateDialogProps) {
  useScrollLock();
  const dialogRef = useRef<HTMLElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<CreateAdminUserInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    firstFieldRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!saving) onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled])",
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, saving]);

  function update<K extends keyof CreateAdminUserInput>(key: K, value: CreateAdminUserInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const passwordError = newPasswordValidationMessage(form.password);
    if (passwordError) {
      setError(`${passwordError}.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        ...form,
        name: form.name.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
      });
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "EMAIL_ALREADY_REGISTERED") {
        setError("El correo electrónico ya está registrado.");
      } else if (caught instanceof ApiError && caught.isForbidden) {
        setError("No tenés permisos para crear usuarios.");
      } else if (caught instanceof ApiError && caught.code === "VALIDATION_FAILED") {
        setError("Revisá los datos ingresados.");
      } else {
        setError("No pudimos crear el usuario. Intentá nuevamente.");
      }
      setSaving(false);
    }
  }

  return (
    <div
      className={styles.dialogOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={`${styles.dialog} ${styles.readDialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-create-title"
      >
        <header className={styles.readHeader}>
          <div className={styles.readIdentity}>
            <span className={styles.createIcon} aria-hidden="true">
              <Icon name="user" size={20} />
            </span>
            <div>
              <p className={styles.readEyebrow}>Comunidad</p>
              <h2 id="user-create-title" className="sp-h4">Nuevo usuario</h2>
            </div>
          </div>
          <button
            type="button"
            className={styles.readClose}
            aria-label="Cerrar"
            disabled={saving}
            onClick={onClose}
          >
            <Icon name="x" size={19} />
          </button>
        </header>

        <form onSubmit={(event) => void submit(event)}>
          <div className={styles.editGrid}>
            <label>
              <span>Nombre</span>
              <input
                ref={firstFieldRef}
                required
                maxLength={80}
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
              />
            </label>
            <label>
              <span>Apellido</span>
              <input
                required
                maxLength={80}
                value={form.lastName}
                onChange={(event) => update("lastName", event.target.value)}
              />
            </label>
            <label className={styles.editWideField}>
              <span>Correo electrónico</span>
              <input
                required
                type="email"
                maxLength={150}
                autoComplete="off"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
              />
            </label>
            <label className={styles.editWideField}>
              <span>Contraseña inicial</span>
              <input
                required
                type="password"
                maxLength={128}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
              />
            </label>
            <div className={styles.editWideField}>
              <PasswordRequirements password={form.password} />
            </div>
            <label>
              <span>Rol</span>
              <select
                value={form.role}
                onChange={(event) => update("role", event.target.value as RoleKey)}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Estado</span>
              <select
                value={form.status}
                onChange={(event) => update("status", event.target.value as UserStatusKey)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          {error ? <p className={styles.dialogError} role="alert">{error}</p> : null}
          <div className={styles.readActions}>
            <Button variant="ghostLight" disabled={saving} onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creando..." : "Crear usuario"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
