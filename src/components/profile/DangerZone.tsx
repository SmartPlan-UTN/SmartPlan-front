"use client";

import { useState } from "react";

import { DeleteAccountDialog } from "./DeleteAccountDialog";
import styles from "./profile.module.css";

/**
 * CU7 - Delete account (PAN 14), matching the v2 system design's
 * `Profile.jsx` danger-zone card exactly (its literal rgba red tints, not
 * `--error`/`--danger`, land on different reds — kept as the mockup's own
 * one-off values, same reasoning as the logout icon's `--danger`). The
 * mockup's button has no wired-up behavior; opening `DeleteAccountDialog`
 * on click is this ticket's own addition.
 */
export function DangerZone() {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={styles.dangerZone}>
      <div>
        <p className={styles.dangerTitle}>Eliminar cuenta</p>
        <p className={styles.dangerText}>
          Esta acción es irreversible y eliminará todos tus datos.
        </p>
      </div>
      <button
        type="button"
        className={styles.dangerButton}
        onClick={() => {
          setConfirming(true);
        }}
      >
        Eliminar cuenta
      </button>

      {confirming ? (
        <DeleteAccountDialog
          onCancel={() => {
            setConfirming(false);
          }}
        />
      ) : null}
    </div>
  );
}
