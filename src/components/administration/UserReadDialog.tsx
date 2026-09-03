"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button, ConfirmationDialog, Icon } from "@/components/ui";
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
  onDelete: (id: number) => Promise<void>;
}

export function UserReadDialog({
  user,
  onClose,
  onSave,
  onDelete,
}: UserReadDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
        if (showDeleteConfirm) setShowDeleteConfirm(false);
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
  }, [showDeleteConfirm, onClose, saving]);

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

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(user.id);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "ADMIN_SELF_DELETE") {
        setDeleteError("No podés eliminar tu propia cuenta.");
      } else if (caught instanceof ApiError && caught.isForbidden) {
        setDeleteError("No tenés permisos para eliminar este usuario.");
      } else {
        setDeleteError("No pudimos eliminar el usuario. Intentá nuevamente.");
      }
      setDeleting(false);
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
              <Button variant="ghostEmber" onClick={() => setEditing(true)}>
                <Icon name="pencil" size={15} /> Editar
              </Button>
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                <Icon name="trash-2" size={15} /> Eliminar usuario
              </Button>
              <Button variant="ghostLight" onClick={onClose}>Cerrar</Button>
            </div>
          </>
        )}
      </section>

      {showDeleteConfirm ? (
        <ConfirmationDialog
          title={`¿Eliminar a ${user.name} ${user.lastName}?`}
          confirmLabel="Sí, eliminar usuario"
          confirmingLabel="Eliminando..."
          cancelLabel="Volver"
          isConfirming={deleting}
          error={deleteError}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => void handleDelete()}
        >
          <p>
            La cuenta se elimina y ya no va a poder iniciar sesión. Sus
            planes y valoraciones existentes se conservan.
          </p>
        </ConfirmationDialog>
      ) : null}
    </div>
  );
}
