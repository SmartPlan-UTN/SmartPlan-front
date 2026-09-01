"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmationDialog, Field } from "@/components/ui";
import { ApiError, deleteAccount } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { accountDeletedLoginRoute } from "@/lib/routes";

export interface DeleteAccountDialogProps {
  onCancel: () => void;
}

/**
 * CU7 - Delete account confirmation (PAN 14). Not in the v2 system design's
 * `Profile.jsx` — its danger-zone button has no wired-up confirmation
 * there, only a static card — so this reuses `ConfirmationDialog` (the
 * same blurred-backdrop-plus-card treatment as the Navbar's "Cerrar
 * sesión" prompt) instead of a one-off dialog, matching how CU26/CU33/CU34
 * already back their own destructive confirmations with it.
 *
 * Requires the current password (`DeleteAccountDto.currentPassword`, the
 * same shape CU6's change-password already sends) as the explicit second
 * factor confirming this isn't an accidental click.
 *
 * On success, the backend has already soft-removed the account and revoked
 * every session and pending recovery token — the local session is closed
 * the same way CU6 does (`useSession().logout()`, best-effort `DELETE
 * /sessions` plus clearing local state) and the app redirects to Login
 * with an explanatory flag.
 */
export function DeleteAccountDialog({ onCancel }: DeleteAccountDialogProps) {
  const { logout } = useSession();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    if (!currentPassword) {
      setFieldError("Ingresá tu contraseña actual.");
      return;
    }

    setFieldError(null);
    setFormError(null);
    setDeleting(true);
    try {
      await deleteAccount({ currentPassword });
      await logout();
      router.replace(accountDeletedLoginRoute());
    } catch (error) {
      if (error instanceof ApiError && error.code === "INVALID_CURRENT_PASSWORD") {
        setFieldError("La contraseña actual es incorrecta.");
      } else if (error instanceof ApiError) {
        setFormError(
          error.isNetworkError
            ? error.message
            : "No pudimos eliminar tu cuenta. Intentá de nuevo.",
        );
      } else {
        setFormError("No pudimos eliminar tu cuenta. Intentá de nuevo.");
      }
      setDeleting(false);
    }
    // No `finally`: on success, the redirect unmounts this dialog. Only the
    // error path needs to re-enable the confirm button.
  }

  return (
    <ConfirmationDialog
      title="Eliminar cuenta"
      confirmLabel="Eliminar cuenta"
      confirmingLabel="Eliminando…"
      isConfirming={deleting}
      error={formError}
      onCancel={onCancel}
      onConfirm={() => {
        void handleConfirm();
      }}
    >
      <p>
        Esta acción es irreversible: vas a perder tus planes, favoritos y
        colecciones guardadas.
      </p>
      <Field
        label="Contraseña actual"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(event) => {
          setCurrentPassword(event.target.value);
        }}
        error={fieldError}
        disabled={deleting}
        required
      />
    </ConfirmationDialog>
  );
}
