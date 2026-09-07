"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { Button, Icon } from "@/components/ui";

import styles from "./terms-dialog.module.css";

export interface TermsDialogProps {
  onClose: () => void;
}

/**
 * Full text behind the "términos y condiciones" link in the signup
 * checkbox (CU2). There's no dedicated terms page yet — same as the v2
 * prototype — so this popup is the only place the text lives.
 *
 * Only one action (`Entendido`), so the focus trap has nowhere to cycle to
 * but itself, unlike `ConfirmationDialog`'s two-button ring.
 */
export function TermsDialog({ onClose }: TermsDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Portaled to `document.body` — see `ConfirmationDialog`'s comment on why
  // a `position: fixed` overlay can't just render in place.
  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <span className={styles.icon} aria-hidden="true">
          <Icon name="shield" size={24} />
        </span>
        <h2 id={titleId} className="sp-h4">
          Términos y condiciones
        </h2>

        <div className={styles.body}>
          <p>
            SmartPlan es una aplicación que genera planes de recreación
            personalizados según tu presupuesto, ubicación, tiempo disponible,
            tipo de salida y preferencias. Al crear una cuenta, aceptás estos
            términos.
          </p>

          <h3 className="sp-label">Tu cuenta</h3>
          <p>
            Sos responsable de la información que cargás y de mantener tu
            contraseña a salvo. Los datos de perfil y preferencias se usan
            para armar y mejorar las recomendaciones que ves dentro de la
            aplicación.
          </p>

          <h3 className="sp-label">Planes y recomendaciones</h3>
          <p>
            Algunos itinerarios se generan con inteligencia artificial a
            partir de las actividades y lugares cargados en el catálogo.
            Costos, duraciones y disponibilidad son estimaciones: siempre
            confirmá los detalles importantes (precio final, horarios,
            reservas) directamente con el lugar o actividad antes de tu
            salida.
          </p>

          <h3 className="sp-label">Contenido de la comunidad</h3>
          <p>
            Las valoraciones, comentarios y planes que compartís pueden ser
            vistos por otras personas usuarias. No publiques contenido
            ofensivo, falso o que viole derechos de terceros: SmartPlan puede
            moderar o eliminar contenido que incumpla esta regla.
          </p>

          <h3 className="sp-label">Cambios</h3>
          <p>
            SmartPlan es un proyecto en desarrollo activo y estos términos
            pueden actualizarse a medida que se suman funcionalidades. Vas a
            poder revisar la versión vigente desde este mismo lugar.
          </p>
        </div>

        <div className={styles.actions}>
          <Button ref={closeRef} variant="primary" onClick={onClose}>
            Entendido
          </Button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
