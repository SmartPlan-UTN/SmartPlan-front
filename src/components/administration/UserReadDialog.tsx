"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button, Icon } from "@/components/ui";
import { ApiError } from "@/lib/api";
import type {
  AdminUser,
  RoleKey,
  UpdateAdminUserInput,
  UserStatusKey,
} from "@/types";

import { UserAvatar } from "./UserAvatar";
import { UserStatusBadge } from "./UserStatusBadge";

import styles from "./administration.module.css";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const ROLE_OPTIONS: Array<{ value: RoleKey; label: string }> = [
  { value: "user", label: "Usuario" },
  { value: "admin", label: "Administrador" },
];

const STATUS_OPTIONS: Array<{ value: UserStatusKey; label: string }> = [
  { value: "active", label: "Activo" },
  { value: "suspended", label: "Suspendido" },
  { value: "banned", label: "Baneado" },
];

export interface UserReadDialogProps {
  user: AdminUser;
  onClose: () => void;
  onSave: (id: number, input: UpdateAdminUserInput) => Promise<AdminUser>;
}

export function UserReadDialog({ user, onClose, onSave }: UserReadDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: user.name,
    lastName: user.lastName,
    email: user.email,
    role: user.role.key as RoleKey,
    status: user.status.key,
  });

  useEffect(() => {
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (actionsOpen) setActionsOpen(false);
        else if (!saving) onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled])',
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
  }, [actionsOpen, onClose, saving]);

  function cancelEditing() {
    setForm({
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      role: user.role.key as RoleKey,
      status: user.status.key,
    });
    setEditing(false);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(user.id, form);
      setEditing(false);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "EMAIL_ALREADY_REGISTERED") {
        setError("El correo electrónico ya está registrado.");
      } else if (caught instanceof ApiError && caught.isForbidden) {
        setError("No tenés permisos para editar este usuario.");
      } else {
        setError("No pudimos guardar los cambios. Intentá nuevamente.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.dialogOverlay} onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section
        ref={dialogRef}
        className={`${styles.dialog} ${styles.readDialog}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-read-title"
      >
        <header className={styles.readHeader}>
          <div className={styles.readIdentity}>
            <UserAvatar name={user.name} lastName={user.lastName} userId={user.id} />
            <div>
              <p className={styles.readEyebrow}>{editing ? "Editar usuario" : "Vista del usuario"}</p>
              <h2 id="user-read-title" className="sp-h4">{user.name} {user.lastName}</h2>
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.readClose} aria-label="Cerrar detalle del usuario" disabled={saving} onClick={onClose}>
            <Icon name="x" size={19} />
          </button>
        </header>

        {editing ? (
          <form onSubmit={(event) => void submit(event)}>
            <div className={styles.editGrid}>
              <label><span>Nombre</span><input required maxLength={80} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label><span>Apellido</span><input required maxLength={80} value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} /></label>
              <label className={styles.editWideField}><span>Correo electrónico</span><input required type="email" maxLength={150} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
              <label><span>Rol</span><select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as RoleKey }))}>{ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label><span>Estado</span><select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as UserStatusKey }))}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            </div>
            <dl className={styles.immutableGrid}>
              <div><dt>Fecha de registro</dt><dd>{dateFormatter.format(new Date(user.createdAt))}</dd></div>
              <div><dt>Identificador</dt><dd>#{user.id}</dd></div>
            </dl>
            {error ? <p className={styles.dialogError} role="alert">{error}</p> : null}
            <div className={styles.readActions}>
              <Button variant="ghostLight" disabled={saving} onClick={cancelEditing}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>
            </div>
          </form>
        ) : (
          <>
            <dl className={styles.readGrid}>
              <div><dt>Correo electrónico</dt><dd>{user.email}</dd></div>
              <div><dt>Rol</dt><dd><span className={styles.roleBadge}>{user.role.name}</span></dd></div>
              <div><dt>Estado</dt><dd><UserStatusBadge status={user.status.key} /></dd></div>
              <div><dt>Fecha de registro</dt><dd>{dateFormatter.format(new Date(user.createdAt))}</dd></div>
              <div><dt>Última actualización</dt><dd>{dateFormatter.format(new Date(user.updatedAt))}</dd></div>
              <div><dt>Identificador</dt><dd>#{user.id}</dd></div>
            </dl>
            <div className={styles.readActions}>
              <div className={styles.readActionMenu}>
                <Button variant="ghostEmber" aria-haspopup="menu" aria-expanded={actionsOpen} onClick={() => setActionsOpen((current) => !current)}>
                  Acciones <Icon name="chevron-down" size={15} />
                </Button>
                {actionsOpen ? (
                  <div className={styles.readActionPopover} role="menu">
                    <button type="button" role="menuitem" onClick={() => { setActionsOpen(false); setEditing(true); }}>
                      <Icon name="pencil" size={16} /> Editar usuario
                    </button>
                  </div>
                ) : null}
              </div>
              <Button variant="ghostLight" onClick={onClose}>Cerrar</Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
